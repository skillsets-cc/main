# api.ts

## Overview
**Purpose**: Fetch and cache search index and live stats from CDN and API

## Dependencies
- External: None (uses native fetch)
- Internal: `types/index`, `lib/constants`

## Key Components

### Functions
| Function | Purpose | Inputs → Output |
|----------|---------|-----------------|
| `fetchSearchIndex` | Get cached or fresh index | - → `Promise<SearchIndex>` |
| `fetchSkillsetMetadata` | Find skillset by ID | `skillsetId` → `Promise<SearchIndexEntry \| undefined>` |
| `fetchStats` | Get live stars/downloads | - → `Promise<StatsResponse>` |
| `mergeStats` | Merge live stats into skillsets | `skillsets, stats` → `SearchIndexEntry[]` |

### Module State
| Variable | Type | Purpose |
|----------|------|---------|
| `cachedIndex` | `SearchIndex \| null` | Cached index data |
| `cacheTime` | `number` | Timestamp of cache |
| `cachedStats` | `StatsResponse \| null` | Cached stats data |
| `statsCacheTime` | `number` | Timestamp of stats cache |

## Data Flow
```
fetchSearchIndex() → Check cache → If stale: fetch CDN → Update cache → Return
```

## Integration Points
- Called by: `commands/list`, `commands/search`, `commands/install`, `commands/audit`, `commands/submit`, `lib/checksum`
- Calls: CDN endpoint

## Configuration
- `SEARCH_INDEX_URL`: `https://skillsets.cc/search-index.json`
- `STATS_URL`: `https://skillsets.cc/api/stats`
- `CACHE_TTL_MS`: 1 hour (3600000ms) for index
- `STATS_CACHE_TTL_MS`: 1 minute (60000ms) for stats

## Error Handling
- Index fetch error: Throws with status text
- Stats fetch error: Returns empty stats (non-blocking)
- Network error: Index propagates to caller; stats returns empty

## Testing
- Test file: `__tests__/api.test.ts`
- Key tests: Caching behavior, merge logic, error handling
