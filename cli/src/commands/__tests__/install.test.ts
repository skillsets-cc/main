import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { install } from '../install.js';
import * as filesystem from '../../lib/filesystem.js';
import * as checksum from '../../lib/checksum.js';
import * as api from '../../lib/api.js';
import degit from 'degit';
import { confirm } from '@inquirer/prompts';

vi.mock('degit');
vi.mock('../../lib/filesystem.js');
vi.mock('../../lib/checksum.js');
vi.mock('../../lib/api.js');
vi.mock('@inquirer/prompts');

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
        cache: false,
        force: true,
        verbose: false,
      })
    );
  });

  describe('MCP server warning', () => {
    const metadataWithMcp = {
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
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });

      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(metadataWithMcp);
      vi.mocked(confirm).mockResolvedValue(true);
      await install('@user/test-skillset', {});
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('MCP servers'));
      expect(confirm).toHaveBeenCalled();
      expect(degit).toHaveBeenCalled();

      Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, writable: true });
    });

    it('exits cleanly when user rejects MCP', async () => {
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });

      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(metadataWithMcp);
      vi.mocked(confirm).mockResolvedValue(false);
      await install('@user/test-skillset', {});
      expect(degit).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('cancelled'));

      Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, writable: true });
    });

    it('bypasses prompt with --accept-mcp', async () => {
      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(metadataWithMcp);
      await install('@user/test-skillset', { acceptMcp: true });
      expect(confirm).not.toHaveBeenCalled();
      expect(degit).toHaveBeenCalled();
    });

    it('exits with error in non-TTY without --accept-mcp', async () => {
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true });

      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(metadataWithMcp);
      await install('@user/test-skillset', {});
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(degit).not.toHaveBeenCalled();

      Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, writable: true });
    });

    it('continues when metadata fetch fails', async () => {
      vi.mocked(api.fetchSkillsetMetadata).mockRejectedValue(new Error('Network error'));
      await install('@user/test-skillset', {});
      expect(degit).toHaveBeenCalled();
    });

    it('--force does NOT bypass MCP prompt', async () => {
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });

      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(metadataWithMcp);
      vi.mocked(confirm).mockResolvedValue(false);
      await install('@user/test-skillset', { force: true });
      // --force handles file conflicts, NOT MCP acceptance
      expect(confirm).toHaveBeenCalled();
      expect(degit).not.toHaveBeenCalled();

      Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, writable: true });
    });

    it('--backup does NOT bypass MCP prompt', async () => {
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });

      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(metadataWithMcp);
      vi.mocked(confirm).mockResolvedValue(false);
      await install('@user/test-skillset', { backup: true });
      // --backup handles file conflicts, NOT MCP acceptance
      expect(confirm).toHaveBeenCalled();
      expect(degit).not.toHaveBeenCalled();

      Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, writable: true });
    });

    it('displays Docker servers in warning', async () => {
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });

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

      Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, writable: true });
    });

    it('displays multiple MCP servers in warning', async () => {
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });

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

      Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, writable: true });
    });
  });
});
