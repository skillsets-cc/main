# search.ts

## Purpose
Fuzzy-searches skillsets by name, description, tags, or author handle using Fuse.js. Optionally pre-filters by tags before running the fuzzy match.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `search` | function | Search skillsets by query string with optional tag filter and result limit |

## Dependencies
- Internal: `lib/api.ts` (fetchSearchIndex, fetchStats, mergeStats), `lib/constants.ts` (DEFAULT_SEARCH_LIMIT)
- External: `fuse.js` (fuzzy search), `chalk` (terminal colors)

## Integration Points
- Used by: `index.ts` (CLI entry point)

## Key Logic
Fetches index and live stats in parallel, applies exact tag filter (if provided), then runs Fuse.js with threshold `0.3` across `name`, `description`, `tags`, and `author.handle` keys. Results beyond `limit` are omitted with a remaining-count hint.
