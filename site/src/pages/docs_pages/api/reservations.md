# api/reservations.ts

## Purpose
Main reservations API endpoint for cohort-based slot management. Handles slot listing (GET), reservation (POST), and release (DELETE). Delegates to Durable Object for atomic state management.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `GET` | APIRoute | Get all slot states + config (public) |
| `POST` | APIRoute | Reserve a slot (authenticated, rate-limited) |
| `DELETE` | APIRoute | Release user's reservation (authenticated, rate-limited) |

## Dependencies
- **Internal**:
  - `lib/auth` (`getSessionFromRequest`, `Env`)
  - `lib/responses` (`jsonResponse`, `errorResponse`)
  - `lib/reservation-do` (`getReservationStub`)
- **External**:
  - `astro` (`APIRoute`)

## Integration Points
- **Used by**:
  - Contribute page UI (slot claiming flow)
  - CLI `init` command (checks for user's reservation)
- **Consumes**:
  - Cloudflare Durable Object (ReservationDO for atomic state)
  - Cloudflare KV (DATA namespace for rate limiting)
  - Session JWT (for authenticated operations)
- **Emits**: JSON responses

## Key Logic

### GET /api/reservations
**Get all slot states and config**

Returns:
```json
{
  "slots": [
    { "id": "001.001.001", "status": "open" },
    { "id": "001.001.002", "status": "reserved", "reservedAt": 1234567890, "expiresAt": 1234987890 }
  ],
  "config": { "totalGhostSlots": 20, "ttlDays": 7, "cohort": 1 },
  "userSlot": { "id": "001.001.003", "status": "reserved" }
}
```

Flow:
1. Check for session (optional)
2. Forward request to Durable Object with optional `X-User-Id` header
3. DO returns slot states, config, and user's slot (if authenticated)
4. Return with cache header (private if authed, public otherwise)

Caching:
- Authenticated: `private, max-age=10`
- Unauthenticated: `public, max-age=10`

### POST /api/reservations
**Reserve a slot**

Request body:
```json
{ "batchId": "001.001.001" }
```

Flow:
1. Verify authentication (401 if missing)
2. Check rate limit (5 ops/hour per user, hour-bucketed)
3. Validate JSON body and batchId format (regex: `^\d{1,3}\.\d{1,3}\.\d{3}$`)
4. Forward to Durable Object with userId and githubLogin
5. DO atomically reserves slot if available
6. Return result from DO (success or error)

Error responses:
- 401 if not authenticated
- 429 if rate limited (5 ops/hour exceeded)
- 400 if invalid batchId format
- 409 if slot already reserved (from DO)
- 500 on DO failure

### DELETE /api/reservations
**Release user's reservation**

No request body required (userId from session).

Flow:
1. Verify authentication (401 if missing)
2. Check rate limit (5 ops/hour per user, hour-bucketed)
3. Forward to Durable Object with userId
4. DO releases user's slot if exists
5. Return result from DO

Error responses:
- 401 if not authenticated
- 429 if rate limited
- 404 if user has no reservation (from DO)
- 500 on DO failure

## Rate Limiting

### Implementation
- **Limit**: 5 reservation operations per hour per user
- **Key format**: `ratelimit:reserve:{userId}:{hour}`
- **Hour buckets**: `Math.floor(Date.now() / 3_600_000)`
- **TTL**: 7200s (2 hours, survives hour boundary)
- **Counter**: Increment on each operation, check before allowing

### Why hour-bucketed keys?
Prevents TTL-reset bug where frequent operations extend the window indefinitely.

## Security
- POST/DELETE require authentication
- Rate limiting prevents spam
- batchId validation prevents injection
- Durable Object ensures atomic operations (no race conditions)
