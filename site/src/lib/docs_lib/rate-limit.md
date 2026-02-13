# rate-limit

## Purpose
Provides hour-bucketed KV-based rate limiting for Cloudflare Workers. Uses time-windowed counters with automatic expiration to prevent abuse of API endpoints without requiring manual cleanup.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| isHourlyRateLimited | async function | Checks if an ID has exceeded the hourly limit, increments counter if not |

## Dependencies
- External: `KVNamespace` (Cloudflare Workers runtime)

## Integration Points
- Used by: `site/src/pages/api/downloads.ts` (IP-based rate limiting)
- Stores data in: KV with key pattern `ratelimit:{prefix}:{id}:{hour}`

## Key Logic
- **Hour bucketing**: Divides time into 1-hour windows using `Math.floor(Date.now() / 3_600_000)`
- **Auto-expiration**: Keys have 2-hour TTL to survive past hour boundary and prevent key accumulation
- **Atomic check-and-increment**: Reads current count, returns true if limit exceeded, otherwise increments and returns false
- **Zero-based counters**: Missing keys default to '0' via nullish coalescing
