import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { audit } from '../audit.js';

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
  production_url: "https://example.com"
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
});
