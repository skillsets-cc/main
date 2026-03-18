# install.ts

## Purpose
Installs a skillset to the current directory using degit. Handles conflict detection, optional backup, MCP server and runtime dependency consent prompts, temp-dir checksum verification, and download tracking.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `install` | function | Install skillset by ID with conflict/consent/checksum flow |
| `InstallOptions` | interface | `{ force?, backup?, acceptMcp?, acceptDeps? }` — all optional flags |

## Dependencies
- Internal: `lib/filesystem.ts` (detectConflicts, backupFiles), `lib/checksum.ts` (verifyChecksums), `lib/api.ts` (fetchSkillsetMetadata), `lib/constants.ts` (REGISTRY_REPO, DOWNLOADS_START_URL, DOWNLOADS_COMPLETE_URL, GITHUB_BROWSE_BASE)
- External: `degit`, `chalk`, `ora`, `@inquirer/prompts` (confirm), `fs/promises`, `os`, `path`

## Integration Points
- Used by: `index.ts` (CLI entry point)

## Key Logic
**Install flow**: Validate ID format → detect conflicts → optional backup → fetch metadata → MCP consent → runtime deps consent → request download nonce → degit clone to temp dir → verify checksums → strip redirect README → copy verified content to CWD → complete download tracking (fire-and-forget).

**Consent gating**: MCP servers and runtime dependencies require explicit confirmation (`--accept-mcp`, `--accept-deps`) in non-TTY environments. `--force`/`--backup` only govern file conflicts, not consent.

**Checksum safety**: Content is cloned to a temp directory, checksums are verified against the search index, and only then copied to CWD. Temp dir is always cleaned up on both success and error.

**Two-phase download tracking**: A nonce is requested from `DOWNLOADS_START_URL` before degit clone; on success the nonce is sent to `DOWNLOADS_COMPLETE_URL`. Both calls are best-effort (silent fail). A 403 `frozen` response on start prints a suspension warning but does not block installation.

**README stripping**: If the extracted content contains a `README_*.md` file alongside a generic `README.md`, the generic `README.md` is removed to avoid clobbering the user's existing project README.
