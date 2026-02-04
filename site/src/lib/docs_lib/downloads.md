# downloads.ts

## Purpose
Manages download counters for skillsets using Cloudflare KV storage with IP-based rate limiting (30 downloads per hour per IP). Tracks how many times each skillset has been installed via the CLI and prevents abuse.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `isDownloadRateLimited` | function | Check if IP exceeded 30 downloads/hr, update counter |
| `incrementDownloads` | function | Increment download count for a skillset, return new count |
| `getDownloadCount` | function | Get current download count for a skillset, return 0 if not found |

## Dependencies
- **Internal**: None (standalone library)
- **External**:
  - Cloudflare KV API (namespace for persistent storage)

## Integration Points
- **Used by**:
  - `pages/api/downloads.ts` (API endpoint called by CLI on install)
  - `components/DownloadCount.tsx` (display download count on UI)
- **Consumes**: No external services
- **Emits**: No events

## Key Logic

### KV Storage Schema
```
downloads:{skillsetId}   → "42"  (download count as string)
dl-rate:{ip}             → "12"  (request count, 3600s TTL)
```

### Rate Limiting
- 30 downloads per hour per IP (DL_RATE_LIMIT_MAX)
- Uses sliding window approximation via KV TTL (3600 seconds = 1 hour)
- First request from IP sets counter to "1" with 1-hour TTL
- Subsequent requests increment counter, renew TTL
- Returns true if count >= 30
- IP-based (not user-based) to catch unauthenticated abuse

### Increment Strategy
- Read current count from `downloads:{skillsetId}`
- Parse as integer, default to 0 if key doesn't exist
- Increment by 1
- Write new count back to KV
- Return new count
- No atomic operation (potential race condition on concurrent installs)
