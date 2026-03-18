# downloads.ts

## Purpose
Download tracking for skillsets using nonce-based verification and Cloudflare KV storage. Issues a one-time nonce before install (via `downloads/start`), then validates and consumes it on completion (via `downloads/complete`) before incrementing the counter. The nonce ties a download to both the skillset and the issuing IP, preventing counter manipulation.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `createDownloadNonce` | function | Issue a UUID nonce bound to skillsetId + IP hash; stored with 600s TTL |
| `consumeDownloadNonce` | function | Validate and delete a nonce; returns `true` if valid (skillset + IP match) |
| `incrementDownloads` | function | Increment download count for a skillset; returns new count |
| `getDownloadCount` | function | Get current download count for a skillset; returns 0 if not found |

## Dependencies
- **Internal**: `rate-limit.ts` (`hashIp`)
- **External**: Web Crypto API (`crypto.randomUUID`), `KVNamespace` (Cloudflare Workers runtime)

## Integration Points
- **Used by**:
  - `pages/api/downloads/start.ts` — issues nonce, rate-limit checked there
  - `pages/api/downloads/complete.ts` — consumes nonce, increments counter

## Key Logic

### KV Storage Schema
```
downloads:{skillsetId}   → "42"                          (download count as string, no TTL)
nonce:{uuid}             → JSON {skillset, ipHash, ts}   (600s TTL, auto-expires)
```

### Nonce Flow
1. CLI calls `downloads/start` → `createDownloadNonce` stores `{skillset, ipHash, ts}` under a UUID nonce (10-min TTL)
2. After degit install, CLI calls `downloads/complete` with the nonce → `consumeDownloadNonce` validates skillset + IP hash, deletes the nonce, returns true
3. On valid nonce, `incrementDownloads` is called to record the install

### Increment Strategy
- Read-increment-write (no atomic KV operation); potential race on concurrent installs is accepted
- No TTL on download counters — permanent storage
