# submit.ts

## Overview
**Purpose**: Submit skillset to registry via GitHub PR using gh CLI

## Dependencies
- External: `chalk`, `ora`, `js-yaml`, `child_process`, `fs`
- Internal: None

## Key Components

### Functions
| Function | Purpose | Inputs → Output |
|----------|---------|-----------------|
| `submit` | Execute PR submission flow | - → `void` |
| `checkGhCli` | Verify gh installed | - → `boolean` |
| `checkGhAuth` | Verify gh authenticated | - → `boolean` |
| `getGhUsername` | Get authenticated user | - → `string \| null` |
| `parseSkillsetYaml` | Extract skillset metadata | `cwd` → `{name, author, version}` |
| `checkAuditReport` | Verify passing audit | `cwd` → `{exists, passing}` |

### Pre-flight Checks
| Check | Failure Action |
|-------|----------------|
| gh CLI installed | Exit with install link |
| gh authenticated | Exit with `gh auth login` |
| skillset.yaml valid | Exit with `npx skillsets init` |
| Audit report passing | Exit with `npx skillsets audit` |
| Required files present | Exit with missing file |

## Data Flow
```
submit() → Pre-flight checks → Fork repo → Clone → Create branch → Copy files → Commit → Push → Create PR
```

## Integration Points
- Called by: `index.ts`
- Calls: gh CLI via `execSync`

## Critical Paths
**Primary Flow**:
1. Fork `skillsets-cc/main` (if needed)
2. Clone to temp directory
3. Create branch `submit/{author}/{name}`
4. Copy skillset files
5. Commit and push
6. Create PR with checklist

**Fallback**: Manual instructions on failure

## Constants
| Constant | Value |
|----------|-------|
| `REGISTRY_REPO` | `skillsets-cc/main` |

## Testing
- Test file: `__tests__/submit.test.ts`
- Key tests: Pre-flight checks, PR creation (mocked)
