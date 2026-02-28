# checksum.ts

## Purpose
SHA-256 checksum computation and post-install verification against the registry. Ensures installed skillset files match the registry index, accounting for degit's content folder extraction behavior.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `computeFileChecksum` | function | SHA-256 hash a file (`filePath` → `Promise<string>`) |
| `verifyChecksums` | function | Compare installed files against registry checksums (`skillsetId, dir` → `Promise<{valid, mismatches}>`) |

## Dependencies
- Internal: `lib/api` (fetchSkillsetMetadata)
- External: `crypto`, `fs/promises`, `path`

## Integration Points
- Used by: `commands/install`
- Emits/Consumes: None

## Key Logic
The registry stores paths as `content/CLAUDE.md` but degit extracts the content folder's contents directly to the target directory. `verifyChecksums` strips the `content/` prefix and only checks `content/*` files — skipping root-level files like `skillset.yaml` and `AUDIT_REPORT.md`. Checksums in the registry may include an algorithm prefix (`sha256:abc123`); `stripChecksumPrefix` strips it before comparison. Missing files are reported as `actual: 'MISSING'` rather than throwing.
