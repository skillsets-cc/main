# audit.ts

## Overview
**Purpose**: Validate skillset structure and generate AUDIT_REPORT.md with pass/fail status

## Dependencies
- External: `chalk`, `ora`, `js-yaml`, `fs`
- Internal: None

## Key Components

### Functions
| Function | Purpose | Inputs → Output |
|----------|---------|-----------------|
| `audit` | Run all validation checks | - → `void` |
| `validateManifest` | Check skillset.yaml schema | `cwd` → `{valid, errors, data}` |
| `getAllFiles` | Recursive file listing | `dir` → `{path, size}[]` |
| `isBinaryFile` | Detect binary content | `path` → `boolean` |
| `scanForSecrets` | Find leaked credentials | `dir` → `{file, line, pattern}[]` |
| `generateReport` | Create markdown report | `results` → `string` |

### Validation Checks
| Check | Status | Criteria |
|-------|--------|----------|
| Manifest | PASS/FAIL | Schema compliance |
| Required Files | PASS/FAIL | skillset.yaml, README.md, content/ |
| Content Structure | PASS/FAIL | Has .claude/ or CLAUDE.md |
| File Size | PASS/WARNING | Files under 1MB |
| Binary Detection | PASS/WARNING | No binary files |
| Secret Detection | PASS/FAIL | No API keys/tokens |

### Secret Patterns
- API Key, Password, Secret, Token
- AWS Key: `AKIA[0-9A-Z]{16}`
- GitHub Token: `ghp_[a-zA-Z0-9]{36}`
- OpenAI Key: `sk-[a-zA-Z0-9]{48}`

## Data Flow
```
audit() → validateManifest() → Check files → Scan secrets → generateReport()
```

## Integration Points
- Called by: `index.ts`
- Calls: None (self-contained)

## Output
Generates `AUDIT_REPORT.md` with:
- Validation summary table
- Detailed findings
- File inventory
- Submission status

## Testing
- Test file: `__tests__/audit.test.ts`
- Key tests: Valid structure, missing files, schema errors, secrets
