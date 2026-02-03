import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally before importing the module
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocking
import { fetchSearchIndex, fetchSkillsetMetadata, fetchStats, mergeStats } from '../api.js';

describe('api utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module cache to clear cached index/stats between tests
    vi.resetModules();
  });

  describe('fetchSearchIndex', () => {
    it('fetches index from CDN', async () => {
      const mockIndex = {
        version: '1.0',
        generated_at: '2024-01-01',
        skillsets: [],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockIndex),
      });

      // Re-import to get fresh module without cache
      const { fetchSearchIndex: freshFetch } = await import('../api.js');
      const result = await freshFetch();

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('search-index.json'));
      expect(result).toEqual(mockIndex);
    });

    it('throws on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      const { fetchSearchIndex: freshFetch } = await import('../api.js');

      await expect(freshFetch()).rejects.toThrow('Failed to fetch search index');
    });

    it('uses cached index within TTL', async () => {
      const mockIndex = {
        version: '1.0',
        generated_at: '2024-01-01',
        skillsets: [{ id: 'test' }],
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockIndex),
      });

      const { fetchSearchIndex: freshFetch } = await import('../api.js');

      // First call
      await freshFetch();
      // Second call should use cache
      await freshFetch();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchSkillsetMetadata', () => {
    it('returns skillset by ID', async () => {
      const mockIndex = {
        version: '1.0',
        generated_at: '2024-01-01',
        skillsets: [
          { id: '@user/skillset-a', name: 'A' },
          { id: '@user/skillset-b', name: 'B' },
        ],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockIndex),
      });

      const { fetchSkillsetMetadata: freshFetch } = await import('../api.js');
      const result = await freshFetch('@user/skillset-b');

      expect(result).toEqual({ id: '@user/skillset-b', name: 'B' });
    });

    it('returns undefined for non-existent skillset', async () => {
      const mockIndex = {
        version: '1.0',
        generated_at: '2024-01-01',
        skillsets: [{ id: '@user/skillset-a', name: 'A' }],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockIndex),
      });

      const { fetchSkillsetMetadata: freshFetch } = await import('../api.js');
      const result = await freshFetch('@user/nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('fetchStats', () => {
    it('fetches stats from API', async () => {
      const mockStats = {
        stars: { '@user/test': 10 },
        downloads: { '@user/test': 100 },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStats),
      });

      const { fetchStats: freshFetch } = await import('../api.js');
      const result = await freshFetch();

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/stats/counts'));
      expect(result).toEqual(mockStats);
    });

    it('returns empty stats on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error',
      });

      const { fetchStats: freshFetch } = await import('../api.js');
      const result = await freshFetch();

      expect(result).toEqual({ stars: {}, downloads: {} });
    });

    it('returns empty stats on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { fetchStats: freshFetch } = await import('../api.js');
      const result = await freshFetch();

      expect(result).toEqual({ stars: {}, downloads: {} });
    });
  });

  describe('mergeStats', () => {
    it('merges live stats into skillsets', () => {
      const skillsets = [
        { id: '@user/a', stars: 5, downloads: 0 },
        { id: '@user/b', stars: 10, downloads: 0 },
      ] as any[];

      const stats = {
        stars: { '@user/a': 15 },
        downloads: { '@user/a': 50, '@user/b': 100 },
      };

      const result = mergeStats(skillsets, stats);

      expect(result[0].stars).toBe(15);
      expect(result[0].downloads).toBe(50);
      expect(result[1].stars).toBe(10); // Unchanged, not in stats
      expect(result[1].downloads).toBe(100);
    });

    it('uses original values when stats missing', () => {
      const skillsets = [{ id: '@user/a', stars: 5 }] as any[];
      const stats = { stars: {}, downloads: {} };

      const result = mergeStats(skillsets, stats);

      expect(result[0].stars).toBe(5);
      expect(result[0].downloads).toBe(0);
    });

    it('preserves all other skillset fields', () => {
      const skillsets = [
        {
          id: '@user/a',
          name: 'Test',
          description: 'Desc',
          tags: ['tag1'],
          author: { handle: '@user' },
          stars: 5,
          version: '1.0.0',
        },
      ] as any[];

      const stats = { stars: { '@user/a': 10 }, downloads: {} };

      const result = mergeStats(skillsets, stats);

      expect(result[0].name).toBe('Test');
      expect(result[0].description).toBe('Desc');
      expect(result[0].tags).toEqual(['tag1']);
      expect(result[0].author).toEqual({ handle: '@user' });
      expect(result[0].version).toBe('1.0.0');
    });
  });
});
