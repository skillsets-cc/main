# DownloadCount.tsx

## Purpose
Displays download count for a skillset with an icon. Fetches live count from the stats API on mount and falls back to an initial count if the API fails.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `DownloadCount` (default) | component | React component displaying download count with icon. Props: `skillsetId` (string), `initialCount?` (number, default 0) |

## Dependencies
- **Internal**: None
- **External**:
  - `react` (useState, useEffect)

## Integration Points
- **Used by**:
  - `pages/skillset/[namespace]/[name].astro` (display on skillset detail page)
- **Consumes**:
  - `GET /api/downloads?skillsetId=X` (fetch download count for specific skillset)
- **Emits**: No events

## Key Logic

### Data Fetching
- On mount, fetches `/api/downloads?skillsetId=X` (returns `{ skillsetId, count }`)
- Falls back to `initialCount` if:
  - API request fails
  - Network error occurs

### Error Handling
- Silent failure (logs to console, displays initialCount)
- No loading state (shows initialCount immediately)
- No retry logic (single fetch attempt)

### UI
- Download icon (SVG: downward arrow into tray)
- Monospace font for count
- Light text color (text-text-secondary)
- Horizontal layout with gap between icon and count
