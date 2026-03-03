# list.ts

## Purpose
Fetches all skillsets from the registry and displays them in a sortable, filterable table. Merges live star/download counts from the API with the build-time search index.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `list` | function | Display all skillsets with optional sort, limit, and JSON output |

## Dependencies
- Internal: `lib/api.ts` (fetchSearchIndex, fetchStats, mergeStats)
- External: `chalk` (terminal colors), `ora` (spinner)

## Integration Points
- Used by: `index.ts` (CLI entry point)

## Key Logic
Fetches index and live stats in parallel (`Promise.all`), merges them, sorts by `name`/`stars`/`downloads`, optionally limits count, then renders a fixed-width table. Internal `padEnd` and `truncate` helpers format columns without wrapping. JSON output bypasses the table and emits the merged array directly.
