# SkillsetGrid

## Purpose
Displays a filterable grid of skillset cards with live star counts and ghost entry integration. Fetches reservation state and renders GhostCard components for available, reserved, and pending submitted slots. Supports tag filtering, MCP badges, and batch ID display.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `SkillsetGrid` (default) | component | React component coordinating search, filtering, and grid display |
| `SkillsetGridProps` | interface | Props: skillsets array |
| `StarIcon` | function | Helper component rendering filled star SVG icon |

## Dependencies
- **Internal**:
  - `@/types` (SearchIndexEntry, ReservationState interfaces)
  - `./TagFilter` (tag filtering component)
  - `./GhostCard` (ghost entry slot component)
- **External**:
  - `react` (useState, useEffect)

## Integration Points
- **Used by**:
  - `pages/browse.astro`, `pages/index.astro` (client:load island for interactive grid)
- **Consumes**:
  - `GET /api/stats/counts` (fetch all star counts in single batch request)
  - `GET /api/reservations` (fetch reservation state with credentials)
- **Emits**: No events

## Key Logic

### Tag Filtering
- Maintains `tagResults` state from TagFilter component
- `finalResults = tagResults` (no search bar, filtering only by tags)
- "All" tags = all skillsets displayed

### Live Star Count Fetching
- On mount, fetches all star counts in a single request to `/api/stats/counts`
- Response includes all skillsets' star counts in a single object
- Updates `liveStars` record with entire response
- Falls back to build-time `skillset.stars` value on error
- Progressive hydration: grid renders with build-time values, updates when API call completes

### Grid Rendering
- Each skillset is a clickable article linking to `/skillset/{namespace}/{name}`
- Displays: name, version, author, description, star count, MCP badge (if applicable), tags, batch ID (if present)
- MCP badge: orange "MCP" pill with server count tooltip, shown when `mcp_servers` is non-empty
- Batch ID: Shown in tertiary font-mono if `skillset.batch_id` exists or skillset is in submitted slots map
- Hover effect: light background, orange title color
- Responsive layout: stacked on mobile, row on desktop

### Ghost Entry Integration

**Submitted Slot Cross-Reference**:
- Builds `submittedMap: Map<skillsetId, batchId>` from reservation slots
- Merges with static `skillset.batch_id` field (static data takes precedence)
- Submitted slots that match existing skillsets show batch ID in regular card (not ghost card)

**Ghost Card Rendering**:
- Renders below regular skillsets in a dashed-border section
- Filters out submitted slots that have matching real skillsets (deduplication)
- Available and reserved slots always render as ghost cards
- Passes callbacks for optimistic UI updates:
  - `onReserved`: Updates local state with new reservation
  - `onCancelled`: Updates local state to mark slot available
  - `onConflict`: Re-fetches reservation state from API

### Empty State
- Displays message when `finalResults.length === 0`
- Occurs when tag filters match nothing

## Performance Considerations
- Two parallel useEffect calls: stars and reservations (concurrent, no blocking)
- No virtualization (assumes small dataset, < 100 skillsets + ghost entries)
- Optimistic UI updates for reserve/cancel actions (no full page reload)
