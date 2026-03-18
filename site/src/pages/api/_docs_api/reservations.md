# reservations.ts

## Purpose
Public API endpoint for ghost entry slot reservations. Provides GET (public status), POST (reserve), and DELETE (release) operations. Proxies all state changes to the `ReservationCoordinator` Durable Object with rate limiting and authentication enforcement.

## Public API

| Export | Type | Description |
|--------|------|-------------|
| `GET` | APIRoute | Get all slot states + config (public, caches 10s) |
| `POST` | APIRoute | Reserve a slot (authenticated, rate-limited 2/day) |
| `DELETE` | APIRoute | Release user's reservation (authenticated, rate-limited 2/day) |

## Dependencies

- **Internal**:
  - `@/lib/auth` (`getSessionFromRequest`, `Env` type)
  - `@/lib/responses` (`jsonResponse`, `errorResponse`, `parseJsonBody`, `getEnv`)
  - `@/lib/reservation-do` (`getReservationStub`, `BATCH_ID_REGEX`)
  - `@/lib/rate-limit` (`checkRateLimit`, `BreachPolicy`)
- **External**: `astro` (APIRoute type)

## Integration Points

- **Used by**:
  - Frontend reservation UI / `GhostCard.tsx` (reserve/release actions)
- **Calls**: `ReservationCoordinator` Durable Object (via stub.fetch)

## Key Logic

### Rate Limiting
`RESERVATION_POLICY = { threshold: 0, bucketType: 'day' }` — 2 ops/day per user.
Threshold 0 means the breach is recorded (and freeze triggered) on the very first over-limit attempt.

### Breach Warning Injection
If `gate.warning` is set (user is on their last allowed op before a freeze), the warning string is merged into the DO response JSON before returning to the client:
> "You have reached your daily reservation limit (2/day). Any further attempt today will result in a permanent suspension."

### GET /api/reservations
- No authentication required (public data)
- Passes session userId in `X-User-Id` header to DO if authenticated (DO returns `userSlot` only for known users)
- Cache-Control: `private, max-age=10` if session present; `public, max-age=10` otherwise

### POST /api/reservations
- **Auth**: Required (401 if missing)
- **Rate Limit**: 2 ops/day per user (429 + optional warning/freeze if exceeded)
- **Validation**: `batchId` must match `BATCH_ID_REGEX`
- **Body**: `{ batchId: string }`
- **Forwards to DO**: `/reserve` with `{ batchId, userId, githubLogin }`

### DELETE /api/reservations
- **Auth**: Required (401 if missing)
- **Rate Limit**: 2 ops/day per user (shared counter with POST)
- **No body**: userId taken from session
- **Forwards to DO**: `/release` with `{ userId }`

All DO responses are proxied back with the original HTTP status code.
