# SearchBar.tsx

## Purpose
Provides client-side fuzzy search for skillsets using Fuse.js. Accepts a list of skillsets and a callback to update parent component with filtered results. Displays search input with result count.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `SearchBar` (default) | component | React component with search input and result count display |
| `SearchBarProps` | interface | Props: skillsets array, onResultsChange callback |

## Dependencies
- **Internal**:
  - `@/types` (SearchIndexEntry interface)
- **External**:
  - `react` (useState, useMemo, useEffect)
  - `fuse.js` (fuzzy search library)

## Integration Points
- **Used by**:
  - `pages/browse.astro` (client:load island for interactive search)
- **Consumes**:
  - Skillsets array passed as prop from parent
- **Emits**:
  - Calls `onResultsChange(results)` whenever search results update

## Key Logic

### Fuse.js Configuration
- **Keys**: Searches across name, description, tags, author fields
- **Threshold**: 0.3 (balanced between strict and fuzzy matching)
- **Memoization**: Fuse instance cached with `useMemo` to avoid re-initialization on re-renders

### Search Behavior
- Empty query: returns all skillsets
- Non-empty query: returns Fuse.js search results (sorted by relevance)
- Debouncing: Not implemented (instant search)

### Result Count Display
- Shows when query is non-empty
- Singular/plural handling: "1 result" vs "N results"
- Displays below search input

### Performance
- `useMemo` for Fuse instance (depends on skillsets array)
- `useMemo` for search results (depends on query and Fuse instance)
- `useEffect` calls `onResultsChange` only when results change
