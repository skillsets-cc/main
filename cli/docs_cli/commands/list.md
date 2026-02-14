# list.ts

## Overview
**Purpose**: Display all available skillsets from registry in tabular format

## Dependencies
- External: `chalk`, `ora`
- Internal: `lib/api`

## Key Components

### Functions
| Function | Purpose | Inputs → Output |
|----------|---------|-----------------|
| `list` | Fetch and display skillsets | `ListOptions` → `void` |
| `padEnd` | Pad string for table alignment | `str, len` → `string` |
| `truncate` | Truncate long descriptions | `str, len` → `string` |

### Options
| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `limit` | `string` | `0` (all) | Max results |
| `sort` | `'name' \| 'stars' \| 'downloads'` | `'name'` | Sort order |
| `json` | `boolean` | `false` | JSON output |

## Data Flow
```
list() → fetchSearchIndex() + fetchStats() → mergeStats() → Sort/Limit → Format table → console.log
```

## Integration Points
- Called by: `index.ts`
- Calls: `lib/api.fetchSearchIndex()`, `lib/api.fetchStats()`, `lib/api.mergeStats()`

## Error Handling
- Spinner fails on fetch error
- Re-throws for handleError()

## Testing
- Test file: `tests_commands/list.test.ts`
- Key tests: Sort, limit, JSON output, empty registry
