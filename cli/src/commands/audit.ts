import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, openSync, readSync, closeSync } from 'fs';
import { join, relative } from 'path';
import yaml from 'js-yaml';
import { fetchSkillsetMetadata } from '../lib/api.js';
import { validateMcpServers } from '../lib/validate-mcp.js';
import { compareVersions } from '../lib/versions.js';

type AuditStatus = 'PASS' | 'FAIL' | 'WARNING';

interface AuditResult {
  status: AuditStatus;
  details: string;
  findings?: string;
}

interface AuditResults {
  manifest: AuditResult;
  requiredFiles: AuditResult;
  contentStructure: AuditResult;
  fileSize: AuditResult;
  binary: AuditResult;
  secrets: AuditResult;
  versionCheck: AuditResult;
  readmeLinks: AuditResult;
  mcpServers: AuditResult;
  skillsetName?: string;
  skillsetVersion?: string;
  authorHandle?: string;
  isUpdate: boolean;
  existingVersion?: string;
  files: { path: string; size: number }[];
  largeFiles: { path: string; size: number }[];
  binaryFiles: string[];
  secretsFound: { file: string; line: number; pattern: string }[];
  relativeLinks: { line: number; link: string }[];
}

const MAX_FILE_SIZE = 1048576; // 1MB

const TEXT_EXTENSIONS = new Set([
  '.md', '.txt', '.json', '.yaml', '.yml',
  '.js', '.ts', '.tsx', '.jsx',
  '.py', '.sh', '.bash',
  '.astro', '.html', '.css', '.scss',
  '.toml', '.conf', '.env.example',
  '.gitignore', '.editorconfig',
]);

const SECRET_PATTERNS = [
  { name: 'AWS Key', pattern: /AKIA[0-9A-Z]{16}/g },
  { name: 'GitHub Token', pattern: /ghp_[a-zA-Z0-9]{36}/g },
  { name: 'OpenAI Key', pattern: /sk-[a-zA-Z0-9]{48}/g },
  { name: 'Anthropic Key', pattern: /sk-ant-[a-zA-Z0-9_-]{20,}/g },
];

function getAllFiles(dir: string, baseDir: string = dir): { path: string; size: number }[] {
  const files: { path: string; size: number }[] = [];

  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      // Skip node_modules, .git, etc.
      if (['node_modules', '.git', '__pycache__'].includes(entry.name)) continue;
      files.push(...getAllFiles(fullPath, baseDir));
    } else {
      const stat = statSync(fullPath);
      files.push({ path: relativePath, size: stat.size });
    }
  }

  return files;
}

function isBinaryFile(filePath: string): boolean {
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) return false;
  if (filePath.endsWith('.example')) return false;

  // Check for null bytes in first 512 bytes
  try {
    const buffer = Buffer.alloc(512);
    const fd = openSync(filePath, 'r');
    readSync(fd, buffer, 0, 512, 0);
    closeSync(fd);
    return buffer.includes(0);
  } catch {
    return false;
  }
}

function scanReadmeLinks(cwd: string): { line: number; link: string }[] {
  const readmePath = join(cwd, 'content', 'README.md');
  if (!existsSync(readmePath)) return [];

  const relativeLinks: { line: number; link: string }[] = [];
  const content = readFileSync(readmePath, 'utf-8');
  const lines = content.split('\n');

  // Match markdown links: [text](url)
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;

  for (let i = 0; i < lines.length; i++) {
    let match;
    while ((match = linkRegex.exec(lines[i])) !== null) {
      const url = match[2];
      // Flag relative links to content/.claude/ that aren't using GitHub URLs
      if (url.startsWith('content/.claude/') || url.startsWith('./content/.claude/')) {
        relativeLinks.push({ line: i + 1, link: url });
      }
    }
  }

  return relativeLinks;
}

