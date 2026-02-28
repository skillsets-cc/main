# constants.ts

## Purpose
Centralized configuration constants for the CLI — URLs, cache TTLs, and filesystem paths. Single source of truth for all hardcoded values.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `CDN_BASE_URL` | const | `https://skillsets.cc` — CDN host |
| `SEARCH_INDEX_URL` | const | `${CDN_BASE_URL}/search-index.json` |
| `STATS_URL` | const | `${CDN_BASE_URL}/api/stats/counts` |
| `DOWNLOADS_URL` | const | `${CDN_BASE_URL}/api/downloads` |
| `REGISTRY_REPO` | const | `skillsets-cc/main` — GitHub repository |
| `GITHUB_RAW_BASE` | const | `https://raw.githubusercontent.com/${REGISTRY_REPO}/main` |
| `CACHE_TTL_MS` | const | `3600000` (1 hour) — search index cache duration |
| `STATS_CACHE_TTL_MS` | const | `60000` (1 minute) — stats cache duration |
| `DEFAULT_SEARCH_LIMIT` | const | `10` — default search result count |
| `BACKUP_DIR_NAME` | const | `.claude.backup` — backup directory name |

## Dependencies
- Internal: None
- External: None

## Integration Points
- Used by: `lib/api`, `lib/filesystem`, `commands/search`, `commands/install`, `commands/list`, `commands/submit`
- Emits/Consumes: None
