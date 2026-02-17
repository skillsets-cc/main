import chalk from 'chalk';

export type AuditStatus = 'PASS' | 'FAIL' | 'WARNING';

export interface AuditResult {
  status: AuditStatus;
  details: string;
  findings?: string;
}

export interface AuditResults {
  manifest: AuditResult;
  requiredFiles: AuditResult;
  contentStructure: AuditResult;
  fileSize: AuditResult;
  binary: AuditResult;
  secrets: AuditResult;
  versionCheck: AuditResult;
  readmeLinks: AuditResult;
  mcpServers: AuditResult;
  runtimeDeps: AuditResult;
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isAuditPassing(results: AuditResults, enforceMcp: boolean): boolean {
  return results.manifest.status === 'PASS' &&
    results.requiredFiles.status === 'PASS' &&
    results.contentStructure.status === 'PASS' &&
    results.fileSize.status !== 'FAIL' &&
    results.secrets.status !== 'FAIL' &&
    results.readmeLinks.status === 'PASS' &&
    results.versionCheck.status === 'PASS' &&
    (enforceMcp ? results.mcpServers.status === 'PASS' : true) &&
    (enforceMcp ? results.runtimeDeps.status === 'PASS' : true);
}

function statusIcon(status: AuditStatus): string {
  if (status === 'PASS') return '✓ PASS';
  if (status === 'WARNING') return '⚠ WARNING';
  return '✗ FAIL';
}

export function colorIcon(status: AuditStatus): string {
  if (status === 'PASS') return chalk.green('✓');
  if (status === 'WARNING') return chalk.yellow('⚠');
  return chalk.red('✗');
}

export function hasWarnings(results: AuditResults): boolean {
  const checks = [
    results.manifest, results.requiredFiles, results.contentStructure,
    results.fileSize, results.binary, results.secrets, results.readmeLinks,
    results.versionCheck, results.mcpServers, results.runtimeDeps,
  ];
  return checks.some(c => c.status === 'WARNING');
}

export function generateReport(results: AuditResults, enforceMcp: boolean = false): string {
  const timestamp = new Date().toISOString();
  const allPassed = isAuditPassing(results, enforceMcp);
  const warnings = hasWarnings(results);

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
| Runtime Dependencies | ${statusIcon(results.runtimeDeps.status)} | ${results.runtimeDeps.details} |

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

### 9. Runtime Dependencies

${results.runtimeDeps.findings || 'Runtime dependency declarations are consistent between content and manifest.'}

---

## File Inventory

| File | Size |
|------|------|
${results.files.map(f => `| ${f.path} | ${formatSize(f.size)} |`).join('\n')}

---

## Submission Status

${!allPassed
    ? '**✗ NOT READY - Please fix the issues above**\n\nPlease address the failed checks before submitting.'
    : warnings
      ? '**⚠ READY FOR SUBMISSION — warnings require review**\n\nStructural checks passed but warnings were found. Review each warning with the `/skillset:contribute` wizard before submitting.'
      : '**✓ READY FOR SUBMISSION**\n\nAll validation checks passed. You can now submit this skillset to the registry.'}

---

## Next Steps

${!allPassed
    ? `1. Fix the issues flagged above
2. Re-run: \`npx skillsets audit\`
3. Repeat until all checks pass`
    : warnings
      ? `1. Run \`/skillset:contribute\` to review warnings with the wizard
2. Confirm or resolve each warning
3. Run: \`npx skillsets submit\``
      : `1. Review this audit report
2. Ensure PROOF.md has adequate production evidence
3. Run: \`npx skillsets submit\``}

---

**Generated by:** \`npx skillsets audit\`
**Schema Version:** 1.0
**Report Date:** ${timestamp}
`;

  return report;
}
