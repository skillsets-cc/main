# submit.ts

## Purpose
Submits a skillset to the registry by creating a GitHub Pull Request via `gh` CLI. Runs pre-flight checks, detects new vs update submissions, forks/clones the registry, and opens or updates a PR.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `submit` | function | Open a PR to the skillsets registry for the skillset in the current directory |

## Dependencies
- Internal: `lib/api.ts` (fetchSkillsetMetadata), `lib/versions.ts` (compareVersions), `lib/constants.ts` (REGISTRY_REPO)
- External: `chalk`, `ora`, `js-yaml`, `child_process` (execSync, spawnSync), `fs` (existsSync, readFileSync, mkdirSync, cpSync, rmSync), `os` (tmpdir), `path`

## Integration Points
- Used by: `index.ts` (CLI entry point)
- Calls: `gh` CLI commands (auth check, fork, clone, push, pr create/list)

## Key Logic
**Pre-flight checks**: gh CLI installed → authenticated → `skillset.yaml` valid (name/author/version extracted with injection-safe regex) → `AUDIT_REPORT.md` contains `READY FOR SUBMISSION` → required files present → version bump validated (updates only).

**PR flow**: Fork registry (idempotent) → clone to temp dir → create branch `submit/{author}/{name}` → copy files → commit → delete stale fork branch → force-push → check for existing open PR → create new PR or leave existing (already updated by force-push).

**Update vs new**: Detected by calling `fetchSkillsetMetadata`; version must be strictly greater than existing for updates.
