# install.ts

## Overview
**Purpose**: Install skillset to current directory using degit with conflict detection and checksum verification

## Dependencies
- External: `degit`, `chalk`, `ora`
- Internal: `lib/filesystem`, `lib/checksum`, `lib/constants`

## Key Components

### Functions
| Function | Purpose | Inputs → Output |
|----------|---------|-----------------|
| `install` | Download and verify skillset | `skillsetId, InstallOptions` → `void` |

### Options
| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `force` | `boolean` | `false` | Overwrite existing |
| `backup` | `boolean` | `false` | Backup before install |

## Data Flow
```
install(id) → detectConflicts() → backupFiles() → degit.clone() → verifyChecksums()
```

## Integration Points
- Called by: `index.ts`
- Calls: `lib/filesystem`, `lib/checksum`

## Critical Paths
**Primary Flow**: Conflict check → Optional backup → degit download → Checksum verify

**Fallbacks**:
- Conflict: Prompt for --force or --backup
- Checksum fail: Suggest --force reinstall

## Error Handling
- Conflicts: Aborts with helpful flags
- Checksum mismatch: Exit 1 with details

## Testing
- Test file: N/A (requires network/filesystem mocking)
