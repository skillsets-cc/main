# lookup.ts

## Purpose
Public API endpoint for looking up a user's active reservation by GitHub user ID. Used by the CLI `npx skillsets init` command to discover if the user has a reserved batch ID. No authentication required (IP-based rate limiting instead).

## Public API

| Export | Type | Description |
|--------|------|-------------|
| `GET` | APIRoute | Look up batch ID by GitHub user ID (public, 30 req/hour per IP) |

## Dependencies

- **Internal**:
  - `@/lib/auth` (Env type)
  - `@/lib/responses` (jsonResponse, errorResponse helpers)
  - `@/lib/reservation-do` (getReservationStub for DO access)
- **External**: `astro` (APIRoute type)

## Integration Points

- **Used by**: `cli/src/commands/init.ts` (batch ID discovery during skillset initialization)
- **Calls**: `ReservationCoordinator` Durable Object `/lookup` endpoint

## Key Logic

### Rate Limiting (isLookupRateLimited)
Hour-bucketed KV keys, IP-based (not userId) since endpoint is public:
- Key format: `ratelimit:lookup:{ip}:{hour}`
- Limit: 30 requests per hour
- TTL: 2 hours (survives hour boundary)

### GET /api/reservations/lookup
- **Auth**: None required (public endpoint)
- **Rate Limit**: 30 requests/hour per IP (429 if exceeded)
- **Query Params**:
  - `githubId` (required): GitHub numeric user ID
- **Returns**: `{ batchId: string | null }`

### Lookup Logic (in DO)
Returns batch ID only for actively reserved slots:
- Returns null if no reservation found
- Returns null if slot is submitted (reservation fulfilled)
- Returns null if reservation expired
- Returns batch ID if active reservation exists

CLI uses this to auto-populate batch ID in `skillset.yaml` during `npx skillsets init`.
