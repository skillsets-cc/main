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
  - `react` (`useState`, `useMemo`, `useEffect`)
  - `react-dom` (`createPortal`)

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
- Fixed positioning at bottom (`fixed bottom-0 left-0 right-0`) with `z-50`
- Waits for client mount (`mounted` state) before rendering; returns `null` during SSR/before hydration

### Visibility Control
- Uses `IntersectionObserver` to watch a `#registry` DOM element
- Bar is visible (`opacity-100 translate-y-0`) only when `#registry` is intersecting (threshold: 0.1)
- Slides out below viewport when `#registry` is not visible (`opacity-0 translate-y-full pointer-events-none`)

### UI State
- **Fixed bar**: Dark background (`bg-[#020202]/90`) with `backdrop-blur-sm`; full-width at page bottom
- **Active tag**: Surface-white background, accent border and text (`border-accent text-accent`) with glow
- **Inactive tags**: Surface-paper background, muted accent border; hover brightens border and text
- **All button**: active when no tag selected
- Horizontal scroll with `scrollbar-hide` for overflow tags

### Performance
- `useMemo` for tag list (depends on skillsets array)
- `useMemo` for filtered results (depends on selectedTag and skillsets)
- `useEffect` calls `onResultsChange` only when filtered results change
