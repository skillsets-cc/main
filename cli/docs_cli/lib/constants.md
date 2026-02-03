# constants.ts

## Overview
**Purpose**: Centralized configuration constants for CLI

## Dependencies
- External: None
- Internal: None

## Key Components

### Constants
| Constant | Value | Purpose |
|----------|-------|---------|
| `CDN_BASE_URL` | `https://skillsets.cc` | CDN host |
| `SEARCH_INDEX_URL` | `${CDN_BASE_URL}/search-index.json` | Index endpoint |
| `STATS_URL` | `${CDN_BASE_URL}/api/stats/counts` | Live stats endpoint |
| `DOWNLOADS_URL` | `${CDN_BASE_URL}/api/downloads` | Download tracking endpoint |
| `REGISTRY_REPO` | `skillsets-cc/main` | GitHub repository |
| `CACHE_TTL_MS` | `3600000` (1 hour) | Index cache duration |
| `DEFAULT_SEARCH_LIMIT` | `10` | Default search results |
| `BACKUP_DIR_NAME` | `.claude.backup` | Backup directory name |

## Integration Points
- Used by: `lib/api`, `lib/filesystem`, `commands/search`, `commands/install`

## Notes
- All URLs use HTTPS
- Cache TTL balances freshness vs network efficiency
