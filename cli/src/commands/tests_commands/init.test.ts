import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock inquirer prompts before importing init
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  confirm: vi.fn(),
  checkbox: vi.fn(),
}));

// Mock degit to avoid network calls
vi.mock('degit', () => ({
  default: vi.fn(),
}));

// Mock child_process for gh CLI calls
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

import { init } from '../init.js';
import { input, confirm, checkbox } from '@inquirer/prompts';
import degit from 'degit';
import { execSync } from 'child_process';

describe('init command', () => {
  let testDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create temp directory for tests
    testDir = join(tmpdir(), `skillsets-init-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);

    // Mock gh CLI calls (default: authenticated user)
    vi.mocked(execSync).mockImplementation((command: string) => {
      if (command === 'gh auth status') {
        return Buffer.from('');
      }
      if (command === 'gh api user') {
        return Buffer.from(JSON.stringify({ login: 'testuser', id: 12345 }));
      }
      return Buffer.from('');
    });

    // Mock global fetch (default: reservation found)
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ batchId: '5.11.001' }),
    } as Response);

    // Default mock responses
    vi.mocked(input)
      .mockResolvedValueOnce('test-skillset') // name
      .mockResolvedValueOnce('A test skillset for testing') // description
      .mockResolvedValueOnce('@testuser') // author handle (now has default from gh)
      .mockResolvedValueOnce('https://github.com/testuser') // author url
      .mockResolvedValueOnce('https://example.com/project') // production url
      .mockResolvedValueOnce('test,example'); // tags

    vi.mocked(confirm).mockResolvedValue(false);
    vi.mocked(checkbox).mockResolvedValue([]);

    // Mock degit clone
    const mockClone = vi.fn().mockResolvedValue(undefined);
    vi.mocked(degit).mockReturnValue({ clone: mockClone } as any);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(testDir, { recursive: true, force: true });
  });

  it('creates skillset.yaml', async () => {
    await init({});

    expect(existsSync(join(testDir, 'skillset.yaml'))).toBe(true);

    const content = readFileSync(join(testDir, 'skillset.yaml'), 'utf-8');
    expect(content).toContain('name: "test-skillset"');
    expect(content).toContain('schema_version: "1.0"');
    expect(content).toContain('batch_id: "5.11.001"');
    expect(content).toContain('@testuser');
  });

  it('creates content/README.md', async () => {
    await init({});

    expect(existsSync(join(testDir, 'content', 'README.md'))).toBe(true);

    const content = readFileSync(join(testDir, 'content', 'README.md'), 'utf-8');
    expect(content).toContain('test-skillset');
    expect(content).toContain('npx skillsets install');
  });

  it('creates PROOF.md', async () => {
    await init({});

    expect(existsSync(join(testDir, 'PROOF.md'))).toBe(true);

    const content = readFileSync(join(testDir, 'PROOF.md'), 'utf-8');
    expect(content).toContain('Production Proof');
    expect(content).toContain('https://example.com/project');
  });

  it('creates content directory', async () => {
    await init({});

    expect(existsSync(join(testDir, 'content'))).toBe(true);
  });

  it('detects and offers to copy existing .claude', async () => {
    // Create existing .claude directory
    mkdirSync(join(testDir, '.claude', 'skills'), { recursive: true });
    writeFileSync(join(testDir, '.claude', 'skills', 'test.md'), '# Test skill');

    vi.mocked(checkbox).mockResolvedValue(['.claude/']);

    await init({});

    // Check that .claude was copied to content/
    expect(existsSync(join(testDir, 'content', '.claude', 'skills', 'test.md'))).toBe(true);
  });

  it('detects and offers to copy existing CLAUDE.md', async () => {
    // Create existing CLAUDE.md
    writeFileSync(join(testDir, 'CLAUDE.md'), '# Project Instructions');

    vi.mocked(checkbox).mockResolvedValue(['CLAUDE.md']);

    await init({});

    // Check that CLAUDE.md was copied to content/
    expect(existsSync(join(testDir, 'content', 'CLAUDE.md'))).toBe(true);
  });

  it('detects and offers to copy existing README.md', async () => {
    // Create existing README.md at project root
    writeFileSync(join(testDir, 'README.md'), '# My Project README');

    vi.mocked(checkbox).mockResolvedValue(['README.md']);

    await init({});

    // Check that README.md was copied to content/
    expect(existsSync(join(testDir, 'content', 'README.md'))).toBe(true);
    const content = readFileSync(join(testDir, 'content', 'README.md'), 'utf-8');
    expect(content).toBe('# My Project README');
  });

  it('detects and offers to copy existing .mcp.json', async () => {
    writeFileSync(join(testDir, '.mcp.json'), '{"mcpServers":{}}');

    vi.mocked(checkbox).mockResolvedValue(['.mcp.json']);

    await init({});

    expect(existsSync(join(testDir, 'content', '.mcp.json'))).toBe(true);
    const content = readFileSync(join(testDir, 'content', '.mcp.json'), 'utf-8');
    expect(content).toBe('{"mcpServers":{}}');
  });

  it('detects support stack directories with marker files', async () => {
    // Create a directory with a Dockerfile (config marker)
    mkdirSync(join(testDir, 'docker'), { recursive: true });
    writeFileSync(join(testDir, 'docker', 'Dockerfile'), 'FROM node:20');
    writeFileSync(join(testDir, 'docker', 'config.yaml'), 'model: gpt-4');

    vi.mocked(checkbox).mockResolvedValue(['docker/']);

    await init({});

    expect(existsSync(join(testDir, 'content', 'docker', 'Dockerfile'))).toBe(true);
    expect(existsSync(join(testDir, 'content', 'docker', 'config.yaml'))).toBe(true);
  });

  it('detects support stack with dependency manifest', async () => {
    mkdirSync(join(testDir, 'ext-agents'), { recursive: true });
    writeFileSync(join(testDir, 'ext-agents', 'package.json'), '{"dependencies":{}}');
    writeFileSync(join(testDir, 'ext-agents', 'runner.mjs'), 'export default {}');

    vi.mocked(checkbox).mockResolvedValue(['ext-agents/']);

    await init({});

    expect(existsSync(join(testDir, 'content', 'ext-agents', 'package.json'))).toBe(true);
    expect(existsSync(join(testDir, 'content', 'ext-agents', 'runner.mjs'))).toBe(true);
  });

  it('excludes node_modules and .env when copying support stacks', async () => {
    mkdirSync(join(testDir, 'ext-agents', 'node_modules', 'dep'), { recursive: true });
    writeFileSync(join(testDir, 'ext-agents', 'package.json'), '{"dependencies":{}}');
    writeFileSync(join(testDir, 'ext-agents', 'runner.mjs'), 'export default {}');
    writeFileSync(join(testDir, 'ext-agents', '.env'), 'SECRET=key');
    writeFileSync(join(testDir, 'ext-agents', 'node_modules', 'dep', 'index.js'), '');

    vi.mocked(checkbox).mockResolvedValue(['ext-agents/']);

    await init({});

    expect(existsSync(join(testDir, 'content', 'ext-agents', 'package.json'))).toBe(true);
    expect(existsSync(join(testDir, 'content', 'ext-agents', 'runner.mjs'))).toBe(true);
    expect(existsSync(join(testDir, 'content', 'ext-agents', 'node_modules'))).toBe(false);
    expect(existsSync(join(testDir, 'content', 'ext-agents', '.env'))).toBe(false);
  });

  it('detects support stack with nested marker files', async () => {
    // Marker is two levels deep: ext/docker/litellm/docker-compose.yaml
    mkdirSync(join(testDir, 'ext', 'docker', 'litellm'), { recursive: true });
    writeFileSync(join(testDir, 'ext', 'docker', 'litellm', 'docker-compose.yaml'), 'services: {}');
    writeFileSync(join(testDir, 'ext', 'docker', 'litellm', 'config.yaml'), 'model: gpt-4');

    vi.mocked(checkbox).mockResolvedValue(['ext/']);

    await init({});

    expect(existsSync(join(testDir, 'content', 'ext', 'docker', 'litellm', 'docker-compose.yaml'))).toBe(true);
    expect(existsSync(join(testDir, 'content', 'ext', 'docker', 'litellm', 'config.yaml'))).toBe(true);
  });

  it('does not detect directories without marker files as support stacks', async () => {
    mkdirSync(join(testDir, 'random-dir'), { recursive: true });
    writeFileSync(join(testDir, 'random-dir', 'notes.txt'), 'just notes');

    await init({});

    // checkbox should not have been called with random-dir/
    const checkboxCalls = vi.mocked(checkbox).mock.calls;
    if (checkboxCalls.length > 0) {
      const choices = (checkboxCalls[0][0] as any).choices.map((c: any) => c.value);
      expect(choices).not.toContain('random-dir/');
    }
  });

  it('asks for confirmation if skillset.yaml exists', async () => {
    // Create existing skillset.yaml
    writeFileSync(join(testDir, 'skillset.yaml'), 'existing: true');

    vi.mocked(confirm).mockResolvedValue(false);

    await init({});

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Overwrite') })
    );
  });

  it('validates name format', async () => {
    vi.mocked(input).mockReset();
    vi.mocked(input)
      .mockResolvedValueOnce('valid-name')
      .mockResolvedValueOnce('A valid description here')
      .mockResolvedValueOnce('@user')
      .mockResolvedValueOnce('https://github.com/user')
      .mockResolvedValueOnce('https://example.com')
      .mockResolvedValueOnce('test');

    await init({});

    // Verify input was called for name
    expect(input).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('name'),
        validate: expect.any(Function),
      })
    );
  });

  it('validates author handle format', async () => {
    vi.mocked(input).mockReset();
    vi.mocked(input)
      .mockResolvedValueOnce('test')
      .mockResolvedValueOnce('Valid description here')
      .mockResolvedValueOnce('@validuser')
      .mockResolvedValueOnce('https://github.com/validuser')
      .mockResolvedValueOnce('https://example.com')
      .mockResolvedValueOnce('test');

    await init({});

    // Verify input was called for author handle
    const calls = vi.mocked(input).mock.calls;
    const handleCall = calls.find(call =>
      (call[0] as any).message?.includes('handle')
    );
    expect(handleCall).toBeDefined();
  });

  it('fetches audit-skill via degit from correct registry path', async () => {
    await init({});

    expect(degit).toHaveBeenCalledWith(
      'skillsets-cc/main/tools/audit-skill',
      expect.objectContaining({
        cache: false,
        force: true,
        verbose: false,
      })
    );
  });

  it('clones audit-skill into .claude/skills/audit-skill', async () => {
    const mockClone = vi.fn().mockResolvedValue(undefined);
    vi.mocked(degit).mockReturnValue({ clone: mockClone } as any);

    await init({});

    expect(mockClone).toHaveBeenCalledWith(
      join(testDir, '.claude', 'skills', 'audit-skill')
    );
  });

  it('does not overwrite existing content/README.md', async () => {
    mkdirSync(join(testDir, 'content'), { recursive: true });
    writeFileSync(join(testDir, 'content', 'README.md'), '# My Custom README');

    await init({});

    const content = readFileSync(join(testDir, 'content', 'README.md'), 'utf-8');
    expect(content).toBe('# My Custom README');
  });

  it('generates tags in skillset.yaml', async () => {
    await init({});

    const content = readFileSync(join(testDir, 'skillset.yaml'), 'utf-8');
    expect(content).toContain('"test"');
    expect(content).toContain('"example"');
  });

  it('throws if gh CLI not authenticated', async () => {
    vi.mocked(execSync).mockImplementation((command: string) => {
      if (command === 'gh auth status') {
        throw new Error('not authenticated');
      }
      return Buffer.from('');
    });

    await expect(init({})).rejects.toThrow('gh CLI not authenticated');
  });

  it('throws if no active reservation found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ batchId: null }),
    } as Response);

    await expect(init({})).rejects.toThrow('No active reservation found');
  });

  it('includes batch_id in generated skillset.yaml', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ batchId: '3.20.002' }),
    } as Response);

    await init({});

    const content = readFileSync(join(testDir, 'skillset.yaml'), 'utf-8');
    expect(content).toContain('batch_id: "3.20.002"');
  });

  it('auto-fills author handle from gh login', async () => {
    vi.mocked(execSync).mockImplementation((command: string) => {
      if (command === 'gh auth status') {
        return Buffer.from('');
      }
      if (command === 'gh api user') {
        return Buffer.from(JSON.stringify({ login: 'octocat', id: 99999 }));
      }
      return Buffer.from('');
    });

    await init({});

    // Verify the author handle prompt had the correct default
    const calls = vi.mocked(input).mock.calls;
    const handleCall = calls.find(call =>
      (call[0] as any).message?.includes('GitHub handle')
    );
    expect(handleCall).toBeDefined();
    expect((handleCall?.[0] as any).default).toBe('@octocat');
  });

  it('calls reservation lookup with GitHub user ID', async () => {
    vi.mocked(execSync).mockImplementation((command: string) => {
      if (command === 'gh auth status') {
        return Buffer.from('');
      }
      if (command === 'gh api user') {
        return Buffer.from(JSON.stringify({ login: 'testuser', id: 54321 }));
      }
      return Buffer.from('');
    });

    await init({});

    expect(global.fetch).toHaveBeenCalledWith(
      'https://skillsets.cc/api/reservations/lookup?githubId=54321'
    );
  });

  it('throws if gh user info fails', async () => {
    vi.mocked(execSync).mockImplementation((command: string) => {
      if (command === 'gh auth status') return Buffer.from('');
      if (command === 'gh api user') throw new Error('API error');
      return Buffer.from('');
    });

    await expect(init({})).rejects.toThrow('Failed to get GitHub user info');
  });

  it('throws if reservation lookup fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(init({})).rejects.toThrow('Failed to look up reservation');
  });

  it('throws when structure creation fails', async () => {
    const mockClone = vi.fn().mockRejectedValue(new Error('degit clone failed'));
    vi.mocked(degit).mockReturnValue({ clone: mockClone } as any);

    await expect(init({})).rejects.toThrow('degit clone failed');
  });

  it('validates input callbacks correctly', async () => {
    await init({});

    const calls = vi.mocked(input).mock.calls;

    // Name validator (1st call)
    const nameValidate = (calls[0][0] as any).validate as (v: string) => true | string;
    expect(nameValidate('valid-name')).toBe(true);
    expect(nameValidate('invalid name!')).toContain('alphanumeric');
    expect(nameValidate('')).toContain('alphanumeric');

    // Description validator (2nd call)
    const descValidate = (calls[1][0] as any).validate as (v: string) => true | string;
    expect(descValidate('A valid description here')).toBe(true);
    expect(descValidate('short')).toContain('10-200');

    // Author handle validator (3rd call)
    const handleValidate = (calls[2][0] as any).validate as (v: string) => true | string;
    expect(handleValidate('@validuser')).toBe(true);
    expect(handleValidate('noatsign')).toContain('@');

    // Author URL validator (4th call)
    const urlValidate = (calls[3][0] as any).validate as (v: string) => true | string;
    expect(urlValidate('https://example.com')).toBe(true);
    expect(urlValidate('not-a-url')).toContain('URL');

    // Production URL validator (5th call)
    const prodUrlValidate = (calls[4][0] as any).validate as (v: string) => true | string;
    expect(prodUrlValidate('https://example.com')).toBe(true);
    expect(prodUrlValidate('invalid')).toContain('URL');

    // Tags validator (6th call)
    const tagsValidate = (calls[5][0] as any).validate as (v: string) => true | string;
    expect(tagsValidate('tag1,tag2')).toBe(true);
    expect(tagsValidate('INVALID')).toContain('lowercase');
  });

  it('does not overwrite existing content/QUICKSTART.md', async () => {
    mkdirSync(join(testDir, 'content'), { recursive: true });
    writeFileSync(join(testDir, 'content', 'QUICKSTART.md'), '# My Custom Quickstart');

    await init({});

    const content = readFileSync(join(testDir, 'content', 'QUICKSTART.md'), 'utf-8');
    expect(content).toBe('# My Custom Quickstart');
  });
});
