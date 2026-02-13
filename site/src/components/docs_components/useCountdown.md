# useCountdown.ts

## Purpose
React hook that provides a formatted countdown string from a Unix timestamp. Updates every 60 seconds with remaining time in "delivers within Xd Yh Zm" format or "Expired" when time runs out.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `useCountdown` | hook | React hook: `(expiresAt: number) => string` |

### Parameters
| Param | Type | Description |
|-------|------|-------------|
| `expiresAt` | number | Unix timestamp (seconds since epoch) of expiration time |

### Returns
String in one of these formats:
- `"delivers within Xd Yh Zm"` (e.g., "delivers within 2d 3h 45m")
- `"delivers within Xh Ym"` (< 1 day remaining)
- `"delivers within Xm"` (< 1 hour remaining)
- `"Expired"` (past expiration time)

## Dependencies
- **Internal**: None
- **External**: `react` (`useState`, `useEffect`)

## Integration Points
- Used by: `components/GhostCard.tsx` (displays reservation expiry countdown)

## Key Logic

### Time Calculation
- Converts `expiresAt` (Unix seconds) to seconds remaining: `expiresAt - Math.floor(Date.now() / 1000)`
- Breaks down into days, hours, minutes using integer division

### Format Rules
- Days: Only shown if > 0
- Hours: Shown if days > 0 OR hours > 0
- Minutes: Always shown
- Expired: Shown when remaining seconds ≤ 0

### Update Frequency
- Updates every 60 seconds (`setInterval` with 60000ms)
- Initial state computed immediately on mount
- Cleans up interval on unmount via `useEffect` return

### Performance
- Memoizes initial display value with function initializer
- Updates only when `expiresAt` changes (dependency array)
