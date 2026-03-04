# api/reservations/lookup.ts

## Purpose
Public lookup endpoint for CLI to find a user's active reservation by GitHub ID. IP-based rate limiting prevents abuse.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `GET` | APIRoute | Look up active reservation by GitHub ID (public, rate-limited) |

## Dependencies
- **Internal**:
  - `lib/auth` (`Env`)
  - `lib/responses` (`jsonResponse`, `errorResponse`)
  - `lib/reservation-do` (`getReservationStub`)
- **External**:
  - `astro` (`APIRoute`)

## Integration Points
- **Used by**:
  - CLI `init` command (finds user's batch ID for manifest)
- **Consumes**:
  - Cloudflare Durable Object (ReservationDO)
  - Cloudflare KV (DATA namespace for rate limiting)
- **Emits**: JSON responses

## Key Logic

### GET /api/reservations/lookup?githubId=12345
**Look up active reservation for a GitHub user**

Query params:
- `githubId`: Required, GitHub user ID

Returns:
```json
{ "batchId": "001.001.001" }
```

Or if no active reservation:
```json
{ "batchId": null }
```

Flow:
1. Check IP-based rate limit (30 requests/hour)
2. Extract githubId from query params
3. Forward to Durable Object
4. DO searches slots for active reservation by userId
5. Return batchId if found, null otherwise

Error responses:
- 429 if rate limited (30 requests/hour per IP)
- Returns `{ batchId: null }` if missing githubId (graceful)

### Rate Limiting
- **Limit**: 30 requests per hour per IP
- **Key format**: `ratelimit:lookup:{ip}:{hour}`
- **Hour buckets**: `Math.floor(Date.now() / 3_600_000)`
- **TTL**: 7200s (2 hours, survives hour boundary)

### CLI Use Case
During `npx skillsets init`, the CLI:
1. Gets user's GitHub ID (via GitHub CLI or API)
2. Calls `/api/reservations/lookup?githubId={id}`
3. If batchId found, pre-populates manifest
4. If null, prompts user to claim a slot first

### Security
- No authentication required (public endpoint)
- IP-based rate limiting prevents abuse
- Durable Object ensures consistent state
- Returns only batchId (no sensitive user data)
