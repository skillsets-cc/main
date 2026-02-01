import chalk from 'chalk';
import ora from 'ora';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import yaml from 'js-yaml';
import { fetchSkillsetMetadata } from '../lib/api.js';

interface AuditResult {
  status: 'PASS' | 'FAIL' | 'WARNING';
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
  skillsetName?: string;
  skillsetVersion?: string;
  authorHandle?: string;
  isUpdate: boolean;
  existingVersion?: string;
  files: { path: string; size: number }[];
  largeFiles: { path: string; size: number }[];
  binaryFiles: string[];
  secretsFound: { file: string; line: number; pattern: string }[];
}

/**
 * Compare semver versions. Returns:
 * -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }
  return 0;
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
  { name: 'API Key', pattern: /api[_-]?key\s*[:=]\s*['"]?[a-zA-Z0-9]{20,}/gi },
  { name: 'Password', pattern: /password\s*[:=]\s*['"]?[^'"\s]{8,}/gi },
  { name: 'Secret', pattern: /secret\s*[:=]\s*['"]?[a-zA-Z0-9]{20,}/gi },
  { name: 'Token', pattern: /token\s*[:=]\s*['"]?[a-zA-Z0-9]{20,}/gi },
  { name: 'AWS Key', pattern: /AKIA[0-9A-Z]{16}/g },
  { name: 'GitHub Token', pattern: /ghp_[a-zA-Z0-9]{36}/g },
  { name: 'OpenAI Key', pattern: /sk-[a-zA-Z0-9]{48}/g },
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
    const fd = require('fs').openSync(filePath, 'r');
    require('fs').readSync(fd, buffer, 0, 512, 0);
    require('fs').closeSync(fd);
    return buffer.includes(0);
  } catch {
    return false;
  }
}

function scanForSecrets(dir: string): { file: string; line: number; pattern: string }[] {
  const secrets: { file: string; line: number; pattern: string }[] = [];
  const files = getAllFiles(dir);

  for (const { path: filePath } of files) {
    const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    if (!['.md', '.txt', '.json', '.yaml', '.yml', '.js', '.ts', '.py'].includes(ext)) continue;
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
    if (!data.verification?.production_url) {
      errors.push('verification.production_url is required');
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

function generateReport(results: AuditResults, cwd: string): string {
  const timestamp = new Date().toISOString();
  const allPassed = results.manifest.status === 'PASS' &&
    results.requiredFiles.status === 'PASS' &&
    results.contentStructure.status === 'PASS' &&
    results.fileSize.status !== 'FAIL' &&
    results.secrets.status === 'PASS' &&
    results.versionCheck.status === 'PASS';

  const submissionType = results.isUpdate
    ? `Update (${results.existingVersion} → ${results.skillsetVersion})`
    : 'New submission';

  const statusIcon = (status: string) => {
    if (status === 'PASS') return '✓ PASS';
    if (status === 'WARNING') return '⚠ WARNING';
    return '✗ FAIL';
  };

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
| Version Check | ${statusIcon(results.versionCheck.status)} | ${results.versionCheck.details} |

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

export async function audit(): Promise<void> {
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
    isUpdate: false,
    files: [],
    largeFiles: [],
    binaryFiles: [],
    secretsFound: [],
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
  const hasReadme = existsSync(join(cwd, 'README.md'));
  const hasContent = existsSync(join(cwd, 'content'));
  const hasSkillsetYaml = existsSync(join(cwd, 'skillset.yaml'));

  const missingFiles: string[] = [];
  if (!hasSkillsetYaml) missingFiles.push('skillset.yaml');
  if (!hasReadme) missingFiles.push('README.md');
  if (!hasContent) missingFiles.push('content/');

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

  if (hasClaudeDir || hasClaudeMd) {
    const found = [hasClaudeDir && '.claude/', hasClaudeMd && 'CLAUDE.md'].filter(Boolean);
    results.contentStructure = {
      status: 'PASS',
      details: `Found: ${found.join(', ')}`,
    };
  } else {
    results.contentStructure = {
      status: 'FAIL',
      details: 'No .claude/ or CLAUDE.md',
      findings: 'content/ must contain either .claude/ directory or CLAUDE.md file',
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

  // 7. Version check (for updates)
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

  // Generate report
  spinner.text = 'Generating audit report...';
  const report = generateReport(results, cwd);
  writeFileSync(join(cwd, 'AUDIT_REPORT.md'), report);

  spinner.succeed('Audit complete');

  // Summary
  const allPassed = results.manifest.status === 'PASS' &&
    results.requiredFiles.status === 'PASS' &&
    results.contentStructure.status === 'PASS' &&
    results.fileSize.status !== 'FAIL' &&
    results.secrets.status === 'PASS' &&
    results.versionCheck.status === 'PASS';

  console.log('\n' + chalk.bold('Audit Summary:'));
  console.log('');

  const icon = (status: string) => {
    if (status === 'PASS') return chalk.green('✓');
    if (status === 'WARNING') return chalk.yellow('⚠');
    return chalk.red('✗');
  };

  console.log(`  ${icon(results.manifest.status)} Manifest: ${results.manifest.details}`);
  console.log(`  ${icon(results.requiredFiles.status)} Required Files: ${results.requiredFiles.details}`);
  console.log(`  ${icon(results.contentStructure.status)} Content Structure: ${results.contentStructure.details}`);
  console.log(`  ${icon(results.fileSize.status)} File Sizes: ${results.fileSize.details}`);
  console.log(`  ${icon(results.binary.status)} Binary Files: ${results.binary.details}`);
  console.log(`  ${icon(results.secrets.status)} Secrets: ${results.secrets.details}`);
  console.log(`  ${icon(results.versionCheck.status)} Version: ${results.versionCheck.details}`);

  console.log('');

  if (allPassed) {
    console.log(chalk.green('✓ READY FOR SUBMISSION'));
    console.log(chalk.gray('\nGenerated: AUDIT_REPORT.md'));
    console.log(chalk.cyan('\nNext: npx skillsets submit'));
  } else {
    console.log(chalk.red('✗ NOT READY - Fix issues above'));
    console.log(chalk.gray('\nGenerated: AUDIT_REPORT.md'));
    console.log(chalk.cyan('\nRe-run after fixes: npx skillsets audit'));
  }
}
