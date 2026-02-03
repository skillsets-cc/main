import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { install } from '../install.js';
import * as filesystem from '../../lib/filesystem.js';
import * as checksum from '../../lib/checksum.js';
import degit from 'degit';

vi.mock('degit');
vi.mock('../../lib/filesystem.js');
vi.mock('../../lib/checksum.js');

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('install command', () => {
  const originalCwd = process.cwd;
  const originalExit = process.exit;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    process.cwd = vi.fn().mockReturnValue('/test/dir');
    process.exit = vi.fn() as never;

    // Default mocks
    vi.mocked(filesystem.detectConflicts).mockResolvedValue([]);
    vi.mocked(checksum.verifyChecksums).mockResolvedValue({ valid: true, mismatches: [] });
    mockFetch.mockResolvedValue({ ok: true });

    // Mock degit
    const mockClone = vi.fn().mockResolvedValue(undefined);
    vi.mocked(degit).mockReturnValue({ clone: mockClone } as any);
  });

  afterEach(() => {
    process.cwd = originalCwd;
    process.exit = originalExit;
  });

  it('installs skillset successfully', async () => {
    await install('@user/test-skillset', {});

    expect(degit).toHaveBeenCalledWith(
      'skillsets-cc/main/skillsets/@user/test-skillset/content',
      expect.any(Object)
    );
    expect(checksum.verifyChecksums).toHaveBeenCalledWith('@user/test-skillset', '/test/dir');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Installation complete'));
  });

  it('tracks download after successful install', async () => {
    await install('@user/test-skillset', {});

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/downloads'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ skillset: '@user/test-skillset' }),
      })
    );
  });

  it('aborts when conflicts detected without flags', async () => {
    vi.mocked(filesystem.detectConflicts).mockResolvedValue(['.claude/', 'CLAUDE.md']);

    await install('@user/test-skillset', {});

    expect(degit).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Existing files detected'));
  });

  it('proceeds with --force flag despite conflicts', async () => {
    vi.mocked(filesystem.detectConflicts).mockResolvedValue(['.claude/']);

    await install('@user/test-skillset', { force: true });

    expect(degit).toHaveBeenCalled();
    expect(filesystem.backupFiles).not.toHaveBeenCalled();
  });

  it('backs up files with --backup flag', async () => {
    vi.mocked(filesystem.detectConflicts).mockResolvedValue(['.claude/', 'CLAUDE.md']);

    await install('@user/test-skillset', { backup: true });

    expect(filesystem.backupFiles).toHaveBeenCalledWith(['.claude/', 'CLAUDE.md'], '/test/dir');
    expect(degit).toHaveBeenCalled();
  });

  it('skips backup when no conflicts', async () => {
    vi.mocked(filesystem.detectConflicts).mockResolvedValue([]);

    await install('@user/test-skillset', { backup: true });

    expect(filesystem.backupFiles).not.toHaveBeenCalled();
    expect(degit).toHaveBeenCalled();
  });

  it('exits with error on checksum failure', async () => {
    vi.mocked(checksum.verifyChecksums).mockResolvedValue({
      valid: false,
      mismatches: [{ file: 'content/CLAUDE.md', expected: 'abc', actual: 'def' }],
    });

    await install('@user/test-skillset', {});

    expect(process.exit).toHaveBeenCalledWith(1);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('checksum mismatch'));
  });

  it('silently handles download tracking failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    // Should not throw
    await install('@user/test-skillset', {});

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Installation complete'));
  });

  it('uses degit with correct options', async () => {
    await install('@user/test-skillset', {});

    expect(degit).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        cache: true,
        force: true,
        verbose: false,
      })
    );
  });
});