function scanForSecrets(dir: string): { file: string; line: number; pattern: string }[] {
  const secrets: { file: string; line: number; pattern: string }[] = [];
  const files = getAllFiles(dir);

  for (const { path: filePath } of files) {
    const fullPath = join(dir, filePath);
    if (isBinaryFile(fullPath)) continue;
    if (filePath.includes('AUDIT_REPORT')) continue;

    try {
      const content = readFileSync(join(dir, filePath), 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        for (const { name, pattern } of SECRET_PATTERNS) {
          if (pattern.test(lines[i])) {
            secrets.push({ file: filePath, line: i + 1, pattern: name });
          }
          // Reset regex lastIndex
          pattern.lastIndex = 0;
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  return secrets;
}

function validateManifest(cwd: string): { valid: boolean; errors: string[]; data?: any } {
  const manifestPath = join(cwd, 'skillset.yaml');

  if (!existsSync(manifestPath)) {
    return { valid: false, errors: ['skillset.yaml not found'] };
  }

  try {
    const content = readFileSync(manifestPath, 'utf-8');
    const data = yaml.load(content) as Record<string, any>;
    const errors: string[] = [];

    // Required fields
    if (data.schema_version !== '1.0') {
      errors.push('schema_version must be "1.0"');
    }
    if (!data.name || !/^[A-Za-z0-9_-]+$/.test(data.name)) {
      errors.push('name must be alphanumeric with hyphens/underscores');
    }
    if (!data.version || !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(data.version)) {
      errors.push('version must be semantic (e.g., 1.0.0)');
    }
    if (!data.description || data.description.length < 10 || data.description.length > 200) {
      errors.push('description must be 10-200 characters');
    }
    if (!data.author?.handle || !/^@[A-Za-z0-9_-]+$/.test(data.author.handle)) {
      errors.push('author.handle must start with @ (e.g., @username)');
    }
    if (!Array.isArray(data.verification?.production_links) || data.verification.production_links.length === 0) {
      errors.push('verification.production_links must be an array with at least one entry');
    }
    if (!data.verification?.audit_report) {
      errors.push('verification.audit_report is required');
    }
    if (!Array.isArray(data.tags) || data.tags.length < 1 || data.tags.length > 10) {
      errors.push('tags must be an array with 1-10 items');
    } else {
      for (const tag of data.tags) {
        if (!/^[a-z0-9-]+$/.test(tag)) {
          errors.push(`tag "${tag}" must be lowercase alphanumeric with hyphens`);
        }
      }
    }

    return { valid: errors.length === 0, errors, data };
  } catch (error: any) {
    return { valid: false, errors: [`YAML parse error: ${error.message}`] };
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAuditPassing(results: AuditResults, enforceMcp: boolean): boolean {
  return results.manifest.status === 'PASS' &&
    results.requiredFiles.status === 'PASS' &&
    results.contentStructure.status === 'PASS' &&
    results.fileSize.status !== 'FAIL' &&
    results.secrets.status === 'PASS' &&
    results.readmeLinks.status === 'PASS' &&
    results.versionCheck.status === 'PASS' &&
    (enforceMcp ? results.mcpServers.status === 'PASS' : true);
}

function statusIcon(status: AuditStatus): string {
  if (status === 'PASS') return '✓ PASS';
  if (status === 'WARNING') return '⚠ WARNING';
  return '✗ FAIL';
}

function colorIcon(status: AuditStatus): string {
  if (status === 'PASS') return chalk.green('✓');
  if (status === 'WARNING') return chalk.yellow('⚠');
  return chalk.red('✗');
}

function generateReport(results: AuditResults, _cwd: string, enforceMcp: boolean = false): string {
  const timestamp = new Date().toISOString();
  const allPassed = isAuditPassing(results, enforceMcp);

  const submissionType = results.isUpdate
    ? `Update (${results.existingVersion} → ${results.skillsetVersion})`
    : 'New submission';

  let report = `# Audit Report

**Generated:** ${timestamp}
**Skillset:** ${results.skillsetName || 'Unknown'} v${results.skillsetVersion || '0.0.0'}
**Author:** ${results.authorHandle || 'Unknown'}
**Type:** ${submissionType}

---

## Validation Summary

| Check | Status | Details |
|-------|--------|---------|
| Manifest Validation | ${statusIcon(results.manifest.status)} | ${results.manifest.details} |
| Required Files | ${statusIcon(results.requiredFiles.status)} | ${results.requiredFiles.details} |
| Content Structure | ${statusIcon(results.contentStructure.status)} | ${results.contentStructure.details} |
| File Size Check | ${statusIcon(results.fileSize.status)} | ${results.fileSize.details} |
| Binary Detection | ${statusIcon(results.binary.status)} | ${results.binary.details} |
| Secret Detection | ${statusIcon(results.secrets.status)} | ${results.secrets.details} |
| README Links | ${statusIcon(results.readmeLinks.status)} | ${results.readmeLinks.details} |
| Version Check | ${statusIcon(results.versionCheck.status)} | ${results.versionCheck.details} |
| MCP Servers | ${statusIcon(results.mcpServers.status)} | ${results.mcpServers.details} |

---

## Detailed Findings

### 1. Manifest Validation

${results.manifest.findings || 'All fields validated successfully.'}

### 2. Required Files

${results.requiredFiles.findings || 'All required files present.'}

### 3. Content Structure

${results.contentStructure.findings || 'Valid content structure detected.'}

### 4. File Size Analysis

${results.fileSize.findings || 'No large files detected.'}

${results.largeFiles.length > 0 ? '**Large Files (>1MB):**\n' + results.largeFiles.map(f => `- ${f.path} (${formatSize(f.size)})`).join('\n') : ''}

**Total Files:** ${results.files.length}
**Total Size:** ${formatSize(results.files.reduce((sum, f) => sum + f.size, 0))}

### 5. Binary File Detection

${results.binary.findings || 'No binary files detected.'}

${results.binaryFiles.length > 0 ? '**Binary Files Detected:**\n' + results.binaryFiles.map(f => `- ${f}`).join('\n') : ''}

### 6. Secret Pattern Detection

${results.secrets.findings || 'No secrets detected.'}

${results.secretsFound.length > 0 ? '**Potential Secrets Found:**\n' + results.secretsFound.map(s => `- ${s.file}:${s.line} (${s.pattern})`).join('\n') : ''}

### 7. README Link Check

${results.readmeLinks.findings || 'All links use valid GitHub URLs.'}

${results.relativeLinks.length > 0 ? '**Relative Links Found:**\n' + results.relativeLinks.map(l => `- Line ${l.line}: ${l.link}`).join('\n') : ''}

### 8. MCP Server Validation

${results.mcpServers.findings || 'MCP server declarations are consistent between content and manifest.'}

---

## File Inventory

| File | Size |
|------|------|
${results.files.map(f => `| ${f.path} | ${formatSize(f.size)} |`).join('\n')}

---

## Submission Status

${allPassed ? '**✓ READY FOR SUBMISSION**' : '**✗ NOT READY - Please fix the issues above**'}

${allPassed
    ? 'All validation checks passed. You can now submit this skillset to the registry.'
    : 'Please address the failed checks before submitting.'}

---

## Next Steps

${allPassed
    ? `1. Review this audit report
2. Ensure PROOF.md has adequate production evidence
3. Run: \`npx skillsets submit\``
    : `1. Fix the issues flagged above
2. Re-run: \`npx skillsets audit\`
3. Repeat until all checks pass`}

---

**Generated by:** \`npx skillsets audit\`
**Schema Version:** 1.0
**Report Date:** ${timestamp}
`;

  return report;
}

interface AuditOptions {
  check?: boolean;
}

export async function audit(options: AuditOptions = {}): Promise<void> {
  const spinner = ora('Auditing skillset...').start();
  const cwd = process.cwd();

  const results: AuditResults = {
    manifest: { status: 'FAIL', details: '' },
    requiredFiles: { status: 'FAIL', details: '' },
    contentStructure: { status: 'FAIL', details: '' },
    fileSize: { status: 'PASS', details: '' },
    binary: { status: 'PASS', details: '' },
    secrets: { status: 'PASS', details: '' },
    versionCheck: { status: 'PASS', details: '' },
    readmeLinks: { status: 'PASS', details: '' },
    mcpServers: { status: 'PASS', details: '' },
    isUpdate: false,
    files: [],
    largeFiles: [],
    binaryFiles: [],
    secretsFound: [],
    relativeLinks: [],
  };

  // 1. Manifest validation
  spinner.text = 'Validating manifest...';
  const manifestResult = validateManifest(cwd);
  if (manifestResult.valid) {
    results.manifest = { status: 'PASS', details: 'All fields valid' };
    results.skillsetName = manifestResult.data.name;
    results.skillsetVersion = manifestResult.data.version;
    results.authorHandle = manifestResult.data.author?.handle;
  } else {
    results.manifest = {
      status: 'FAIL',
      details: `${manifestResult.errors.length} error(s)`,
      findings: manifestResult.errors.map(e => `- ${e}`).join('\n'),
    };
  }

  // 2. Required files
  spinner.text = 'Checking required files...';
  const hasContent = existsSync(join(cwd, 'content'));
  const hasReadme = existsSync(join(cwd, 'content', 'README.md'));
  const hasQuickstart = existsSync(join(cwd, 'content', 'QUICKSTART.md'));
  const hasSkillsetYaml = existsSync(join(cwd, 'skillset.yaml'));

  const missingFiles: string[] = [];
  if (!hasSkillsetYaml) missingFiles.push('skillset.yaml');
  if (!hasContent) missingFiles.push('content/');
  if (!hasReadme) missingFiles.push('content/README.md');
  if (!hasQuickstart) missingFiles.push('content/QUICKSTART.md');

  if (missingFiles.length === 0) {
    results.requiredFiles = { status: 'PASS', details: 'All present' };
  } else {
    results.requiredFiles = {
      status: 'FAIL',
      details: `Missing: ${missingFiles.join(', ')}`,
      findings: missingFiles.map(f => `- Missing: ${f}`).join('\n'),
    };
  }

  // 3. Content structure
  spinner.text = 'Verifying content structure...';
  const hasClaudeDir = existsSync(join(cwd, 'content', '.claude'));
  const hasClaudeMd = existsSync(join(cwd, 'content', 'CLAUDE.md'));

  if (hasClaudeDir && hasClaudeMd) {
    results.contentStructure = {
      status: 'PASS',
      details: 'Found: .claude/, CLAUDE.md',
    };
  } else {
    const missing = [!hasClaudeDir && '.claude/', !hasClaudeMd && 'CLAUDE.md'].filter(Boolean);
    results.contentStructure = {
      status: 'FAIL',
      details: `Missing: ${missing.join(', ')}`,
      findings: 'content/ must contain both .claude/ directory and CLAUDE.md file',
    };
  }

  // 4. File size check
  spinner.text = 'Checking file sizes...';
  results.files = getAllFiles(cwd);
  results.largeFiles = results.files.filter(f => f.size > MAX_FILE_SIZE);

  if (results.largeFiles.length === 0) {
    results.fileSize = { status: 'PASS', details: 'No files >1MB' };
  } else {
    results.fileSize = {
      status: 'WARNING',
      details: `${results.largeFiles.length} large file(s)`,
      findings: 'Consider compressing or moving large files to external hosting.',
    };
  }

  // 5. Binary detection
  spinner.text = 'Detecting binary files...';
  const contentDir = join(cwd, 'content');
  if (existsSync(contentDir)) {
    const contentFiles = getAllFiles(contentDir);
    for (const { path: filePath } of contentFiles) {
      const fullPath = join(contentDir, filePath);
      if (isBinaryFile(fullPath)) {
        results.binaryFiles.push(filePath);
      }
    }
  }

  if (results.binaryFiles.length === 0) {
    results.binary = { status: 'PASS', details: 'No binaries' };
  } else {
    results.binary = {
      status: 'WARNING',
      details: `${results.binaryFiles.length} binary file(s)`,
      findings: 'Binary files should be justified in your PR description.',
    };
  }

  // 6. Secret detection
  spinner.text = 'Scanning for secrets...';
  results.secretsFound = scanForSecrets(cwd);

  if (results.secretsFound.length === 0) {
    results.secrets = { status: 'PASS', details: 'No secrets detected' };
  } else {
    results.secrets = {
      status: 'FAIL',
      details: `${results.secretsFound.length} potential secret(s)`,
      findings: 'Remove all API keys, tokens, and passwords before submitting.',
    };
  }

  // 7. README link check
  spinner.text = 'Checking README links...';
  results.relativeLinks = scanReadmeLinks(cwd);

  if (results.relativeLinks.length === 0) {
    results.readmeLinks = { status: 'PASS', details: 'All links valid' };
  } else {
    results.readmeLinks = {
      status: 'FAIL',
      details: `${results.relativeLinks.length} relative link(s)`,
      findings: 'README links to content/.claude/ must use full GitHub URLs.\nFormat: https://github.com/skillsets-cc/main/blob/main/skillsets/%40username/skillset-name/content/.claude/...',
    };
  }

  // 8. Version check (for updates)
  spinner.text = 'Checking registry...';
  if (results.skillsetName && results.authorHandle) {
    const skillsetId = `${results.authorHandle}/${results.skillsetName}`;
    try {
      const existing = await fetchSkillsetMetadata(skillsetId);
      if (existing) {
        results.isUpdate = true;
        results.existingVersion = existing.version;

        if (compareVersions(results.skillsetVersion || '0.0.0', existing.version) > 0) {
          results.versionCheck = {
            status: 'PASS',
            details: `Update: ${existing.version} → ${results.skillsetVersion}`,
          };
        } else {
          results.versionCheck = {
            status: 'FAIL',
            details: `Version must be > ${existing.version}`,
            findings: `Current version ${results.skillsetVersion} is not greater than existing ${existing.version}. Bump the version in skillset.yaml.`,
          };
        }
      } else {
        results.versionCheck = { status: 'PASS', details: 'New submission' };
      }
    } catch {
      results.versionCheck = { status: 'PASS', details: 'Registry unavailable (skipped)' };
    }
  } else {
    results.versionCheck = { status: 'PASS', details: 'Skipped (no manifest)' };
  }

  // 9. MCP server validation
  spinner.text = 'Validating MCP servers...';
  const mcpResult = validateMcpServers(cwd);
  if (mcpResult.valid) {
    results.mcpServers = { status: 'PASS', details: 'MCP declarations valid' };
  } else if (options.check) {
    results.mcpServers = {
      status: 'FAIL',
      details: `${mcpResult.errors.length} MCP error(s)`,
      findings: mcpResult.errors.map(e => `- ${e}`).join('\n'),
    };
  } else {
    results.mcpServers = {
      status: 'WARNING',
      details: 'Pending qualitative review',
      findings: 'MCP servers detected in content. The `/audit-skill` will populate `skillset.yaml` and CI will re-validate.\n\n' +
        mcpResult.errors.map(e => `- ${e}`).join('\n'),
    };
  }

  // Generate report
  spinner.text = 'Generating audit report...';
  const report = generateReport(results, cwd, options.check);
  if (!options.check) {
    writeFileSync(join(cwd, 'AUDIT_REPORT.md'), report);
  }

  spinner.succeed(options.check ? 'Validation complete' : 'Audit complete');

  // Summary
  const allPassed = isAuditPassing(results, !!options.check);

  const checks: [AuditResult, string][] = [
    [results.manifest, 'Manifest'],
    [results.requiredFiles, 'Required Files'],
    [results.contentStructure, 'Content Structure'],
    [results.fileSize, 'File Sizes'],
    [results.binary, 'Binary Files'],
    [results.secrets, 'Secrets'],
    [results.readmeLinks, 'README Links'],
    [results.versionCheck, 'Version'],
    [results.mcpServers, 'MCP Servers'],
  ];

  console.log('\n' + chalk.bold('Audit Summary:'));
  console.log('');
  for (const [result, label] of checks) {
    console.log(`  ${colorIcon(result.status)} ${label}: ${result.details}`);
  }

  console.log('');

  if (allPassed) {
    console.log(chalk.green('✓ READY FOR SUBMISSION'));
    if (!options.check) {
      console.log(chalk.gray('\nGenerated: AUDIT_REPORT.md'));
      console.log(chalk.cyan('\nNext: npx skillsets submit'));
    }
  } else {
    console.log(chalk.red('✗ NOT READY - Fix issues above'));
    if (!options.check) {
      console.log(chalk.gray('\nGenerated: AUDIT_REPORT.md'));
      console.log(chalk.cyan('\nRe-run after fixes: npx skillsets audit'));
    }
    if (options.check) {
      process.exit(1);
    }
  }
}
