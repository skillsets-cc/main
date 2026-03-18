# downloads/complete.ts

## Purpose
Second half of the two-step download tracking protocol. Consumes the nonce issued by `/api/downloads/start` and increments the download counter only if the nonce is valid (correct skillset + matching client address). This design prevents counter inflation from replay attacks or cross-IP reuse.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `POST` | APIRoute | Consume nonce and increment download count; return `{ skillset, count }` |

## Dependencies
- **Internal**:
  - `@/lib/downloads` (`consumeDownloadNonce`, `incrementDownloads`)
  - `@/lib/responses` (`jsonResponse`, `errorResponse`, `parseJsonBody`, `getEnv`)
  - `@/lib/validation` (`isValidSkillsetId`)
- **External**: `astro` (APIRoute type)

## Integration Points
- **Used by**: `npx skillsets install` CLI command (POST after successful degit install)
- **Consumes**: Cloudflare KV (`DATA` namespace) — nonce storage and download counters

## Key Logic

### POST /api/downloads/complete
1. Parse body `{ skillset: string, nonce: string }` (400 if missing)
2. Validate skillset ID format
3. Call `consumeDownloadNonce(env.DATA, nonce, skillset, clientAddress)`:
   - Verifies nonce exists in KV, matches skillset, and matches client IP
   - Deletes nonce after first use (one-time use)
   - Returns `false` if invalid or expired → respond 400
4. Call `incrementDownloads(env.DATA, skillset)` to bump counter
5. Return `{ skillset, count }`
