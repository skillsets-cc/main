# submit.ts

## Overview
**Purpose**: Submit skillset to registry via GitHub PR using gh CLI. Automatically detects whether this is a new submission or an update to an existing skillset.

## Dependencies
- External: `chalk`, `ora`, `js-yaml`, `child_process`, `fs`
- Internal: `../lib/api.js` (`fetchSkillsetMetadata`)

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
| `compareVersions` | Compare semver versions | `a, b` → `-1 \| 0 \| 1` |

### Pre-flight Checks
| Check | Failure Action |
|-------|----------------|
| gh CLI installed | Exit with install link |
| gh authenticated | Exit with `gh auth login` |
| skillset.yaml valid | Exit with `npx skillsets init` |
| Audit report passing | Exit with `npx skillsets audit` |
| Required files present | Exit with missing file |
| Version bump (updates) | Exit if version ≤ existing |

### Update Detection
The command fetches registry metadata to determine submission type:
- **New submission**: Skillset not found in registry
- **Update**: Skillset exists; version must be greater than published version

## Data Flow
```
submit() → Pre-flight checks → Check registry → Fork repo → Clone → Create branch → Copy files → Commit → Push → Create PR
```

## Integration Points
- Called by: `index.ts`
- Calls: gh CLI via `execSync`, `fetchSkillsetMetadata` for update detection

## Critical Paths
**Primary Flow**:
1. Run pre-flight checks
2. Check registry for existing skillset
3. Validate version bump (if update)
4. Fork `skillsets-cc/main` (if needed)
5. Clone to temp directory
6. Create branch `submit/{author}/{name}`
7. Copy skillset files
8. Commit with appropriate message ("Add" vs "Update")
9. Push and create PR with checklist

**Fallback**: Manual instructions on failure

## PR Templates
- **New submission**: "Add @author/name" with new skillset checklist
- **Update**: "Update @author/name to vX.Y.Z" with version change details

## Constants
| Constant | Value |
|----------|-------|
| `REGISTRY_REPO` | `skillsets-cc/main` |

## Testing
- Test file: `__tests__/submit.test.ts`
- Key tests: Pre-flight checks, PR creation, version validation for updates
