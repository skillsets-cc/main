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

  /** Create the minimum valid content structure: content/.claude/, content/CLAUDE.md, content/README.md, content/QUICKSTART.md */
  function createValidContent() {
    mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
    writeFileSync(join(testDir, 'content', 'README.md'), '# Test\n\nDescription');
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');
    writeFileSync(join(testDir, 'content', 'QUICKSTART.md'), '# Quickstart\n\nGet started here.');
  }

  it('passes with valid structure', async () => {
    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    createValidContent();

    await audit();

    expect(existsSync(join(testDir, 'AUDIT_REPORT.md'))).toBe(true);

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('READY FOR SUBMISSION');
  });

  it('fails without skillset.yaml', async () => {
    createValidContent();

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('NOT READY');
    expect(report).toContain('skillset.yaml');
  });

  it('fails without README.md', async () => {
    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('NOT READY');
    expect(report).toContain('README.md');
  });

  it('fails without QUICKSTART.md', async () => {
    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
    writeFileSync(join(testDir, 'content', 'README.md'), '# Test');
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('NOT READY');
    expect(report).toContain('QUICKSTART.md');
  });

  it('fails without content directory', async () => {
    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('NOT READY');
    expect(report).toContain('content');
  });

  it('fails without both .claude and CLAUDE.md in content', async () => {
    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    mkdirSync(join(testDir, 'content'));
    writeFileSync(join(testDir, 'content', 'README.md'), '# Test');
    writeFileSync(join(testDir, 'content', 'other.txt'), 'something');

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('NOT READY');
    expect(report).toContain('Missing: .claude/, CLAUDE.md');
  });

  it('fails with only .claude directory, no CLAUDE.md', async () => {
    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
    writeFileSync(join(testDir, 'content', 'README.md'), '# Test');
    writeFileSync(join(testDir, 'content', '.claude', 'settings.json'), '{}');

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('NOT READY');
    expect(report).toContain('Missing: CLAUDE.md');
  });

  it('fails with only CLAUDE.md, no .claude directory', async () => {
    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    mkdirSync(join(testDir, 'content'));
    writeFileSync(join(testDir, 'content', 'README.md'), '# Test');
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('NOT READY');
    expect(report).toContain('Missing: .claude/');
  });

  it('validates manifest schema', async () => {
    const invalidYaml = `schema_version: "2.0"
name: "invalid name with spaces"
version: "not-semver"
`;
    writeFileSync(join(testDir, 'skillset.yaml'), invalidYaml);
    createValidContent();

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('NOT READY');
    expect(report).toContain('schema_version');
  });

  it('detects high-confidence secret patterns', async () => {
    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
    writeFileSync(join(testDir, 'content', 'README.md'), '# Test');
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');
    writeFileSync(join(testDir, 'content', 'config.ts'), 'const key = "sk-1234567890abcdefghijklmnopqrstuvwxyz123456789012"');

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('NOT READY');
    expect(report).toContain('OpenAI Key');
  });

  it('does not flag generic password or token strings', async () => {
    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    createValidContent();
    writeFileSync(join(testDir, 'content', 'example.ts'), 'password = "example_password_here"\ntoken = "my-test-token-12345678901234567890"');

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('READY FOR SUBMISSION');
    expect(report).toContain('Secret Detection | ✓ PASS');
  });

  it('detects AWS keys', async () => {
    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
    writeFileSync(join(testDir, 'content', 'README.md'), '# Test');
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');
    writeFileSync(join(testDir, 'content', 'config.ts'), 'const key = "AKIAIOSFODNN7EXAMPLE"');

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('NOT READY');
    expect(report).toContain('AWS Key');
  });

  it('detects Anthropic keys', async () => {
    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
    writeFileSync(join(testDir, 'content', 'README.md'), '# Test');
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');
    writeFileSync(join(testDir, 'content', 'config.ts'), 'const key = "sk-ant-api03-abcdefghijklmnopqrst"');

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('NOT READY');
    expect(report).toContain('Anthropic Key');
  });

  it('warns about large files', async () => {
    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    createValidContent();
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
    createValidContent();

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
    createValidContent();

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
    createValidContent();

    await audit();

    const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
    expect(report).toContain('READY FOR SUBMISSION');
    expect(report).toContain('Update');
    expect(report).toContain('0.9.0');
    expect(report).toContain('1.0.0');
  });

  describe('MCP server validation', () => {
    it('passes when no MCP servers present', async () => {
      writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
      createValidContent();

      await audit();

      const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
      expect(report).toContain('READY FOR SUBMISSION');
      expect(report).toContain('MCP Servers | ✓ PASS');
    });

    it('passes when content MCP matches manifest', async () => {
      const yamlWithMcp = validSkillsetYaml + `\nmcp_servers:\n  - name: context7\n    type: stdio\n    command: npx\n    args: ["-y", "@upstash/context7-mcp"]\n    mcp_reputation: "npm: @upstash/context7-mcp, 50k weekly downloads, maintained by Upstash"\n    researched_at: "2026-02-04"\n`;
      writeFileSync(join(testDir, 'skillset.yaml'), yamlWithMcp);
      mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
      writeFileSync(join(testDir, 'content', 'README.md'), '# Test');
      writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');
      writeFileSync(join(testDir, 'content', 'QUICKSTART.md'), '# Quickstart');
      writeFileSync(join(testDir, 'content', '.mcp.json'), JSON.stringify({
        mcpServers: {
          context7: { type: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp'] }
        }
      }));

      await audit();

      const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
      expect(report).toContain('READY FOR SUBMISSION');
      expect(report).toContain('MCP Servers | ✓ PASS');
    });

    it('reports MCP as pending qualitative review in normal mode (pre-skill)', async () => {
      writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
      mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
      writeFileSync(join(testDir, 'content', 'README.md'), '# Test');
      writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');
      writeFileSync(join(testDir, 'content', 'QUICKSTART.md'), '# Quickstart');
      writeFileSync(join(testDir, 'content', '.mcp.json'), JSON.stringify({
        mcpServers: {
          context7: { type: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp'] }
        }
      }));

      await audit();

      const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
      expect(report).toContain('READY FOR SUBMISSION');
      expect(report).toContain('MCP Servers | ⚠ WARNING');
      expect(report).toContain('Pending qualitative review');
    });

    it('fails MCP mismatch in --check mode (CI)', async () => {
      writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
      mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
      writeFileSync(join(testDir, 'content', 'README.md'), '# Test');
      writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');
      writeFileSync(join(testDir, 'content', 'QUICKSTART.md'), '# Quickstart');
      writeFileSync(join(testDir, 'content', '.mcp.json'), JSON.stringify({
        mcpServers: {
          context7: { type: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp'] }
        }
      }));

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      await audit({ check: true });

      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });

    it('fails when manifest has MCP but content does not in --check mode', async () => {
      const yamlWithMcp = validSkillsetYaml + `\nmcp_servers:\n  - name: context7\n    type: stdio\n    command: npx\n    args: ["-y", "@upstash/context7-mcp"]\n    mcp_reputation: "npm: @upstash/context7-mcp, 50k weekly downloads, maintained by Upstash"\n    researched_at: "2026-02-04"\n`;
      writeFileSync(join(testDir, 'skillset.yaml'), yamlWithMcp);
      mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
      writeFileSync(join(testDir, 'content', 'README.md'), '# Test');
      writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');
      writeFileSync(join(testDir, 'content', 'QUICKSTART.md'), '# Quickstart');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      await audit({ check: true });

      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });

    it('passes with Docker MCP when content and manifest match', async () => {
      const yamlWithDocker = validSkillsetYaml + `\nmcp_servers:\n  - name: litellm-proxy\n    type: docker\n    image: "ghcr.io/berriai/litellm:main-latest"\n    mcp_reputation: "ghcr: berriai/litellm, widely used LLM proxy"\n    researched_at: "2026-02-04"\n    servers:\n      - name: context7\n        command: npx\n        args: ["-y", "@upstash/context7-mcp"]\n        mcp_reputation: "npm: @upstash/context7-mcp"\n        researched_at: "2026-02-04"\n`;
      writeFileSync(join(testDir, 'skillset.yaml'), yamlWithDocker);
      mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
      mkdirSync(join(testDir, 'content', 'docker'), { recursive: true });
      writeFileSync(join(testDir, 'content', 'README.md'), '# Test');
      writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');
      writeFileSync(join(testDir, 'content', 'QUICKSTART.md'), '# Quickstart');
      writeFileSync(join(testDir, 'content', 'docker', 'docker-compose.yaml'), 'services:\n  litellm:\n    image: ghcr.io/berriai/litellm:main-latest\n');
      writeFileSync(join(testDir, 'content', 'docker', 'config.yaml'), 'mcp_servers:\n  context7:\n    command: npx\n    args: ["-y", "@upstash/context7-mcp"]\n');

      await audit();

      const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
      expect(report).toContain('READY FOR SUBMISSION');
      expect(report).toContain('MCP Servers | ✓ PASS');
    });

    it('includes MCP error details in findings section', async () => {
      writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
      mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
      writeFileSync(join(testDir, 'content', 'README.md'), '# Test');
      writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');
      writeFileSync(join(testDir, 'content', 'QUICKSTART.md'), '# Quickstart');
      writeFileSync(join(testDir, 'content', '.mcp.json'), JSON.stringify({
        mcpServers: {
          context7: { type: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp'] }
        }
      }));

      await audit();

      const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
      // Error details appear in findings even in normal mode (informational)
      expect(report).toContain('### 8. MCP Server Validation');
      expect(report).toContain('context7');
      expect(report).toContain('not declared');
      // Report still passes (MCP pending qualitative review in normal mode)
      expect(report).toContain('READY FOR SUBMISSION');
      expect(report).toContain('Pending qualitative review');
    });
  });

  describe('--check flag', () => {
    it('does not write AUDIT_REPORT.md in check mode', async () => {
      writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
      createValidContent();

      await audit({ check: true });

      expect(existsSync(join(testDir, 'AUDIT_REPORT.md'))).toBe(false);
    });

    it('preserves existing AUDIT_REPORT.md in check mode', async () => {
      writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
      createValidContent();
      writeFileSync(join(testDir, 'AUDIT_REPORT.md'), '# Existing report\n\n## Qualitative Review\nApproved by Opus');

      await audit({ check: true });

      const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
      expect(report).toContain('Qualitative Review');
      expect(report).toContain('Approved by Opus');
    });

    it('exits with code 1 on failure in check mode', async () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
      // Missing content/README.md — will fail
      mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
      writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

      await audit({ check: true });

      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });

    it('does not exit with code 1 on success in check mode', async () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
      createValidContent();

      await audit({ check: true });

      expect(exitSpy).not.toHaveBeenCalled();
      exitSpy.mockRestore();
    });

    it('still writes AUDIT_REPORT.md without check flag', async () => {
      writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
      createValidContent();

      await audit();

      expect(existsSync(join(testDir, 'AUDIT_REPORT.md'))).toBe(true);
      const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
      expect(report).toContain('READY FOR SUBMISSION');
    });
  });

  describe('README link validation', () => {
    it('passes when README has no links to content/.claude/', async () => {
      writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
      mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
      writeFileSync(join(testDir, 'content', 'README.md'), '# Test\n\n[External](https://example.com)\n[Other](./other.md)');
      writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');
      writeFileSync(join(testDir, 'content', 'QUICKSTART.md'), '# Quickstart');

      await audit();

      const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
      expect(report).toContain('READY FOR SUBMISSION');
      expect(report).toContain('README Links | ✓ PASS');
    });

    it('fails when README has relative links to content/.claude/', async () => {
      writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
      mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
      writeFileSync(
        join(testDir, 'content', 'README.md'),
        '# Test\n\n[Skill](content/.claude/skills/my-skill/SKILL.md)\n[Agent](./content/.claude/agents/my-agent.md)'
      );
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
      mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
      writeFileSync(
        join(testDir, 'content', 'README.md'),
        '# Test\n\n[Skill](https://github.com/skillsets-cc/main/blob/main/skillsets/%40testuser/test-skillset/content/.claude/skills/my-skill/SKILL.md)'
      );
      writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');
      writeFileSync(join(testDir, 'content', 'QUICKSTART.md'), '# Quickstart');

      await audit();

      const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
      expect(report).toContain('READY FOR SUBMISSION');
      expect(report).toContain('README Links | ✓ PASS');
    });

    it('detects multiple relative links on same line', async () => {
      writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
      mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
      writeFileSync(
        join(testDir, 'content', 'README.md'),
        '# Test\n\n| [One](content/.claude/a.md) | [Two](content/.claude/b.md) |'
      );
      writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

      await audit();

      const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
      expect(report).toContain('NOT READY');
      expect(report).toContain('2 relative link(s)');
    });

    it('shows correct line numbers for relative links', async () => {
      writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
      mkdirSync(join(testDir, 'content', '.claude'), { recursive: true });
      writeFileSync(
        join(testDir, 'content', 'README.md'),
        '# Test\n\nFirst paragraph.\n\n[Link](content/.claude/test.md)\n\nMore text.'
      );
      writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

      await audit();

      const report = readFileSync(join(testDir, 'AUDIT_REPORT.md'), 'utf-8');
      expect(report).toContain('Line 5:');
    });
  });
});
