# audit.ts

## Overview
**Purpose**: Tier 1 structural validation of skillset submissions. Validates manifest schema, required files, content structure, file sizes, and secrets. Detects updates vs new submissions and validates version bumps.

**Two-Tier Audit Flow**:
1. `npx skillsets audit` — Programmatic structural validation (this file)
2. `/audit-skill` — Qualitative Opus review of all primitives (installed by `init`)

## Dependencies
- External: `chalk`, `ora`, `js-yaml`, `fs`
- Internal: `../lib/api.js` (`fetchSkillsetMetadata`)

## Key Components

### Functions
| Function | Purpose | Inputs → Output |
|----------|---------|-----------------|
| `audit` | Run all validation checks | - → `void` |
| `validateManifest` | Check skillset.yaml schema | `cwd` → `{valid, errors, data}` |
| `getAllFiles` | Recursive file listing | `dir` → `{path, size}[]` |
| `isBinaryFile` | Detect binary content | `path` → `boolean` |
| `scanForSecrets` | Find leaked credentials | `dir` → `{file, line, pattern}[]` |
| `scanReadmeLinks` | Check README for relative links | `cwd` → `{line, link}[]` |
| `generateReport` | Create markdown report | `results` → `string` |
| `compareVersions` | Compare semver versions | `a, b` → `-1 \| 0 \| 1` |

### Validation Checks
| Check | Status | Criteria |
|-------|--------|----------|
| Manifest | PASS/FAIL | Schema compliance |
| Required Files | PASS/FAIL | skillset.yaml, README.md, content/ |
| Content Structure | PASS/FAIL | Has .claude/ or CLAUDE.md |
| File Size | PASS/WARNING | Files under 1MB |
| Binary Detection | PASS/WARNING | No binary files |
| Secret Detection | PASS/FAIL | No API keys/tokens |
| README Links | PASS/FAIL | No relative links to content/.claude/ |
| Version Check | PASS/FAIL | New submission or version > existing |

### Secret Patterns
- API Key, Password, Secret, Token
- AWS Key: `AKIA[0-9A-Z]{16}`
- GitHub Token: `ghp_[a-zA-Z0-9]{36}`
- OpenAI Key: `sk-[a-zA-Z0-9]{48}`

## Data Flow
```
audit() → validateManifest() → Check files → Scan secrets → Check registry → generateReport()
```

## Integration Points
- Called by: `index.ts`
- Calls: `fetchSkillsetMetadata` to detect update vs new submission

## Output
Generates `AUDIT_REPORT.md` with:
- Validation summary table
- Detailed findings
- File inventory
- Submission status (new or update with version change)

### Update Detection
The report indicates submission type:
- **New submission**: Skillset not found in registry
- **Update**: Shows version change (e.g., "Update: 0.9.0 → 1.0.0")

## Testing
- Test file: `__tests__/audit.test.ts`
- Key tests: Valid structure, missing files, schema errors, secrets, version validation
