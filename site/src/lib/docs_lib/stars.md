# stars.ts

## Purpose
Implements star/unstar functionality for skillsets. Manages both per-skillset star counts and per-user starred lists with atomic toggle operations and exponential backoff retry logic. Rate limiting is handled upstream in the API route via `checkRateLimit` from `rate-limit.ts`.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `toggleStar` | function | Star or unstar a skillset, return new state and count |
| `isStarred` | function | Check if user has starred a specific skillset |
| `getStarCount` | function | Get total star count for a skillset |

## Dependencies
- **Internal**: None (rate limiting delegated to API route)
- **External**:
  - Cloudflare KV API (`KVNamespace`)

## Integration Points
- **Used by**:
  - `pages/api/star.ts` (API endpoint for star operations)
- **Emits**: No events (stateless functions)

## Key Logic

### KV Storage Schema
```
stars:{skillsetId}             → "42"              (star count as string)
user:{userId}:stars            → ["id1", "id2"]    (JSON array of starred IDs)
```

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
