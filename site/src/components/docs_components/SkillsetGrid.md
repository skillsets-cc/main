# SkillsetGrid

## Purpose
Displays a filterable grid of skillset cards with build-time star counts and ghost entry integration. Fetches reservation state and renders GhostCard components for available, reserved, and pending submitted slots. Supports tag filtering, MCP badges, and batch ID display.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `SkillsetGrid` (default) | component | React component coordinating search, filtering, and grid display |
| `SkillsetGridProps` | interface | Props: skillsets array |

## Dependencies
- **Internal**:
  - `@/types` (SearchIndexEntry, ReservationState interfaces)
  - `./TagFilter` (tag filtering component)
  - `./GhostCard` (ghost entry slot component)
- **External**:
  - `react` (useState, useEffect, useMemo)

## Integration Points
- **Used by**:
  - `pages/index.astro` (client:load island for interactive grid)
- **Consumes**:
  - `GET /api/reservations` (fetch reservation state with credentials)
- **Emits**: No events

## Key Logic

### Tag Filtering
- Maintains `tagResults` state from TagFilter component
- Filtering only by tags (no search bar)
- "All" tags = all skillsets displayed

### Star Count Display
- Uses build-time `skillset.stars` values (embedded in static HTML at deploy time)
- No client-side star count fetching (per-card StarButton on detail pages handles live stars)
- Accurate at deploy time; frequent deploys keep counts near real-time

### Grid Rendering
- Each skillset is a clickable article linking to `/skillset/{namespace}/{name}`
- Displays: name, version, author, description, star count, MCP badge (if applicable), tags, batch ID (if present)
- MCP badge: accent-colored "MCP" pill (`text-accent border-accent/50`) with server count tooltip, shown when `mcp_servers` is non-empty
- Batch ID: Shown in tertiary font-mono if `skillset.batch_id` exists or skillset is in submitted slots map
- Hover effect: light background (`hover:bg-surface-white`), accent title color (`group-hover:text-accent`)
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
- Displays message when `tagResults.length === 0`
- Occurs when tag filters match nothing

## Performance Considerations
- Single useEffect for reservations fetch
- No virtualization (assumes small dataset, < 100 skillsets + ghost entries)
- Optimistic UI updates for reserve/cancel actions (no full page reload)
