# rate-limit

## Purpose
Provides bucketed KV-based rate limiting for Cloudflare Workers. Supports minute and hour time windows. Uses time-bucketed keys to avoid the TTL-reset drift problem: re-putting a key with `expirationTtl` resets the TTL and extends the window, so each time period gets its own key instead.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `isMinuteRateLimited` | function | Check if ID exceeded limit in current 1-minute bucket, increment counter if not (TTL: 120s) |
| `isHourlyRateLimited` | function | Check if ID exceeded limit in current 1-hour bucket, increment counter if not (TTL: 7200s) |

## Dependencies
- **Internal**: None
- **External**: `KVNamespace` (Cloudflare Workers runtime)

## Integration Points
- **Used by**:
  - `stars.ts` (`isMinuteRateLimited` — 10 star ops/min per user)
  - `downloads.ts` (`isHourlyRateLimited` — 30 downloads/hr per IP)
- **Stores data in**: KV with key pattern `ratelimit:{prefix}:{id}:{bucket}`

## Key Logic
- **Bucket keys**: `Math.floor(Date.now() / bucketMs)` scopes each counter to the current time window
- **Auto-expiration**: TTL is 2× the bucket size so keys survive past the boundary before cleanup
- **Check-then-increment**: Reads current count; returns `true` (blocked) if at limit, otherwise increments and returns `false`
- **Zero-based counters**: Missing keys default to `'0'` via nullish coalescing
