# audit.ts

## Overview
**Purpose**: Tier 1 structural validation of skillset submissions. Validates manifest schema, required files, content structure, file sizes, and secrets. Detects updates vs new submissions and validates version bumps.

**Three-Phase Audit Flow**:
1. `npx skillsets audit` — Structural validation; MCP shows as "pending qualitative review" (non-gating)
2. `/audit-skill` — Discovers MCP servers, populates `mcp_servers` in manifest, qualitative Opus review
3. `npx skillsets audit --check` — CI re-validates everything including MCP consistency (gating); does not write AUDIT_REPORT.md

**`--check` flag**: Validates without writing AUDIT_REPORT.md. MCP validation becomes gating (FAIL instead of WARNING). Exits with code 1 on failure. Used by CI.

## Dependencies
- External: `chalk`, `ora`, `js-yaml`, `fs`
- Internal: `../lib/api.js` (`fetchSkillsetMetadata`), `../lib/versions.js` (`compareVersions`), `../lib/validate-mcp.js` (`validateMcpServers`)

## Key Components

### Functions
| Function | Purpose | Inputs → Output |
|----------|---------|-----------------|
| `audit` | Run all validation checks | `options?: {check?: boolean}` → `void` |
| `validateManifest` | Check skillset.yaml schema | `cwd` → `{valid, errors, data}` |
| `getAllFiles` | Recursive file listing | `dir` → `{path, size}[]` |
| `isBinaryFile` | Detect binary content | `path` → `boolean` |
| `scanForSecrets` | Find leaked credentials | `dir` → `{file, line, pattern}[]` |
| `scanReadmeLinks` | Check README for relative links | `cwd` → `{line, link}[]` |
| `generateReport` | Create markdown report | `results` → `string` |

### Validation Checks
| Check | Status | Criteria |
|-------|--------|----------|
| Manifest | PASS/FAIL | Schema compliance |
| Required Files | PASS/FAIL | skillset.yaml, README.md, content/ |
| Content Structure | PASS/FAIL | Has both .claude/ and CLAUDE.md |
| File Size | PASS/WARNING | Files under 1MB |
| Binary Detection | PASS/WARNING | No binary files |
| Secret Detection | PASS/FAIL | No API keys/tokens |
| README Links | PASS/FAIL | No relative links to content/.claude/ |
| Version Check | PASS/FAIL | New submission or version > existing |
| MCP Servers | PASS/WARNING/FAIL | Bidirectional content↔manifest match (WARNING in normal mode, FAIL in `--check` mode) |

### Secret Patterns
High-confidence patterns only (generic `password`/`token`/`secret` matchers removed — the `/audit-skill` handles qualitative secret review):
- AWS Key: `AKIA[0-9A-Z]{16}`
- GitHub Token: `ghp_[a-zA-Z0-9]{36}`
- OpenAI Key: `sk-[a-zA-Z0-9]{48}`
- Anthropic Key: `sk-ant-[a-zA-Z0-9_-]{20,}`

## Data Flow
```
audit() → validateManifest() → Check files → Scan secrets → Check README links → Check registry → validateMcpServers() → generateReport()
```

## Integration Points
- Called by: `index.ts`
- Calls: `fetchSkillsetMetadata` (update detection), `validateMcpServers` (MCP check)

## Output

**Normal mode**: Generates `AUDIT_REPORT.md` with:
- Validation summary table
- Detailed findings
- File inventory
- Submission status (new or update with version change)

**`--check` mode**: Validates without writing any files. Exits with code 1 on failure. Preserves existing `AUDIT_REPORT.md` (including qualitative review appended by `/audit-skill`).

### Update Detection
The report indicates submission type:
- **New submission**: Skillset not found in registry
- **Update**: Shows version change (e.g., "Update: 0.9.0 → 1.0.0")

## Testing
- Test file: `tests_commands/audit.test.ts`
- Key tests: Valid structure, missing files, schema errors, secrets, version validation, MCP validation (no MCP, matching, content-only, manifest-only, Docker end-to-end)
