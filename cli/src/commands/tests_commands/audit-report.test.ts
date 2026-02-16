import { describe, it, expect } from 'vitest';
import {
  type AuditResults,
  isAuditPassing, hasWarnings, generateReport,
} from '../audit-report.js';

function makeResults(overrides: Partial<AuditResults> = {}): AuditResults {
  return {
    manifest: { status: 'PASS', details: 'ok' },
    requiredFiles: { status: 'PASS', details: 'ok' },
    contentStructure: { status: 'PASS', details: 'ok' },
    fileSize: { status: 'PASS', details: 'ok' },
    binary: { status: 'PASS', details: 'ok' },
    secrets: { status: 'PASS', details: 'ok' },
    versionCheck: { status: 'PASS', details: 'ok' },
    readmeLinks: { status: 'PASS', details: 'ok' },
    mcpServers: { status: 'PASS', details: 'ok' },
    runtimeDeps: { status: 'PASS', details: 'ok' },
    isUpdate: false,
    files: [],
    largeFiles: [],
    binaryFiles: [],
    secretsFound: [],
    relativeLinks: [],
    ...overrides,
  };
}

describe('isAuditPassing', () => {
  it('returns true when all checks pass', () => {
    expect(isAuditPassing(makeResults(), false)).toBe(true);
  });

  it('returns true when secrets are WARNING (non-blocking)', () => {
    const results = makeResults({
      secrets: { status: 'WARNING', details: '2 potential secret(s)' },
    });
    expect(isAuditPassing(results, false)).toBe(true);
  });

  it('returns false when a required check fails', () => {
    const results = makeResults({
      manifest: { status: 'FAIL', details: 'invalid' },
    });
    expect(isAuditPassing(results, false)).toBe(false);
  });

  it('returns false when secrets are FAIL', () => {
    const results = makeResults({
      secrets: { status: 'FAIL', details: 'blocked' },
    });
    expect(isAuditPassing(results, false)).toBe(false);
  });
});

describe('hasWarnings', () => {
  it('returns false when all checks pass', () => {
    expect(hasWarnings(makeResults())).toBe(false);
  });

  it('returns true when secrets have warnings', () => {
    const results = makeResults({
      secrets: { status: 'WARNING', details: '1 potential secret(s)' },
    });
    expect(hasWarnings(results)).toBe(true);
  });

  it('returns true when any check has warnings', () => {
    const results = makeResults({
      binary: { status: 'WARNING', details: '1 binary file(s)' },
    });
    expect(hasWarnings(results)).toBe(true);
  });

  it('returns false when checks are only PASS or FAIL', () => {
    const results = makeResults({
      manifest: { status: 'FAIL', details: 'invalid' },
    });
    expect(hasWarnings(results)).toBe(false);
  });
});

describe('generateReport', () => {
  it('produces clean READY FOR SUBMISSION with no warnings', () => {
    const report = generateReport(makeResults());
    expect(report).toContain('✓ READY FOR SUBMISSION');
    expect(report).not.toContain('warnings require review');
  });

  it('produces warning verdict when passing with warnings', () => {
    const results = makeResults({
      secrets: { status: 'WARNING', details: '1 potential secret(s)' },
      secretsFound: [{ file: 'config.ts', line: 5, pattern: 'Generic Secret Assignment' }],
    });
    const report = generateReport(results);
    expect(report).toContain('⚠ READY FOR SUBMISSION — warnings require review');
    expect(report).toContain('/contribute');
    expect(report).not.toContain('✓ READY FOR SUBMISSION');
  });

  it('produces NOT READY when checks fail', () => {
    const results = makeResults({
      manifest: { status: 'FAIL', details: 'invalid' },
    });
    const report = generateReport(results);
    expect(report).toContain('NOT READY');
    expect(report).not.toContain('warnings require review');
  });

  it('produces NOT READY even when warnings also present', () => {
    const results = makeResults({
      manifest: { status: 'FAIL', details: 'invalid' },
      secrets: { status: 'WARNING', details: '1 potential secret(s)' },
    });
    const report = generateReport(results);
    expect(report).toContain('NOT READY');
    expect(report).not.toContain('warnings require review');
  });
});
