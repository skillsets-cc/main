import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally before importing the module
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocking
import { fetchSearchIndex, fetchSkillsetMetadata } from '../api.js';

describe('api utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module cache to clear cached index between tests
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
});
