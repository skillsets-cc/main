# api.ts

## Overview
**Purpose**: Fetch and cache search index from CDN

## Dependencies
- External: None (uses native fetch)
- Internal: `types/index`, `lib/constants`

## Key Components

### Functions
| Function | Purpose | Inputs → Output |
|----------|---------|-----------------|
| `fetchSearchIndex` | Get cached or fresh index | - → `Promise<SearchIndex>` |
| `fetchSkillsetMetadata` | Find skillset by ID | `skillsetId` → `Promise<SearchIndexEntry \| undefined>` |

### Module State
| Variable | Type | Purpose |
|----------|------|---------|
| `cachedIndex` | `SearchIndex \| null` | Cached index data |
| `cacheTime` | `number` | Timestamp of cache |

## Data Flow
```
fetchSearchIndex() → Check cache → If stale: fetch CDN → Update cache → Return
```

## Integration Points
- Called by: `commands/list`, `commands/search`, `commands/install`, `commands/audit`, `commands/submit`, `lib/checksum`
- Calls: CDN endpoint

## Configuration
- `SEARCH_INDEX_URL`: `https://skillsets.cc/search-index.json`
- `CACHE_TTL_MS`: 1 hour (3600000ms)

## Error Handling
- Non-200 response: Throws with status text
- Network error: Propagates to caller

## Testing
- Test file: N/A (mocked in command tests)
