# search.ts

## Overview
**Purpose**: Fuzzy search skillsets by name, description, or tags using Fuse.js

## Dependencies
- External: `fuse.js`, `chalk`
- Internal: `lib/api`, `lib/constants`

## Key Components

### Functions
| Function | Purpose | Inputs → Output |
|----------|---------|-----------------|
| `search` | Execute fuzzy search | `query, SearchOptions` → `void` |

### Options
| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `tags` | `string[]` | - | Filter by tags |
| `limit` | `string` | `10` | Max results |

## Data Flow
```
search(query) → fetchSearchIndex() + fetchStats() → mergeStats() → Filter by tags → Fuse.search() → Display
```

## Integration Points
- Called by: `index.ts`
- Calls: `lib/api.fetchSearchIndex()`, `lib/api.fetchStats()`, `lib/api.mergeStats()`

## Critical Paths
**Search Flow**: Query → CDN index → Tag filter → Fuse fuzzy match → Ranked results

## Configuration
- Fuse threshold: `0.3` (lower = stricter matching)
- Search keys: `name`, `description`, `tags`, `author.handle`

## Testing
- Test file: `tests_commands/search.test.ts`
- Key tests: Basic search, tag filtering, limit
