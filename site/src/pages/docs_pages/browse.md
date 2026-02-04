# browse.astro

## Purpose
Main browsing page displaying all skillsets with interactive search and tag filtering. Uses SkillsetGrid component as a client-side island for real-time filtering without page reloads.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| Page component | Astro page | Browse page with skillset grid (prerendered) |

## Dependencies
- **Internal**:
  - `@layouts/BaseLayout.astro` (base HTML structure, navigation)
  - `@components/SkillsetGrid` (interactive grid with search/filter)
  - `@/lib/data` (getSkillsets function)
- **External**: None

## Integration Points
- **Used by**: Site visitors navigating to `/browse`
- **Consumes**:
  - `search-index.json` (via getSkillsets, loaded at build time)
- **Emits**: No events

## Key Logic

### Data Loading
- Calls `getSkillsets()` at build time to fetch all skillsets from search index
- Sorted by stars (descending) by default
- Passed as props to SkillsetGrid component

### Islands Architecture
- `<SkillsetGrid client:load ...>` - React island for interactivity
- Grid hydrates on page load with search/filter capabilities
- Static HTML shell with dynamic islands (Astro pattern)

### Static Rendering
- `export const prerender = true` - generated at build time
- Skillset data embedded in HTML for fast initial render
- Client-side filtering works on embedded data (no API calls)

### Visual Structure
- Large serif heading: "Skillsets"
- Subtitle: "A community-driven, curated collection..."
- Border separator between header and grid
- Max-width container (7xl) with responsive padding
