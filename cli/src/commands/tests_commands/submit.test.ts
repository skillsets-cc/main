import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync, spawnSync } from 'child_process';

// Mock child_process before importing submit
vi.mock('child_process', () => ({
  execSync: vi.fn(),
  spawnSync: vi.fn(),
}));

// Mock api module
vi.mock('../../lib/api.js', () => ({
  fetchSkillsetMetadata: vi.fn(),
}));

import { submit } from '../submit.js';
import { fetchSkillsetMetadata } from '../../lib/api.js';

describe('submit command', () => {
  let testDir: string;
  const originalCwd = process.cwd();

  const validSkillsetYaml = `schema_version: "1.0"
name: "test-skillset"
version: "1.0.0"
description: "A valid test skillset for testing"
author:
  handle: "@testuser"
  url: "https://github.com/testuser"
verification:
  production_links:
    - url: "https://example.com"
  audit_report: "./AUDIT_REPORT.md"
tags:
  - "test"
status: "active"
entry_point: "./content/CLAUDE.md"
`;

  const passingAuditReport = `# Audit Report

**Generated:** 2024-01-01
**Skillset:** test-skillset v1.0.0
**Author:** @testuser

## Submission Status

**✓ READY FOR SUBMISSION**
`;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`Process exit with code ${code}`);
    });

    // Create temp directory for tests
    testDir = join(tmpdir(), `skillsets-submit-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(testDir, { recursive: true, force: true });
  });

  it('checks for gh CLI', async () => {
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (cmd === 'gh --version') {
        throw new Error('gh not found');
      }
      return Buffer.from('');
    });

    await expect(submit()).rejects.toThrow('GitHub CLI (gh) not found');
  });

  it('checks for gh authentication', async () => {
    vi.mocked(execSync).mockImplementation((cmd: string) => {
      if (cmd === 'gh --version') return Buffer.from('gh version 2.0.0');
      if (cmd === 'gh auth status') throw new Error('not authenticated');
      return Buffer.from('');
    });

    await expect(submit()).rejects.toThrow('GitHub CLI not authenticated');
  });

  it('checks for skillset.yaml', async () => {
    vi.mocked(execSync).mockImplementation((cmd: string, opts?: any) => {
      if (cmd === 'gh --version') return Buffer.from('gh version 2.0.0');
      if (cmd === 'gh auth status') return Buffer.from('Logged in');
      if (cmd.includes('gh api user')) return opts?.encoding ? 'testuser' : Buffer.from('testuser');
      return opts?.encoding ? '' : Buffer.from('');
    });

    // No skillset.yaml created

    await expect(submit()).rejects.toThrow('skillset.yaml not found or invalid');
  });

  it('checks for audit report', async () => {
    vi.mocked(execSync).mockImplementation((cmd: string, opts?: any) => {
      if (cmd === 'gh --version') return Buffer.from('gh version 2.0.0');
      if (cmd === 'gh auth status') return Buffer.from('Logged in');
      if (cmd.includes('gh api user')) return opts?.encoding ? 'testuser' : Buffer.from('testuser');
      return opts?.encoding ? '' : Buffer.from('');
    });

    // Create skillset.yaml but no audit report
    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);

    await expect(submit()).rejects.toThrow('AUDIT_REPORT.md not found');
  });

  it('checks audit report is passing', async () => {
    vi.mocked(execSync).mockImplementation((cmd: string, opts?: any) => {
      if (cmd === 'gh --version') return Buffer.from('gh version 2.0.0');
      if (cmd === 'gh auth status') return Buffer.from('Logged in');
      if (cmd.includes('gh api user')) return opts?.encoding ? 'testuser' : Buffer.from('testuser');
      return opts?.encoding ? '' : Buffer.from('');
    });

    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    writeFileSync(join(testDir, 'AUDIT_REPORT.md'), '# Audit Report\n\n**NOT READY**');

    await expect(submit()).rejects.toThrow('Audit report shows failures');
  });

  it('checks for required files', async () => {
    vi.mocked(execSync).mockImplementation((cmd: string, opts?: any) => {
      if (cmd === 'gh --version') return Buffer.from('gh version 2.0.0');
      if (cmd === 'gh auth status') return Buffer.from('Logged in');
      if (cmd.includes('gh api user')) return opts?.encoding ? 'testuser' : Buffer.from('testuser');
      return opts?.encoding ? '' : Buffer.from('');
    });

    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    writeFileSync(join(testDir, 'AUDIT_REPORT.md'), passingAuditReport);
    // Missing content/

    await expect(submit()).rejects.toThrow('Missing required');
  });

  it('creates PR with valid submission', async () => {
    const prUrl = 'https://github.com/skillsets-cc/main/pull/123';

    vi.mocked(execSync).mockImplementation((cmd: string, opts?: any) => {
      if (cmd === 'gh --version') return Buffer.from('gh version 2.0.0');
      if (cmd === 'gh auth status') return Buffer.from('Logged in');
      if (cmd.includes('gh api user')) return opts?.encoding ? 'testuser' : Buffer.from('testuser');
      if (cmd.includes('gh repo fork')) return Buffer.from('');
      if (cmd.includes('gh repo clone')) return Buffer.from('');
      return opts?.encoding ? '' : Buffer.from('');
    });

    vi.mocked(spawnSync).mockImplementation((cmd: string, args?: string[]) => {
      if (cmd === 'gh' && args?.[0] === 'pr') {
        return { status: 0, stdout: prUrl, stderr: '', pid: 0, output: [], signal: null };
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null };
    });

    // Create valid structure
    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    writeFileSync(join(testDir, 'AUDIT_REPORT.md'), passingAuditReport);
    mkdirSync(join(testDir, 'content'));
    writeFileSync(join(testDir, 'content', 'README.md'), '# Test');
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

    await submit();

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Submission complete')
    );
  });

  it('rejects update with same or lower version', async () => {
    vi.mocked(execSync).mockImplementation((cmd: string, opts?: any) => {
      if (cmd === 'gh --version') return Buffer.from('gh version 2.0.0');
      if (cmd === 'gh auth status') return Buffer.from('Logged in');
      if (cmd.includes('gh api user')) return opts?.encoding ? 'testuser' : Buffer.from('testuser');
      return opts?.encoding ? '' : Buffer.from('');
    });

    // Mock existing skillset in registry with same version
    vi.mocked(fetchSkillsetMetadata).mockResolvedValue({
      id: '@testuser/test-skillset',
      name: 'test-skillset',
      description: 'Existing skillset',
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
    writeFileSync(join(testDir, 'AUDIT_REPORT.md'), passingAuditReport);
    mkdirSync(join(testDir, 'content'));
    writeFileSync(join(testDir, 'content', 'README.md'), '# Test');
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

    await expect(submit()).rejects.toThrow('Version must be greater than');
  });

  it('creates update PR with higher version', async () => {
    const prUrl = 'https://github.com/skillsets-cc/main/pull/456';

    vi.mocked(execSync).mockImplementation((cmd: string, opts?: any) => {
      if (cmd === 'gh --version') return Buffer.from('gh version 2.0.0');
      if (cmd === 'gh auth status') return Buffer.from('Logged in');
      if (cmd.includes('gh api user')) return opts?.encoding ? 'testuser' : Buffer.from('testuser');
      if (cmd.includes('gh repo fork')) return Buffer.from('');
      if (cmd.includes('gh repo clone')) return Buffer.from('');
      return opts?.encoding ? '' : Buffer.from('');
    });

    vi.mocked(spawnSync).mockImplementation((cmd: string, args?: string[]) => {
      if (cmd === 'gh' && args?.[0] === 'pr') {
        return { status: 0, stdout: prUrl, stderr: '', pid: 0, output: [], signal: null };
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null };
    });

    // Mock existing skillset with lower version
    vi.mocked(fetchSkillsetMetadata).mockResolvedValue({
      id: '@testuser/test-skillset',
      name: 'test-skillset',
      description: 'Existing skillset',
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
    writeFileSync(join(testDir, 'AUDIT_REPORT.md'), passingAuditReport);
    mkdirSync(join(testDir, 'content'));
    writeFileSync(join(testDir, 'content', 'README.md'), '# Test');
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

    await submit();

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Update complete')
    );
  });

  describe('command injection protection', () => {
    beforeEach(() => {
      vi.mocked(execSync).mockImplementation((cmd: string, opts?: any) => {
        if (cmd === 'gh --version') return Buffer.from('gh version 2.0.0');
        if (cmd === 'gh auth status') return Buffer.from('Logged in');
        if (cmd.includes('gh api user')) return opts?.encoding ? 'testuser' : Buffer.from('testuser');
        return opts?.encoding ? '' : Buffer.from('');
      });
    });

    it('rejects name with command substitution $(...)', async () => {
      const maliciousYaml = `schema_version: "1.0"
name: "test$(whoami)"
version: "1.0.0"
description: "Malicious skillset attempting command injection"
author:
  handle: "@testuser"
  url: "https://github.com/testuser"
verification:
  production_links:
    - url: "https://example.com"
  audit_report: "./AUDIT_REPORT.md"
tags:
  - "test"
status: "active"
entry_point: "./content/CLAUDE.md"
`;
      writeFileSync(join(testDir, 'skillset.yaml'), maliciousYaml);

      await expect(submit()).rejects.toThrow('skillset.yaml not found or invalid');
    });

    it('rejects name with backtick command substitution', async () => {
      const maliciousYaml = `schema_version: "1.0"
name: "test\`whoami\`"
version: "1.0.0"
description: "Malicious skillset attempting command injection"
author:
  handle: "@testuser"
  url: "https://github.com/testuser"
verification:
  production_links:
    - url: "https://example.com"
  audit_report: "./AUDIT_REPORT.md"
tags:
  - "test"
status: "active"
entry_point: "./content/CLAUDE.md"
`;
      writeFileSync(join(testDir, 'skillset.yaml'), maliciousYaml);

      await expect(submit()).rejects.toThrow('skillset.yaml not found or invalid');
    });

    it('rejects name with semicolon command chaining', async () => {
      const maliciousYaml = `schema_version: "1.0"
name: "test; rm -rf /"
version: "1.0.0"
description: "Malicious skillset attempting command injection"
author:
  handle: "@testuser"
  url: "https://github.com/testuser"
verification:
  production_links:
    - url: "https://example.com"
  audit_report: "./AUDIT_REPORT.md"
tags:
  - "test"
status: "active"
entry_point: "./content/CLAUDE.md"
`;
      writeFileSync(join(testDir, 'skillset.yaml'), maliciousYaml);

      await expect(submit()).rejects.toThrow('skillset.yaml not found or invalid');
    });

    it('rejects author handle with shell metacharacters', async () => {
      const maliciousYaml = `schema_version: "1.0"
name: "test-skillset"
version: "1.0.0"
description: "Malicious skillset attempting command injection"
author:
  handle: "@test$(id)"
  url: "https://github.com/testuser"
verification:
  production_links:
    - url: "https://example.com"
  audit_report: "./AUDIT_REPORT.md"
tags:
  - "test"
status: "active"
entry_point: "./content/CLAUDE.md"
`;
      writeFileSync(join(testDir, 'skillset.yaml'), maliciousYaml);

      await expect(submit()).rejects.toThrow('skillset.yaml not found or invalid');
    });
  });

  it('exits when GitHub username cannot be determined', async () => {
    vi.mocked(execSync).mockImplementation((cmd: string, opts?: any) => {
      if (cmd === 'gh --version') return Buffer.from('gh version 2.0.0');
      if (cmd === 'gh auth status') return Buffer.from('Logged in');
      if (cmd.includes('gh api user --jq .login')) throw new Error('API error');
      return opts?.encoding ? '' : Buffer.from('');
    });

    await expect(submit()).rejects.toThrow('Could not determine GitHub username');
  });

  it('creates new PR when no existing PR found', async () => {
    const prUrl = 'https://github.com/skillsets-cc/main/pull/789';

    vi.mocked(execSync).mockImplementation((cmd: string, opts?: any) => {
      if (cmd === 'gh --version') return Buffer.from('gh version 2.0.0');
      if (cmd === 'gh auth status') return Buffer.from('Logged in');
      if (cmd.includes('gh api user')) return opts?.encoding ? 'testuser' : Buffer.from('testuser');
      if (cmd.includes('gh repo fork')) return Buffer.from('');
      if (cmd.includes('gh repo clone')) return Buffer.from('');
      if (cmd.includes('gh auth setup-git')) return Buffer.from('');
      return opts?.encoding ? '' : Buffer.from('');
    });

    vi.mocked(spawnSync).mockImplementation((cmd: string, args?: string[]) => {
      if (cmd === 'gh' && args?.[0] === 'pr' && args?.[1] === 'list') {
        return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null };
      }
      if (cmd === 'gh' && args?.[0] === 'pr' && args?.[1] === 'create') {
        return { status: 0, stdout: prUrl, stderr: '', pid: 0, output: [], signal: null };
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null };
    });

    vi.mocked(fetchSkillsetMetadata).mockResolvedValue(undefined);

    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    writeFileSync(join(testDir, 'AUDIT_REPORT.md'), passingAuditReport);
    mkdirSync(join(testDir, 'content'));
    writeFileSync(join(testDir, 'content', 'README.md'), '# Test');
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

    await submit();

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Submission complete')
    );
    expect(spawnSync).toHaveBeenCalledWith(
      'gh', expect.arrayContaining(['pr', 'create']),
      expect.any(Object)
    );
  });

  it('handles registry unavailable during submission', async () => {
    const prUrl = 'https://github.com/skillsets-cc/main/pull/999';

    vi.mocked(execSync).mockImplementation((cmd: string, opts?: any) => {
      if (cmd === 'gh --version') return Buffer.from('gh version 2.0.0');
      if (cmd === 'gh auth status') return Buffer.from('Logged in');
      if (cmd.includes('gh api user')) return opts?.encoding ? 'testuser' : Buffer.from('testuser');
      if (cmd.includes('gh repo fork')) return Buffer.from('');
      if (cmd.includes('gh repo clone')) return Buffer.from('');
      if (cmd.includes('gh auth setup-git')) return Buffer.from('');
      return opts?.encoding ? '' : Buffer.from('');
    });

    vi.mocked(spawnSync).mockImplementation((cmd: string, args?: string[]) => {
      if (cmd === 'gh' && args?.[0] === 'pr') {
        return { status: 0, stdout: prUrl, stderr: '', pid: 0, output: [], signal: null };
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null };
    });

    vi.mocked(fetchSkillsetMetadata).mockRejectedValue(new Error('Network'));

    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    writeFileSync(join(testDir, 'AUDIT_REPORT.md'), passingAuditReport);
    mkdirSync(join(testDir, 'content'));
    writeFileSync(join(testDir, 'content', 'README.md'), '# Test');
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

    await submit();

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Could not check registry')
    );
  });

  it('shows manual instructions on submission error', async () => {
    vi.mocked(execSync).mockImplementation((cmd: string, opts?: any) => {
      if (cmd === 'gh --version') return Buffer.from('gh version 2.0.0');
      if (cmd === 'gh auth status') return Buffer.from('Logged in');
      if (cmd.includes('gh api user')) return opts?.encoding ? 'testuser' : Buffer.from('testuser');
      if (cmd.includes('gh repo fork')) return Buffer.from('');
      if (cmd.includes('gh repo clone')) throw new Error('Clone failed');
      return opts?.encoding ? '' : Buffer.from('');
    });

    vi.mocked(fetchSkillsetMetadata).mockResolvedValue(undefined);

    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    writeFileSync(join(testDir, 'AUDIT_REPORT.md'), passingAuditReport);
    mkdirSync(join(testDir, 'content'));
    writeFileSync(join(testDir, 'content', 'README.md'), '# Test');
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

    await expect(submit()).rejects.toThrow('Process exit');

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('To submit manually'));
  });

  it('fails when commit detects no changes', async () => {
    vi.mocked(execSync).mockImplementation((cmd: string, opts?: any) => {
      if (cmd === 'gh --version') return Buffer.from('gh version 2.0.0');
      if (cmd === 'gh auth status') return Buffer.from('Logged in');
      if (cmd.includes('gh api user')) return opts?.encoding ? 'testuser' : Buffer.from('testuser');
      if (cmd.includes('gh repo fork')) return Buffer.from('');
      if (cmd.includes('gh repo clone')) return Buffer.from('');
      if (cmd.includes('gh auth setup-git')) return Buffer.from('');
      return opts?.encoding ? '' : Buffer.from('');
    });

    vi.mocked(spawnSync).mockImplementation((cmd: string, args?: string[]) => {
      if (cmd === 'git' && args?.[0] === 'commit') {
        return { status: 1, stdout: '', stderr: 'nothing to commit', pid: 0, output: [], signal: null };
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null };
    });

    vi.mocked(fetchSkillsetMetadata).mockResolvedValue(undefined);

    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    writeFileSync(join(testDir, 'AUDIT_REPORT.md'), passingAuditReport);
    mkdirSync(join(testDir, 'content'));
    writeFileSync(join(testDir, 'content', 'README.md'), '# Test');
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

    await expect(submit()).rejects.toThrow('Process exit');

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No changes detected'));
  });

  it('fails when push to fork fails', async () => {
    vi.mocked(execSync).mockImplementation((cmd: string, opts?: any) => {
      if (cmd === 'gh --version') return Buffer.from('gh version 2.0.0');
      if (cmd === 'gh auth status') return Buffer.from('Logged in');
      if (cmd.includes('gh api user')) return opts?.encoding ? 'testuser' : Buffer.from('testuser');
      if (cmd.includes('gh repo fork')) return Buffer.from('');
      if (cmd.includes('gh repo clone')) return Buffer.from('');
      if (cmd.includes('gh auth setup-git')) return Buffer.from('');
      return opts?.encoding ? '' : Buffer.from('');
    });

    vi.mocked(spawnSync).mockImplementation((cmd: string, args?: string[]) => {
      if (cmd === 'git' && args?.[0] === 'push') {
        return { status: 1, stdout: '', stderr: 'push rejected', pid: 0, output: [], signal: null };
      }
      return { status: 0, stdout: '', stderr: '', pid: 0, output: [], signal: null };
    });

    vi.mocked(fetchSkillsetMetadata).mockResolvedValue(undefined);

    writeFileSync(join(testDir, 'skillset.yaml'), validSkillsetYaml);
    writeFileSync(join(testDir, 'AUDIT_REPORT.md'), passingAuditReport);
    mkdirSync(join(testDir, 'content'));
    writeFileSync(join(testDir, 'content', 'README.md'), '# Test');
    writeFileSync(join(testDir, 'content', 'CLAUDE.md'), '# Instructions');

    await expect(submit()).rejects.toThrow('Process exit');

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('To submit manually'));
  });
});
