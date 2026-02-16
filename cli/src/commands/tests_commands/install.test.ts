import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { install } from '../install.js';
import * as filesystem from '../../lib/filesystem.js';
import * as checksum from '../../lib/checksum.js';
import * as api from '../../lib/api.js';
import degit from 'degit';
import { confirm } from '@inquirer/prompts';
import * as fsPromises from 'fs/promises';

vi.mock('degit');
vi.mock('../../lib/filesystem.js');
vi.mock('../../lib/checksum.js');
vi.mock('../../lib/api.js');
vi.mock('@inquirer/prompts');
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof fsPromises>();
  return {
    ...actual,
    mkdtemp: vi.fn().mockResolvedValue('/tmp/skillsets-mock'),
    readdir: vi.fn().mockResolvedValue([]),
    cp: vi.fn().mockResolvedValue(undefined),
    rm: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

/** Set process.stdin.isTTY and return a restore function */
function setTTY(value: boolean): () => void {
  const original = process.stdin.isTTY;
  Object.defineProperty(process.stdin, 'isTTY', { value, writable: true });
  return () => Object.defineProperty(process.stdin, 'isTTY', { value: original, writable: true });
}

const baseMetadata = {
  id: '@user/test-skillset',
  name: 'test-skillset',
  description: 'Test skillset',
  tags: ['test'],
  author: { handle: '@user' },
  stars: 10,
  version: '1.0.0',
  status: 'active' as const,
  verification: {
    production_links: [{ url: 'https://example.com' }],
    audit_report: './AUDIT_REPORT.md',
  },
  compatibility: {
    claude_code_version: '>=1.0.0',
    languages: ['any'],
  },
  entry_point: './content/CLAUDE.md',
  checksum: 'abc123',
  files: {},
};

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
    vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(undefined);
    vi.mocked(confirm).mockResolvedValue(true);
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
    expect(checksum.verifyChecksums).toHaveBeenCalledWith('@user/test-skillset', '/tmp/skillsets-mock');
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

  it('throws on checksum failure', async () => {
    vi.mocked(checksum.verifyChecksums).mockResolvedValue({
      valid: false,
      mismatches: [{ file: 'content/CLAUDE.md', expected: 'abc', actual: 'def' }],
    });

    await expect(install('@user/test-skillset', {})).rejects.toThrow('Checksum verification failed');
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
        cache: false,
        force: true,
        verbose: false,
      })
    );
  });

  describe('MCP server warning', () => {
    const metadataWithMcp = {
      ...baseMetadata,
      mcp_servers: [{
        name: 'context7',
        type: 'stdio' as const,
        command: 'npx',
        args: ['-y', '@upstash/context7-mcp'],
        mcp_reputation: 'npm: @upstash/context7-mcp, 50k weekly downloads',
        researched_at: '2026-02-04',
      }],
    };

    it('proceeds without prompt when no MCP servers', async () => {
      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue({
        ...metadataWithMcp,
        mcp_servers: undefined,
      });
      await install('@user/test-skillset', {});
      expect(confirm).not.toHaveBeenCalled();
      expect(degit).toHaveBeenCalled();
    });

    it('shows warning and prompts when MCP servers present', async () => {
      const restoreTTY = setTTY(true);

      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(metadataWithMcp);
      vi.mocked(confirm).mockResolvedValue(true);
      await install('@user/test-skillset', {});
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('MCP servers'));
      expect(confirm).toHaveBeenCalled();
      expect(degit).toHaveBeenCalled();

      restoreTTY();
    });

    it('exits cleanly when user rejects MCP', async () => {
      const restoreTTY = setTTY(true);

      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(metadataWithMcp);
      vi.mocked(confirm).mockResolvedValue(false);
      await install('@user/test-skillset', {});
      expect(degit).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('cancelled'));

      restoreTTY();
    });

    it('bypasses prompt with --accept-mcp', async () => {
      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(metadataWithMcp);
      await install('@user/test-skillset', { acceptMcp: true });
      expect(confirm).not.toHaveBeenCalled();
      expect(degit).toHaveBeenCalled();
    });

    it('throws in non-TTY without --accept-mcp', async () => {
      const restoreTTY = setTTY(false);

      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(metadataWithMcp);
      await expect(install('@user/test-skillset', {})).rejects.toThrow('Use --accept-mcp');
      expect(degit).not.toHaveBeenCalled();

      restoreTTY();
    });

    it('continues when metadata fetch fails', async () => {
      vi.mocked(api.fetchSkillsetMetadata).mockRejectedValue(new Error('Network error'));
      await install('@user/test-skillset', {});
      expect(degit).toHaveBeenCalled();
    });

    it('--force does NOT bypass MCP prompt', async () => {
      const restoreTTY = setTTY(true);

      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(metadataWithMcp);
      vi.mocked(confirm).mockResolvedValue(false);
      await install('@user/test-skillset', { force: true });
      // --force handles file conflicts, NOT MCP acceptance
      expect(confirm).toHaveBeenCalled();
      expect(degit).not.toHaveBeenCalled();

      restoreTTY();
    });

    it('--backup does NOT bypass MCP prompt', async () => {
      const restoreTTY = setTTY(true);

      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(metadataWithMcp);
      vi.mocked(confirm).mockResolvedValue(false);
      await install('@user/test-skillset', { backup: true });
      // --backup handles file conflicts, NOT MCP acceptance
      expect(confirm).toHaveBeenCalled();
      expect(degit).not.toHaveBeenCalled();

      restoreTTY();
    });

    it('displays Docker servers in warning', async () => {
      const restoreTTY = setTTY(true);

      const metadataWithDocker = {
        ...metadataWithMcp,
        mcp_servers: [{
          name: 'litellm-proxy',
          type: 'docker' as const,
          image: 'ghcr.io/berriai/litellm:main-latest',
          mcp_reputation: 'ghcr: berriai/litellm, widely used LLM proxy',
          researched_at: '2026-02-04',
          servers: [{
            name: 'context7',
            command: 'npx',
            args: ['-y', '@upstash/context7-mcp'],
            mcp_reputation: 'npm: @upstash/context7-mcp',
            researched_at: '2026-02-04',
          }],
        }],
      };

      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(metadataWithDocker);
      vi.mocked(confirm).mockResolvedValue(true);
      await install('@user/test-skillset', {});
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Docker'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ghcr.io/berriai/litellm'));
      expect(degit).toHaveBeenCalled();

      restoreTTY();
    });

    it('displays multiple MCP servers in warning', async () => {
      const restoreTTY = setTTY(true);

      const metadataMultiMcp = {
        ...metadataWithMcp,
        mcp_servers: [
          {
            name: 'context7',
            type: 'stdio' as const,
            command: 'npx',
            args: ['-y', '@upstash/context7-mcp'],
            mcp_reputation: 'npm: @upstash/context7-mcp, 50k weekly downloads',
            researched_at: '2026-02-04',
          },
          {
            name: 'filesystem',
            type: 'stdio' as const,
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem'],
            mcp_reputation: 'npm: @modelcontextprotocol/server-filesystem',
            researched_at: '2026-02-04',
          },
        ],
      };

      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(metadataMultiMcp);
      vi.mocked(confirm).mockResolvedValue(true);
      await install('@user/test-skillset', {});
      // Both servers should appear in warning output
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('context7'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('filesystem'));
      expect(degit).toHaveBeenCalled();

      restoreTTY();
    });

    it('formats http MCP server type with URL', async () => {
      const restoreTTY = setTTY(true);

      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue({
        ...metadataWithMcp,
        mcp_servers: [{
          name: 'remote-mcp',
          type: 'http' as const,
          url: 'https://mcp.example.com',
          mcp_reputation: 'custom: remote MCP server',
          researched_at: '2026-02-04',
        }],
      });
      vi.mocked(confirm).mockResolvedValue(true);
      await install('@user/test-skillset', {});
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('https://mcp.example.com'));

      restoreTTY();
    });
  });

  it('copies verified content from temp dir to cwd', async () => {
    const fsPromises = await import('fs/promises');
    vi.mocked(fsPromises.readdir).mockResolvedValueOnce([
      { name: 'CLAUDE.md', isDirectory: () => false },
      { name: '.claude', isDirectory: () => true },
    ] as any);

    await install('@user/test-skillset', {});

    expect(fsPromises.cp).toHaveBeenCalledTimes(2);
  });

  it('cleans up temp dir on clone failure', async () => {
    const mockClone = vi.fn().mockRejectedValue(new Error('clone failed'));
    vi.mocked(degit).mockReturnValue({ clone: mockClone } as any);
    const fsPromises = await import('fs/promises');

    await expect(install('@user/test-skillset', {})).rejects.toThrow('clone failed');

    expect(fsPromises.rm).toHaveBeenCalledWith(
      '/tmp/skillsets-mock',
      expect.objectContaining({ recursive: true })
    );
  });

  it('rejects invalid skillset ID format', async () => {
    await install('invalid-format', {});

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Expected format'));
  });

  describe('Runtime deps warning', () => {
    const metadataWithDeps = {
      ...baseMetadata,
      runtime_dependencies: [{
        path: 'package.json',
        manager: 'npm',
        packages: ['lodash', 'express'],
        has_install_scripts: false,
        evaluation: 'Well-known packages',
        researched_at: '2026-02-04',
      }],
    };

    it('prompts when deps present', async () => {
      const restoreTTY = setTTY(true);

      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(metadataWithDeps);
      vi.mocked(confirm).mockResolvedValue(true);
      await install('@user/test-skillset', {});
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('runtime dependencies'));
      expect(confirm).toHaveBeenCalled();
      expect(degit).toHaveBeenCalled();

      restoreTTY();
    });

    it('exits on rejection', async () => {
      const restoreTTY = setTTY(true);

      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(metadataWithDeps);
      vi.mocked(confirm).mockResolvedValue(false);
      await install('@user/test-skillset', {});
      expect(degit).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('cancelled'));

      restoreTTY();
    });

    it('bypasses with --accept-deps', async () => {
      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(metadataWithDeps);
      await install('@user/test-skillset', { acceptDeps: true });
      expect(confirm).not.toHaveBeenCalled();
      expect(degit).toHaveBeenCalled();
    });

    it('throws in non-TTY without flag', async () => {
      const restoreTTY = setTTY(false);

      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(metadataWithDeps);
      await expect(install('@user/test-skillset', {})).rejects.toThrow('--accept-deps');
      expect(degit).not.toHaveBeenCalled();

      restoreTTY();
    });

    it('shows install script warning', async () => {
      const restoreTTY = setTTY(true);

      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue({
        ...metadataWithDeps,
        runtime_dependencies: [{
          ...metadataWithDeps.runtime_dependencies![0],
          has_install_scripts: true,
        }],
      });
      vi.mocked(confirm).mockResolvedValue(true);
      await install('@user/test-skillset', {});
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('install lifecycle scripts'));

      restoreTTY();
    });

    it('prompts for both MCP + deps sequentially', async () => {
      const restoreTTY = setTTY(true);

      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue({
        ...metadataWithDeps,
        mcp_servers: [{
          name: 'context7',
          type: 'stdio' as const,
          command: 'npx',
          args: ['-y', '@upstash/context7-mcp'],
          mcp_reputation: 'npm: @upstash/context7-mcp',
          researched_at: '2026-02-04',
        }],
      });
      vi.mocked(confirm).mockResolvedValue(true);
      await install('@user/test-skillset', {});
      // Two confirm calls: one for MCP, one for deps
      expect(confirm).toHaveBeenCalledTimes(2);
      expect(degit).toHaveBeenCalled();

      restoreTTY();
    });
  });
});
