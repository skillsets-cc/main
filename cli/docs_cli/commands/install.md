# install.ts

## Purpose
Installs a skillset to the current directory using degit. Handles conflict detection, optional backup, MCP server and runtime dependency consent prompts, temp-dir checksum verification, and download tracking.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `install` | function | Install skillset by ID with conflict/consent/checksum flow |

## Dependencies
- Internal: `lib/filesystem.ts` (detectConflicts, backupFiles), `lib/checksum.ts` (verifyChecksums), `lib/api.ts` (fetchSkillsetMetadata), `lib/constants.ts` (REGISTRY_REPO, DOWNLOADS_URL)
- External: `degit`, `chalk`, `ora`, `@inquirer/prompts` (confirm), `fs/promises`, `os`, `path`

## Integration Points
- Used by: `index.ts` (CLI entry point)

## Key Logic
**Install flow**: Validate ID format → detect conflicts → optional backup → fetch metadata → MCP consent → runtime deps consent → degit clone to temp dir → verify checksums → copy verified content to CWD → track download (fire-and-forget).

**Consent gating**: MCP servers and runtime dependencies require explicit confirmation (`--accept-mcp`, `--accept-deps`) in non-TTY environments. `--force`/`--backup` only govern file conflicts, not consent.

**Checksum safety**: Content is cloned to a temp directory, checksums are verified against the search index, and only then copied to CWD. Temp dir is always cleaned up on both success and error.
