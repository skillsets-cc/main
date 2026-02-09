import { describe, it, expect, vi, beforeEach } from 'vitest';
import { view } from '../view.js';
import * as api from '../../lib/api.js';

vi.mock('../../lib/api.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api.js')>();
  return {
    ...actual,
    fetchSkillsetMetadata: vi.fn(),
  };
});

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('view command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('test_throws_when_skillset_not_found', async () => {
    vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(undefined);
    await expect(view('@user/nope')).rejects.toThrow("Skillset '@user/nope' not found");
  });

  it('test_throws_when_readme_fetch_fails', async () => {
    vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue({
      id: '@user/test', name: 'Test', description: '', tags: [],
      author: { handle: '@user' }, stars: 0, version: '1.0.0', checksum: '', files: {},
    });
    mockFetch.mockResolvedValue({ ok: false });
    await expect(view('@user/test')).rejects.toThrow("Could not fetch README for '@user/test'");
  });

  it('test_prints_readme_on_success', async () => {
    vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue({
      id: '@user/test', name: 'Test', description: '', tags: [],
      author: { handle: '@user' }, stars: 0, version: '1.0.0', checksum: '', files: {},
    });
    mockFetch.mockResolvedValue({ ok: true, text: async () => '# Hello' });
    await view('@user/test');
    expect(console.log).toHaveBeenCalledWith('# Hello');
  });

  it('test_prints_header_with_skillset_name', async () => {
    vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue({
      id: '@user/test', name: 'Test', description: '', tags: [],
      author: { handle: '@user' }, stars: 0, version: '1.0.0', checksum: '', files: {},
    });
    mockFetch.mockResolvedValue({ ok: true, text: async () => '# Hello' });
    await view('@user/test');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('@user/test'));
  });

  it('test_encodes_url_path_segments', async () => {
    vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue({
      id: '@user/test-name', name: 'Test', description: '', tags: [],
      author: { handle: '@user' }, stars: 0, version: '1.0.0', checksum: '', files: {},
    });
    mockFetch.mockResolvedValue({ ok: true, text: async () => '' });
    await view('@user/test-name');
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('%40user'));
  });
});
