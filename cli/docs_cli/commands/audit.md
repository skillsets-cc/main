# audit.ts

## Purpose
Tier-1 structural validation of skillset submissions. Runs 12 checks covering manifest schema, required files, content structure, file sizes, binary detection, secret scanning, README links, version bumps, MCP servers, runtime dependencies, install notes, and CC extensions. Writes `AUDIT_REPORT.md` in normal mode; exits non-zero in `--check` (CI) mode without writing any files.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `audit` | function | Run all validation checks and generate/validate audit report |

## Dependencies
- Internal: `lib/api.ts` (fetchSkillsetMetadata), `lib/versions.ts` (compareVersions), `lib/validate-mcp.ts` (validateMcpServers), `lib/validate-deps.ts` (validateRuntimeDeps), `./audit-report.ts` (types, isAuditPassing, hasWarnings, colorIcon, generateReport)
- External: `chalk`, `ora`, `js-yaml`, `fs`, `path`

## Integration Points
- Used by: `index.ts` (CLI entry point)
- Used by: CI via `--check` flag (exits 1 on failure, preserves existing `AUDIT_REPORT.md`)

## Key Logic
**12 checks, three result tiers**:
- Hard FAIL: manifest schema, required files, content structure, README relative links, version bump, install notes
- WARNING only: file sizes >1MB, binary files, secret patterns (false positives expected in example content)
- Qualitative (WARNING in normal mode, FAIL in `--check`): MCP servers, runtime deps, CC extensions

**`--check` mode**: Designed for CI after `/audit-skill` has populated the manifest. MCP/deps/CC checks become gating FAILs. Does not write `AUDIT_REPORT.md` so the qualitative review appended by `/audit-skill` is preserved.

**Secret scanning**: 10 patterns (AWS, GitHub, OpenAI, Anthropic, Slack, Stripe keys; PEM headers; connection strings; bearer tokens; generic `password/secret = "value"` assignments). Regex `lastIndex` reset after each line to avoid stateful false negatives.
