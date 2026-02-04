# stars.ts

## Purpose
Implements star/unstar functionality for skillsets with KV-based rate limiting (10 operations per minute per user). Manages both per-skillset star counts and per-user starred lists with atomic toggle operations and exponential backoff retry logic.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `isRateLimited` | function | Check if user exceeded 10 ops/min rate limit, update counter |
| `toggleStar` | function | Star or unstar a skillset, return new state and count |
| `isStarred` | function | Check if user has starred a specific skillset |
| `getStarCount` | function | Get total star count for a skillset |

## Dependencies
- **Internal**: None (standalone library)
- **External**:
  - Cloudflare KV API (DATA namespace for persistent storage)

## Integration Points
- **Used by**:
  - `pages/api/star.ts` (API endpoint for star operations)
  - `lib/data.ts` (fetch star counts for skillsets)
- **Emits**: No events (stateless functions)

## Key Logic

### KV Storage Schema
```
stars:{skillsetId}        → "42"              (star count as string)
user:{userId}:stars       → ["id1", "id2"]    (JSON array of starred IDs)
ratelimit:{userId}        → "7"               (request count, 60s TTL)
```

### Rate Limiting
- 10 operations per minute per user (RATE_LIMIT_MAX)
- Uses sliding window approximation via KV TTL (60 seconds)
- First request sets counter to "1" with 60s TTL
- Subsequent requests increment counter, renew TTL
- Returns true if count >= 10

### Toggle Logic
1. Read user's starred list from `user:{userId}:stars`
2. Read skillset's star count from `stars:{skillsetId}`
3. If already starred: remove from list, decrement count
4. If not starred: add to list, increment count
5. Write both updates atomically via `Promise.all`

### Retry Strategy
- Exponential backoff on 429 errors (KV rate limits)
- 3 retry attempts (MAX_RETRIES)
- Base delay: 100ms, doubles each attempt (100ms, 200ms, 400ms)
- Applies to both reads and writes
- Returns default value on read failure after retries
