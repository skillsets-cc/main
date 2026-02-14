import { describe, it, expect, vi, beforeEach } from 'vitest';
import { search } from '../search.js';
import * as api from '../../lib/api.js';

// Mock only the fetch functions, keep mergeStats real
vi.mock('../../lib/api.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api.js')>();
  return {
    ...actual,
    fetchSearchIndex: vi.fn(),
    fetchStats: vi.fn(),
  };
});

describe('search command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    // Default mock for fetchStats
    vi.mocked(api.fetchStats).mockResolvedValue({ stars: {}, downloads: {} });
  });

  it('searches skillsets by name', async () => {
    const mockIndex = {
      version: '1.0',
      generated_at: '2024-01-01',
      skillsets: [
        {
          id: '@user/test-skillset',
          name: 'Test Skillset',
          description: 'A test skillset',
          tags: ['test'],
          author: { handle: '@user' },
          stars: 10,
          version: '1.0.0',
          checksum: 'abc123',
          files: {},
        },
      ],
    };

    vi.mocked(api.fetchSearchIndex).mockResolvedValue(mockIndex);

    await search('test', { limit: '10' });

    expect(api.fetchSearchIndex).toHaveBeenCalledOnce();
    expect(api.fetchStats).toHaveBeenCalledOnce();
  });

  it('filters by tags', async () => {
    const mockIndex = {
      version: '1.0',
      generated_at: '2024-01-01',
      skillsets: [
        {
          id: '@user/test-1',
          name: 'Test 1',
          description: 'Frontend test',
          tags: ['frontend'],
          author: { handle: '@user' },
          stars: 5,
          version: '1.0.0',
          checksum: 'abc',
          files: {},
        },
        {
          id: '@user/test-2',
          name: 'Test 2',
          description: 'Backend test',
          tags: ['backend'],
          author: { handle: '@user' },
          stars: 3,
          version: '1.0.0',
          checksum: 'def',
          files: {},
        },
      ],
    };

    vi.mocked(api.fetchSearchIndex).mockResolvedValue(mockIndex);

    await search('test', { tags: ['frontend'], limit: '10' });

    expect(api.fetchSearchIndex).toHaveBeenCalledOnce();
  });

  it('handles no results', async () => {
    const mockIndex = {
      version: '1.0',
      generated_at: '2024-01-01',
      skillsets: [],
    };

    vi.mocked(api.fetchSearchIndex).mockResolvedValue(mockIndex);

    await search('nonexistent', { limit: '10' });

    expect(api.fetchSearchIndex).toHaveBeenCalledOnce();
  });

  it('shows count of additional results beyond limit', async () => {
    const mockIndex = {
      version: '1.0',
      generated_at: '2024-01-01',
      skillsets: Array.from({ length: 15 }, (_, i) => ({
        id: `@user/test-${i}`,
        name: `test-${i}`,
        description: `A test skillset number ${i}`,
        tags: ['test'],
        author: { handle: '@user' },
        stars: i,
        version: '1.0.0',
        checksum: `abc${i}`,
        files: {},
      })),
    };

    vi.mocked(api.fetchSearchIndex).mockResolvedValue(mockIndex);

    await search('test', { limit: '2' });

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('more'));
  });
});
