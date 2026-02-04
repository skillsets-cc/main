# StarButton.tsx

## Purpose
Interactive star button for skillsets. Displays star count, shows starred state visually, and allows authenticated users to toggle star status with optimistic UI updates. Redirects to login if unauthenticated.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `StarButton` (default) | component | React component with star icon, count, and toggle handler |
| `StarButtonProps` | interface | Props: skillsetId (required), initialStars (optional, default 0) |

## Dependencies
- **Internal**: None
- **External**:
  - `react` (useState, useEffect)

## Integration Points
- **Used by**:
  - `components/SkillsetGrid.tsx` (display star button in browse grid)
  - `pages/skillset/[namespace]/[name].astro` (display on skillset detail page)
- **Consumes**:
  - `GET /api/star?skillsetId={id}` (fetch star state on mount)
  - `POST /api/star` (toggle star status)
- **Emits**: No events

## Key Logic

### Initial State Fetch
- On mount, fetches `GET /api/star?skillsetId={id}` with credentials
- Updates local state with server-side count and starred status
- Silent failure (logs error, keeps initialStars)

### Toggle Behavior
1. Set loading state (disables button)
2. POST to `/api/star` with skillsetId
3. If 401 (unauthenticated): redirect to `/login`
4. If 200 (success): update starred state and count locally
5. Clear loading state

### Optimistic UI (sort of)
- Waits for server response before updating UI (not fully optimistic)
- Server response is trusted as source of truth
- No rollback on error (just logs to console)

### Visual States
- **Starred**: Orange border, orange text, filled star icon
- **Unstarred**: Gray border, gray text, outlined star icon, hover effect
- **Loading**: Button disabled (no visual loading indicator)

### Star Icon
- SVG with conditional fill/stroke
- Filled when starred, outlined when unstarred
- 5-pointed star shape (path data)
