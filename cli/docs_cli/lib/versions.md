# versions.ts

## Purpose
Semver comparison utility for version ordering and bump detection.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `compareVersions` | function | Compare two semver strings; returns -1, 0, or 1 (`a, b: string` → `number`) |

## Dependencies
- Internal: None
- External: None

## Integration Points
- Used by: `commands/audit` (version bump detection), `commands/submit` (update PR title)
- Emits/Consumes: None

## Key Logic
Splits both versions on `.` and compares major, minor, patch numerically. Missing parts are treated as 0 (`"1.0"` equals `"1.0.0"`). Returns -1 (a < b), 0 (equal), 1 (a > b).
