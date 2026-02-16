# audit-report.ts

## Purpose
Shared utilities for generating audit reports. Provides types, formatters, and markdown generation for `npx skillsets audit` output. Used by `audit.ts` to produce `AUDIT_REPORT.md`.

## Public API

| Export | Type | Description |
|--------|------|-------------|
| `AuditStatus` | type alias | `'PASS' \| 'FAIL' \| 'WARNING'` |
| `AuditResult` | interface | Single check result (status, details, findings) |
| `AuditResults` | interface | Complete audit results for all checks |
| `isAuditPassing` | function | Determines if submission is ready (boolean) |
| `colorIcon` | function | Returns colored icon for terminal output (✓/⚠/✗) |
| `generateReport` | function | Generates markdown audit report from results |

## Dependencies

- **External**: chalk (terminal colors)
- **Internal**: None (shared utilities)

## Integration Points

- **Used by**: `commands/audit.ts` (generates `AUDIT_REPORT.md` after validation)
- **Consumed by**: Not consumed by other modules (terminal output only)

## Key Logic

**Report Structure**: 10-section markdown document
1. Header (timestamp, skillset metadata, submission type)
2. Validation Summary table (10 checks)
3. Detailed findings for each check
4. File inventory with sizes
5. Submission status (ready/not ready)
6. Next steps (submit or fix issues)

**Pass Criteria** (`isAuditPassing`):
- Manifest, required files, content structure, secrets, README links, version check must all be `PASS`
- File size must not be `FAIL` (warnings allowed)
- MCP servers and runtime deps must be `PASS` only if `enforceMcp` is true

**Update Detection**: Report header shows `New submission` vs `Update (v1.0.0 → v1.1.0)` based on `results.isUpdate`
