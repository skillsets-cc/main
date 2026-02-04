import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock api module
vi.mock('../../lib/api.js', () => ({
  fetchSkillsetMetadata: vi.fn(),
}));

import { audit } from '../audit.js';
import { fetchSkillsetMetadata } from '../../lib/api.js';

describe('audit command', () => {
  let testDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // Create temp directory for tests
    testDir = join(tmpdir(), `skillsets-audit-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(testDir, { recursive: true, force: true });
  });

  const validSkillsetYaml = `schema_version: "1.0"
name: "test-skillset"
version: "1.0.0"
description: "A valid test skillset for testing purposes"
author:
  handle: "@testuser"
  url: "https://github.com/testuser"
verification:
  production_links:
    - url: "https://example.com"
  audit_report: "./AUDIT_REPORT.md"
tags:
  - "test"
  - "example"
status: "active"
entry_point: "./content/CLAUDE.md"
`;

  it('passes with valid structure', async () => {
    // Create valid structure
    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    writeFileSync(join(testDir, 'README.md'), '# Test\n\nDescription');
    mkdirSync(join(testDir, 'content'));
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

    await audit();

    // Check audit report was generated
    expect(existsSync(join(testDir, 'AUDIT_REPORT.md'))).toBe(true);

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('READY FOR SUBMISSION');
  });

  it('fails without skillset.yaml', async () => {
    writeFileSync(join(testDir, 'README.md'), '# Test');
    mkdirSync(join(testDir, 'content'));
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('NOT READY');
    expect(report).toContain('skillset.yaml');
  });

  it('fails without README.md', async () => {
    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    mkdirSync(join(testDir, 'content'));
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('NOT READY');
    expect(report).toContain('README.md');
  });

  it('fails without content directory', async () => {
    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    writeFileSync(join(testDir, 'README.md'), '# Test');

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('NOT READY');
    expect(report).toContain('content');
  });

  it('fails without .claude or CLAUDE.md in content', async () => {
    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    writeFileSync(join(testDir, 'README.md'), '# Test');
    mkdirSync(join(testDir, 'content'));
    writeFileSync(join(testDir, 'content', 'other.txt'), 'something');

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('NOT READY');
  });

  it('passes with .claude directory instead of CLAUDE.md', async () => {
    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    writeFileSync(join(testDir, 'README.md'), '# Test');
    mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
    writeFileSync(join(testDir, 'content', '.claude', 'settings.json'), '{}');

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('READY FOR SUBMISSION');
  });

  it('validates manifest schema', async () => {
    const invalidYaml = `schema_version: "2.0"
name: "invalid name with spaces"
version: "not-semver"
`;
    writeFileSync(join(testDir, 'skillset.yaml'), invalidYaml);
    writeFileSync(join(testDir, 'README.md'), '# Test');
    mkdirSync(join(testDir, 'content'));
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('NOT READY');
    expect(report).toContain('schema_version');
  });

  it('detects potential secrets', async () => {
    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    writeFileSync(join(testDir, 'README.md'), '# Test\n\napi_key = "sk-1234567890abcdefghijklmnopqrstuvwxyz123456789012"');
    mkdirSync(join(testDir, 'content'));
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('NOT READY');
    expect(report).toContain('secret');
  });

  it('warns about large files', async () => {
    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    writeFileSync(join(testDir, 'README.md'), '# Test');
    mkdirSync(join(testDir, 'content'));
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');
    // Create a large file (>1MB)
    writeFileSync(join(testDir, 'content', 'large.txt'), 'x'.repeat(1024 * 1024 + 1));

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('WARNING');
    expect(report).toContain('large');
  });

  it('shows new submission when skillset not in registry', async () => {
    vi.mocked(fetchSkillsetMetadata).mockResolvedValue(undefined);

    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    writeFileSync(join(testDir, 'README.md'), '# Test');
    mkdirSync(join(testDir, 'content'));
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('READY FOR SUBMISSION');
    expect(report).toContain('New submission');
  });

  it('fails version check when update has same version', async () => {
    vi.mocked(fetchSkillsetMetadata).mockResolvedValue({
      id: '@testuser/test-skillset',
      name: 'test-skillset',
      description: 'Existing',
      tags: ['test'],
      author: { handle: '@testuser' },
      stars: 5,
      version: '1.0.0', // Same as local
      status: 'active',
      verification: { production_links: [{ url: 'https://example.com' }], audit_report: './AUDIT_REPORT.md' },
      compatibility: { claude_code_version: '>=1.0.0', languages: ['any'] },
      entry_point: './content/CLAUDE.md',
      checksum: 'abc123',
      files: {},
    });

    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    writeFileSync(join(testDir, 'README.md'), '# Test');
    mkdirSync(join(testDir, 'content'));
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('NOT READY');
    expect(report).toContain('Version must be');
  });

  it('passes version check when update has higher version', async () => {
    vi.mocked(fetchSkillsetMetadata).mockResolvedValue({
      id: '@testuser/test-skillset',
      name: 'test-skillset',
      description: 'Existing',
      tags: ['test'],
      author: { handle: '@testuser' },
      stars: 5,
      version: '0.9.0', // Lower than local 1.0.0
      status: 'active',
      verification: { production_links: [{ url: 'https://example.com' }], audit_report: './AUDIT_REPORT.md' },
      compatibility: { claude_code_version: '>=1.0.0', languages: ['any'] },
      entry_point: './content/CLAUDE.md',
      checksum: 'abc123',
      files: {},
    });

    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    writeFileSync(join(testDir, 'README.md'), '# Test');
    mkdirSync(join(testDir, 'content'));
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('READY FOR SUBMISSION');
    expect(report).toContain('Update');
    expect(report).toContain('0.9.0');
    expect(report).toContain('1.0.0');
  });

  describe('README link validation', () => {
    it('passes when README has no links to content/.claude/', async () => {
      writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
      writeFileSync(join(testDir, 'README.md'), '# Test\n\n[External](https://example.com)\n[Other](./other.md)');
      mkdirSync(join(testDir, 'content'));
      writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

      await audit();

      const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
      expect(report).toContain('READY FOR SUBMISSION');
      expect(report).toContain('README Links | ✓ PASS');
    });

    it('fails when README has relative links to content/.claude/', async () => {
      writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
      writeFileSync(
        join(testDir, 'README.md'),
        '# Test\n\n[Skill](content/.claude/skills/my-skill/SKILL.md)\n[Agent](./content/.claude/agents/my-agent.md)'
      );
      mkdirSync(join(testDir, 'content'));
      writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

      await audit();

      const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
      expect(report).toContain('NOT READY');
      expect(report).toContain('README Links | ✗ FAIL');
      expect(report).toContain('2 relative link(s)');
      expect(report).toContain('content/.claude/skills/my-skill/SKILL.md');
      expect(report).toContain('./content/.claude/agents/my-agent.md');
    });

    it('passes when README uses full GitHub URLs for content/.claude/', async () => {
      writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
      writeFileSync(
        join(testDir, 'README.md'),
        '# Test\n\n[Skill](https://github.com/skillsets-cc/main/blob/main/skillsets/%40testuser/test-skillset/content/.claude/skills/my-skill/SKILL.md)'
      );
      mkdirSync(join(testDir, 'content'));
      writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

      await audit();

      const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
      expect(report).toContain('READY FOR SUBMISSION');
      expect(report).toContain('README Links | ✓ PASS');
    });

    it('detects multiple relative links on same line', async () => {
      writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
      writeFileSync(
        join(testDir, 'README.md'),
        '# Test\n\n| [One](content/.claude/a.md) | [Two](content/.claude/b.md) |'
      );
      mkdirSync(join(testDir, 'content'));
      writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

      await audit();

      const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
      expect(report).toContain('NOT READY');
      expect(report).toContain('2 relative link(s)');
    });

    it('shows correct line numbers for relative links', async () => {
      writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
      writeFileSync(
        join(testDir, 'README.md'),
        '# Test\n\nFirst paragraph.\n\n[Link](content/.claude/test.md)\n\nMore text.'
      );
      mkdirSync(join(testDir, 'content'));
      writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

      await audit();

      const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
      expect(report).toContain('Line 5:');
    });
  });
});
