# constants.ts

## Purpose
Centralized configuration constants for the CLI — URLs, cache TTLs, and filesystem paths. Single source of truth for all hardcoded values.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `CDN_BASE_URL` | const | `https://skillsets.cc` — CDN host |
| `SEARCH_INDEX_URL` | const | `${CDN_BASE_URL}/search-index.json` |
| `DOWNLOADS_START_URL` | const | `${CDN_BASE_URL}/api/downloads/start` — request download nonce |
| `DOWNLOADS_COMPLETE_URL` | const | `${CDN_BASE_URL}/api/downloads/complete` — confirm download with nonce |
| `REGISTRY_REPO` | const | `skillsets-cc/main` — GitHub repository |
| `GITHUB_BROWSE_BASE` | const | `https://github.com/${REGISTRY_REPO}/tree/main/skillsets` — human-browsable skillset URL base |
| `CACHE_TTL_MS` | const | `3600000` (1 hour) — search index cache duration |
| `BACKUP_DIR_NAME` | const | `.claude.backup` — backup directory name |

## Dependencies
- Internal: None
- External: None

## Integration Points
- Used by: `lib/api`, `lib/filesystem`, `commands/install`, `commands/submit`
- Emits/Consumes: None
