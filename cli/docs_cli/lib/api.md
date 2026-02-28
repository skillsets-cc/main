# api.ts

## Purpose
Fetches and caches the search index and live stats from skillsets.cc CDN and API. Provides indexed skillset discovery and star/download merging for CLI display commands.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `fetchSearchIndex` | function | Get search index with 1-hour in-process cache → `Promise<SearchIndex>` |
| `fetchSkillsetMetadata` | function | Look up a single skillset by ID → `Promise<SearchIndexEntry \| undefined>` |
| `fetchStats` | function | Get live star/download counts with 1-minute cache, non-throwing → `Promise<StatsResponse>` |
| `mergeStats` | function | Overlay live stats onto skillset entries → `SearchIndexEntry[]` |

## Dependencies
- Internal: `types/index`, `lib/constants`
- External: Native `fetch`

## Integration Points
- Used by: `commands/list`, `commands/search`, `commands/install`, `commands/audit`, `commands/submit`, `lib/checksum`
- Emits/Consumes: None

## Key Logic
Module-level cache variables (`cachedIndex`, `cachedStats`) persist for the process lifetime. Index fetch errors propagate to the caller; stats fetch errors return an empty `{ stars: {}, downloads: {} }` object so display commands degrade gracefully. `mergeStats` uses the index-stored `stars` as fallback when live stats are unavailable.
