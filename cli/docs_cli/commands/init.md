# init.ts

## Purpose
Interactive scaffold for a new skillset submission. Validates GitHub authentication, looks up an active reservation by GitHub user ID, collects skillset metadata, auto-detects existing project files, and generates the required directory structure.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `init` | function | Scaffold skillset submission structure in the current directory |

## Dependencies
- Internal: `lib/constants.ts` (CDN_BASE_URL)
- External: `chalk`, `ora`, `@inquirer/prompts` (input, confirm, checkbox), `fs`, `path`, `child_process` (execSync)

## Integration Points
- Used by: `index.ts` (CLI entry point)
- Calls: `gh auth status`, `gh api user` (verified identity), `GET /api/reservations/lookup` (reservation by GitHub ID)

## Key Logic
**Reservation gating**: Fetches `gh api user` to get the authenticated GitHub user ID, then calls `/api/reservations/lookup?githubId={id}`. Exits if no active reservation. Auto-populates `batch_id` in the generated `skillset.yaml`.

**Auto-detection**: Scans CWD for core files (`CLAUDE.md`, `.claude/`, `QUICKSTART_<NAME>.md`, `INSTALL_NOTES_<NAME>.md`, `.mcp.json`) and top-level directories containing dependency/config marker files (`package.json`, `Dockerfile`, `go.mod`, etc.) as support stacks. User selects via checkbox which to copy to `content/`. Lock files, `node_modules/`, and `.env` are excluded from directory copies.

**Generated structure**: `skillset.yaml` (manifest with batch_id), `content/README_<NAME>.md`, `content/QUICKSTART_<NAME>.md`, `content/INSTALL_NOTES_<NAME>.md`, `content/LICENSE` (only if not already detected). The README, QUICKSTART, and INSTALL_NOTES are named with the `_<NAME>` suffix (e.g., `QUICKSTART_VALENCE.md`) to avoid clobbering the user's own files on install. LICENSE is scaffolded empty and must be populated before the audit passes.
