# api/reservations/config.ts

## Purpose
Maintainer-only configuration endpoint for updating reservation system parameters (ghost slots, TTL, cohort number). Delegates to Durable Object for atomic updates.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `POST` | APIRoute | Update ghost slot configuration (maintainer-only) |

## Dependencies
- **Internal**:
  - `lib/auth` (`getSessionFromRequest`, `Env`)
  - `lib/responses` (`jsonResponse`, `errorResponse`)
  - `lib/reservation-do` (`getReservationStub`)
  - `lib/maintainer` (`isMaintainer`)
- **External**:
  - `astro` (`APIRoute`)

## Integration Points
- **Used by**:
  - Maintainer admin tools (not exposed in public UI)
- **Consumes**:
  - Cloudflare Durable Object (ReservationDO)
  - Session JWT (maintainer authentication)
- **Emits**: JSON responses

## Key Logic

### POST /api/reservations/config
**Update reservation configuration**

Request body (all fields optional):
```json
{
  "totalGhostSlots": 20,
  "ttlDays": 7,
  "cohort": 1
}
```

Flow:
1. Verify authentication (401 if missing)
2. Check maintainer authorization via `isMaintainer(env, userId)`
3. Validate JSON body
4. Validate field types:
   - `totalGhostSlots`: must be number
   - `ttlDays`: must be number
   - `cohort`: must be number
5. Forward to Durable Object
6. DO updates config atomically
7. Return updated config from DO

Error responses:
- 401 if not authenticated
- 403 if not a maintainer
- 400 if invalid field types
- 500 on DO failure

### Maintainer Authorization
Uses `isMaintainer(env, userId)` to check if user is in maintainer list:
- Reads `MAINTAINER_USER_IDS` env var (comma-separated GitHub user IDs)
- Returns `true` if userId matches

### Security
- Requires authentication AND maintainer authorization
- No rate limiting (maintainer operations are trusted)
- Type validation prevents invalid config
- Durable Object ensures atomic updates
