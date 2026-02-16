# reservations.ts

## Purpose
Public API endpoint for ghost entry slot reservations. Provides GET (public status), POST (reserve), and DELETE (release) operations. Proxies requests to the ReservationCoordinator Durable Object with rate limiting and authentication enforcement.

## Public API

| Export | Type | Description |
|--------|------|-------------|
| `GET` | APIRoute | Get all slot states + config (public, caches 10s) |
| `POST` | APIRoute | Reserve a slot (authenticated, rate-limited to 5/hour) |
| `DELETE` | APIRoute | Release user's reservation (authenticated, rate-limited to 5/hour) |
| `isReservationRateLimited` | function | Hour-bucketed KV-based rate limiting (5 ops/hour) |

## Dependencies

- **Internal**:
  - `@/lib/auth` (session validation, Env type)
  - `@/lib/responses` (jsonResponse, errorResponse helpers)
  - `@/lib/reservation-do` (getReservationStub for DO access)
- **External**: `astro` (APIRoute type)

## Integration Points

- **Used by**:
  - Frontend reservation UI (fetch calls from Astro pages)
  - `GhostCard.tsx` component (reserve/release actions)
- **Calls**: `ReservationCoordinator` Durable Object (via stub.fetch)

## Key Logic

### Rate Limiting (isReservationRateLimited)
Hour-bucketed KV keys prevent TTL-reset bug where incrementing a key also resets its expiration.
- Key format: `ratelimit:reserve:{userId}:{hour}` (hour = Unix timestamp / 3,600,000)
- Limit: 5 operations per hour
- TTL: 2 hours (survives hour boundary, prevents premature expiration)

### GET /api/reservations
- No authentication required (public data)
- Passes session userId to DO if available (DO returns userSlot only for authenticated users)
- Cache-Control varies by session:
  - Private (session exists): `private, max-age=10`
  - Public (no session): `public, max-age=10`

### POST /api/reservations
- **Auth**: Required (401 if missing)
- **Rate Limit**: 5 operations/hour (429 if exceeded)
- **Validation**: batchId must match format `N.N.NNN`
- **Body**: `{ batchId: string }`
- **Forwards to DO**: `/reserve` endpoint with batchId, userId, githubLogin

### DELETE /api/reservations
- **Auth**: Required (401 if missing)
- **Rate Limit**: 5 operations/hour (429 if exceeded)
- **No body required**: userId from session
- **Forwards to DO**: `/release` endpoint with userId

All DO responses are proxied back to client with original status code.
