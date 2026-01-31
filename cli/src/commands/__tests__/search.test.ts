import { describe, it, expect, vi, beforeEach } from 'vitest';
import { search } from '../search.js';
import * as api from '../../lib/api.js';

vi.mock('../../lib/api.js');

describe('search command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
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
          author: '@user',
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
          author: '@user',
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
          author: '@user',
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
});
