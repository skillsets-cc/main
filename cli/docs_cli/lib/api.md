# api.ts

## Purpose
Fetches and caches the search index from skillsets.cc CDN. Provides indexed skillset discovery for CLI commands.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `fetchSearchIndex` | function | Get search index with 1-hour in-process cache → `Promise<SearchIndex>` |
| `fetchSkillsetMetadata` | function | Look up a single skillset by ID → `Promise<SearchIndexEntry \| undefined>` |

## Dependencies
- Internal: `types/index`, `lib/constants`
- External: Native `fetch`

## Integration Points
- Used by: `commands/install`, `commands/audit`, `commands/submit`, `lib/checksum`
- Emits/Consumes: None

## Key Logic
Module-level cache variable (`cachedIndex`) persists for the process lifetime. Index fetch errors propagate to the caller.
