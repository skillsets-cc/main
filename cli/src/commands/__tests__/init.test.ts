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

import { init } from '../init.js';
import { input, confirm, checkbox } from '@inquirer/prompts';

describe('init command', () => {
  let testDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // Create temp directory for tests
    testDir = join(tmpdir(), `skillsets-init-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);

    // Default mock responses
    vi.mocked(input)
      .mockResolvedValueOnce('test-skillset') // name
      .mockResolvedValueOnce('A test skillset for testing') // description
      .mockResolvedValueOnce('@testuser') // author handle
      .mockResolvedValueOnce('https://github.com/testuser') // author url
      .mockResolvedValueOnce('https://example.com/project') // production url
      .mockResolvedValueOnce('test,example'); // tags

    vi.mocked(confirm).mockResolvedValue(false);
    vi.mocked(checkbox).mockResolvedValue([]);
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
    expect(content).toContain('@testuser');
  });

  it('creates README.md', async () => {
    await init({});

    expect(existsSync(join(testDir, 'README.md'))).toBe(true);

    const content = readFileSync(join(testDir, 'README.md'), 'utf-8');
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
});
