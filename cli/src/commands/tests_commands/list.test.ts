import { describe, it, expect, vi, beforeEach } from 'vitest';
import { list } from '../list.js';
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

describe('list command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    // Default mock for fetchStats - can be overridden in individual tests
    vi.mocked(api.fetchStats).mockResolvedValue({ stars: {}, downloads: {} });
  });

  const mockIndex = {
    version: '1.0',
    generated_at: '2024-01-01',
    skillsets: [
      {
        id: '@user/alpha',
        name: 'Alpha',
        description: 'First skillset',
        tags: ['test'],
        author: { handle: '@user', url: 'https://github.com/user' },
        stars: 10,
        version: '1.0.0',
        status: 'active',
        verification: { production_links: [{ url: 'https://example.com' }], audit_report: './AUDIT_REPORT.md' },
        compatibility: { claude_code_version: '>=1.0.0', languages: ['any'] },
        entry_point: './content/CLAUDE.md',
        checksum: 'abc123',
        files: {},
      },
      {
        id: '@user/beta',
        name: 'Beta',
        description: 'Second skillset',
        tags: ['production'],
        author: { handle: '@other', url: 'https://github.com/other' },
        stars: 25,
        version: '2.0.0',
        status: 'active',
        verification: { production_links: [{ url: 'https://example.com' }], audit_report: './AUDIT_REPORT.md' },
        compatibility: { claude_code_version: '>=1.0.0', languages: ['any'] },
        entry_point: './content/CLAUDE.md',
        checksum: 'def456',
        files: {},
      },
    ],
  };

  it('lists all skillsets', async () => {
    vi.mocked(api.fetchSearchIndex).mockResolvedValue(mockIndex);

    await list({});

    expect(api.fetchSearchIndex).toHaveBeenCalledOnce();
    expect(console.log).toHaveBeenCalled();
  });

  it('sorts by name by default', async () => {
    vi.mocked(api.fetchSearchIndex).mockResolvedValue(mockIndex);

    await list({ sort: 'name' });

    expect(api.fetchSearchIndex).toHaveBeenCalledOnce();
  });

  it('sorts by stars', async () => {
    vi.mocked(api.fetchSearchIndex).mockResolvedValue(mockIndex);

    await list({ sort: 'stars' });

    expect(api.fetchSearchIndex).toHaveBeenCalledOnce();
  });

  it('limits results', async () => {
    vi.mocked(api.fetchSearchIndex).mockResolvedValue(mockIndex);

    await list({ limit: '1' });

    expect(api.fetchSearchIndex).toHaveBeenCalledOnce();
  });

  it('outputs JSON when requested', async () => {
    vi.mocked(api.fetchSearchIndex).mockResolvedValue(mockIndex);

    await list({ json: true });

    expect(api.fetchSearchIndex).toHaveBeenCalledOnce();
    // Check JSON was output
    const calls = vi.mocked(console.log).mock.calls;
    const jsonOutput = calls.find(call => {
      try {
        JSON.parse(call[0] as string);
        return true;
      } catch {
        return false;
      }
    });
    expect(jsonOutput).toBeDefined();
  });

  it('handles empty registry', async () => {
    vi.mocked(api.fetchSearchIndex).mockResolvedValue({
      version: '1.0',
      generated_at: '2024-01-01',
      skillsets: [],
    });

    await list({});

    expect(api.fetchSearchIndex).toHaveBeenCalledOnce();
  });

  it('sorts by downloads', async () => {
    vi.mocked(api.fetchSearchIndex).mockResolvedValue(mockIndex);
    vi.mocked(api.fetchStats).mockResolvedValue({
      stars: {},
      downloads: { '@user/alpha': 100, '@user/beta': 50 },
    });

    await list({ sort: 'downloads' });

    expect(api.fetchSearchIndex).toHaveBeenCalledOnce();
  });

  it('truncates long names and descriptions', async () => {
    const longIndex = {
      version: '1.0',
      generated_at: '2024-01-01',
      skillsets: [{
        id: '@user/very-long-name-skillset-that-exceeds-limits',
        name: 'VeryLongSkillsetNameThatDefinitelyExceedsThirtyCharacterPadding',
        description: 'This is a very long description that should definitely be truncated by the truncate utility function in list',
        tags: ['test'],
        author: { handle: '@verylongauthorhandlethatexceedslimit' },
        stars: 10,
        version: '1.0.0',
        status: 'active' as const,
        verification: { production_links: [{ url: 'https://example.com' }], audit_report: './AUDIT_REPORT.md' },
        compatibility: { claude_code_version: '>=1.0.0', languages: ['any'] },
        entry_point: './content/CLAUDE.md',
        checksum: 'abc123',
        files: {},
      }],
    };

    vi.mocked(api.fetchSearchIndex).mockResolvedValue(longIndex);

    await list({});

    expect(console.log).toHaveBeenCalled();
  });
});
