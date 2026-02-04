# SkillsetGrid

## Purpose
Orchestrates search and filter functionality for skillsets, displaying a filtered grid of skillset cards. Combines SearchBar and TagFilter results using intersection logic, fetches live star counts, and renders clickable skillset entries with metadata.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `SkillsetGrid` (default) | component | React component coordinating search, filtering, and grid display |
| `SkillsetGridProps` | interface | Props: skillsets array |
| `StarIcon` | function | Helper component rendering filled star SVG icon |

## Dependencies
- **Internal**:
  - `@/types` (SearchIndexEntry interface)
  - `./SearchBar` (fuzzy search component)
  - `./TagFilter` (tag filtering component)
- **External**:
  - `react` (useState, useMemo, useEffect)

## Integration Points
- **Used by**:
  - `pages/browse.astro` (client:load island for interactive browse page)
- **Consumes**:
  - `GET /api/stats/counts` (fetch all star counts in single batch request)
- **Emits**: No events

## Key Logic

### Filter Intersection
- Maintains two result sets: `searchResults` (from SearchBar) and `tagResults` (from TagFilter)
- `finalResults = searchResults ∩ tagResults` (intersection using Set.has())
- Both filters must match for a skillset to appear
- Empty query + "All" tags = all skillsets displayed

### Live Star Count Fetching
- On mount, fetches all star counts in a single request to `/api/stats/counts`
- Response includes all skillsets' star counts in a single object
- Updates `liveStars` record with entire response
- Falls back to build-time `skillset.stars` value on error
- Progressive hydration: grid renders with build-time values, updates when API call completes

### Grid Rendering
- Each skillset is a clickable article linking to `/skillset/{namespace}/{name}`
- Displays: name, version, author, description, star count, tags
- Hover effect: light background, orange title color
- Responsive layout: stacked on mobile, row on desktop

### Empty State
- Displays message when `finalResults.length === 0`
- Occurs when search/tag filters match nothing

## Performance Considerations
- Live star fetching happens in parallel (Promise.all not used, but concurrent requests)
- `useMemo` for tag result set conversion and final intersection
- No virtualization (assumes small dataset, < 100 skillsets)
