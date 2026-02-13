# TagFilter.tsx

## Purpose
Provides interactive tag-based filtering for skillsets in a fixed bottom bar. Displays clickable tag buttons extracted from all skillsets, highlights the active tag, and filters results when a tag is selected. Renders via React portal for fixed positioning.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `TagFilter` (default) | component | React component with tag buttons and filtering logic |
| `TagFilterProps` | interface | Props: skillsets array, onResultsChange callback |

## Dependencies
- **Internal**:
  - `@/types` (SearchIndexEntry interface)
- **External**:
  - `react` (`useState`, `useMemo`, `useEffect`, `createPortal`)

## Integration Points
- **Used by**: `components/SkillsetGrid.tsx` (embedded in grid component)
- **Consumes**: Skillsets array passed as prop from parent
- **Emits**: Calls `onResultsChange(results)` whenever filtered results change

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

### Portal Rendering
- Uses `createPortal(bar, document.body)` to render at document root
- Fixed positioning at bottom with `z-50` (above content)
- Waits for client mount (`mounted` state) before rendering
- Returns `null` during SSR/before hydration

### UI State
- **Fixed bar**: Bottom-0, left-64 on desktop (sidebar offset), frosted glass (`bg-surface-white/90 backdrop-blur-sm`)
- **Active tag**: White background, accent border and text (`border-accent text-accent`)
- **Inactive tags**: Surface-paper background, gray border, hover effect
- **All button**: active when no tag selected
- Horizontal scroll with `scrollbar-hide` for overflow tags

### Performance
- `useMemo` for tag list (depends on skillsets array)
- `useMemo` for filtered results (depends on selectedTag and skillsets)
- `useEffect` calls `onResultsChange` only when filtered results change
