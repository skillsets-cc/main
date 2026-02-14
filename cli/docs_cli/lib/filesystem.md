# filesystem.ts

## Overview
**Purpose**: File conflict detection, backup operations, and skillset detection

## Dependencies
- External: `fs/promises`, `path`, `js-yaml`
- Internal: `types/index`, `lib/constants`

## Key Components

### Functions
| Function | Purpose | Inputs → Output |
|----------|---------|-----------------|
| `detectConflicts` | Find existing files | `dir` → `Promise<string[]>` |
| `backupFiles` | Copy files to backup | `files, dir` → `Promise<void>` |
| `detectSkillset` | Parse skillset.yaml ID | `dir` → `Promise<string \| null>` |

### Internal Functions
| Function | Purpose | Inputs → Output |
|----------|---------|-----------------|
| `copyDirectory` | Recursive dir copy | `src, dest` → `Promise<void>` |

### Constants
| Constant | Value | Purpose |
|----------|-------|---------|
| `CONFLICT_CHECK_PATHS` | `['.claude/', 'CLAUDE.md', 'skillset.yaml']` | Files to check |
| `BACKUP_DIR_NAME` | `.claude.backup` (imported from `constants.ts`) | Backup directory |

## Data Flow
```
detectConflicts() → Check each path → Return conflicts
backupFiles() → Create backup dir → Copy each file
detectSkillset() → Read skillset.yaml → Parse author/name
```

## Integration Points
- Called by: `commands/install`
- Calls: None (filesystem only)

## Error Handling
- Missing file during conflict check: No conflict (expected)
- Missing skillset.yaml: Returns null

## Testing
- Test file: `tests_lib/filesystem.test.ts`
- Key tests: Conflict detection, backup creation, skillset detection
