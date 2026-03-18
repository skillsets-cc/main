# downloads/start.ts

## Purpose
First half of the two-step download tracking protocol. GET returns the current download count for a skillset. POST issues a short-lived nonce that the CLI must present to `/api/downloads/complete` to record the install. Splitting into start/complete prevents replay abuse by binding the nonce to both skillset ID and client IP.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `GET` | APIRoute | Return download count for `?skillsetId=` query param (cached 60s) |
| `POST` | APIRoute | Issue a download nonce after IP rate-limit check; return `{ nonce }` |

## Dependencies
- **Internal**:
  - `@/lib/rate-limit` (`checkRateLimit`, `hashIp`, `IP_FREEZE_TTL`)
  - `@/lib/downloads` (`createDownloadNonce`, `getDownloadCount`)
  - `@/lib/responses` (`jsonResponse`, `errorResponse`, `parseJsonBody`, `getEnv`)
  - `@/lib/validation` (`isValidSkillsetId`)
- **External**: `astro` (APIRoute type)

## Integration Points
- **Used by**: `npx skillsets install` CLI command (POST before degit clone, GET for display)
- **Consumes**: Cloudflare KV (`DATA` namespace), `clientAddress` from Astro runtime

## Key Logic

### GET /api/downloads/start?skillsetId=
1. Validate `skillsetId` query param (400 if missing/invalid format)
2. Call `getDownloadCount()` to fetch current count from KV
3. Return `{ skillsetId, count }` with `Cache-Control: public, max-age=60`

### POST /api/downloads/start
1. Hash client IP via `hashIp(clientAddress)` (not stored raw)
2. Check rate limit: 5 nonce requests/day per IP, breach threshold 3, freeze TTL = `IP_FREEZE_TTL`
3. Parse body `{ skillset: string }` and validate skillsetId format
4. Call `createDownloadNonce(env.DATA, skillset, clientAddress)` — stores nonce in KV with TTL
5. Return `{ nonce }`
