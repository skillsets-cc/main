# filesystem.ts

## Purpose
File conflict detection, backup operations, and installed skillset detection. Guards against overwriting existing `.claude/`, `CLAUDE.md`, or `skillset.yaml` before installation, copies conflicting files to `.claude.backup/`, and reads `skillset.yaml` to identify which skillset is installed.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `detectConflicts` | function | Check for existing files that would be overwritten (`dir` → `Promise<string[]>`) |
| `backupFiles` | function | Copy conflicting files to `.claude.backup/` (`files, dir` → `Promise<void>`) |
| `detectSkillset` | function | Read `skillset.yaml` to return `handle/name` ID (`dir` → `Promise<string \| null>`) |

## Dependencies
- Internal: `lib/constants` (BACKUP_DIR_NAME), `types/index` (Skillset)
- External: `fs/promises`, `path`, `js-yaml`

## Integration Points
- Used by: `commands/install`
- Emits/Consumes: None

## Key Logic
Only three paths are checked for conflicts: `.claude/`, `CLAUDE.md`, `skillset.yaml`. Backup handles both files and directories recursively via an internal `copyDirectory` helper. `detectSkillset` returns `null` on any error (missing or malformed `skillset.yaml`).
