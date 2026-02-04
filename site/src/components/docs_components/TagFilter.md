# TagFilter.tsx

## Purpose
Provides interactive tag-based filtering for skillsets. Displays clickable tag buttons extracted from all skillsets, highlights the active tag, and filters results when a tag is selected.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `TagFilter` (default) | component | React component with tag buttons and filtering logic |
| `TagFilterProps` | interface | Props: skillsets array, onResultsChange callback |

## Dependencies
- **Internal**:
  - `@/types` (SearchIndexEntry interface)
- **External**:
  - `react` (useState, useMemo, useEffect)

## Integration Points
- **Used by**:
  - `pages/browse.astro` (client:load island for interactive filtering)
- **Consumes**:
  - Skillsets array passed as prop from parent
- **Emits**:
  - Calls `onResultsChange(results)` whenever filtered results change

## Key Logic

### Tag Extraction
- Iterates through all skillsets to collect tags
- Uses `Set` for deduplication
- Sorts tags alphabetically
- Memoized to avoid recalculation on re-renders

### Filtering Behavior
- `selectedTag = null`: shows all skillsets ("All" button active)
- `selectedTag = <tag>`: shows only skillsets containing that tag
- Filtering uses `Array.filter()` with `includes()` check

### UI State
- **Active tag**: orange background (bg-orange-500), white text
- **Inactive tags**: light background (bg-stone-50), border, hover effect
- **All button**: active when no tag selected
- Rounded-full pill style for all buttons

### Performance
- `useMemo` for tag list (depends on skillsets array)
- `useMemo` for filtered results (depends on selectedTag and skillsets)
- `useEffect` calls `onResultsChange` only when filtered results change
