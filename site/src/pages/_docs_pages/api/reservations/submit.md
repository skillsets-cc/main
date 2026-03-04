# api/reservations/submit.ts

## Purpose
Maintainer-only endpoint for transitioning a reserved slot to "submitted" state after merging a PR. Terminal state prevents slot reuse.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `POST` | APIRoute | Mark slot as submitted (maintainer-only) |

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
  - Maintainer workflow (manual or automated post-merge)
- **Consumes**:
  - Cloudflare Durable Object (ReservationDO)
  - Session JWT (maintainer authentication)
- **Emits**: JSON responses

## Key Logic

### POST /api/reservations/submit
**Mark a reserved slot as submitted (terminal state)**

Request body:
```json
{
  "batchId": "001.001.001",
  "skillsetId": "@user/SkillName"
}
```

Returns:
```json
{
  "batchId": "001.001.001",
  "status": "submitted",
  "skillsetId": "@user/SkillName"
}
```

Flow:
1. Verify authentication (401 if missing)
2. Check maintainer authorization via `isMaintainer(env, userId)`
3. Validate JSON body
4. Forward to Durable Object with batchId and skillsetId
5. DO transitions slot to "submitted" state
6. DO stores skillsetId in slot metadata
7. Return updated slot state

Error responses:
- 401 if not authenticated
- 403 if not a maintainer
- 400 if invalid JSON body
- 404 if slot not found (from DO)
- 409 if slot not in "reserved" state (from DO)
- 500 on DO failure

### Terminal State
Once a slot is marked "submitted":
- Cannot be released
- Cannot be reserved by another user
- Prevents duplicate submissions
- Slot permanently linked to skillsetId

### Maintainer Workflow
After merging a skillset PR:
1. Maintainer extracts batchId from manifest
2. Calls `/api/reservations/submit` with batchId and skillsetId
3. Slot transitions to "submitted"
4. Slot permanently removed from available pool

### Security
- Requires authentication AND maintainer authorization
- No rate limiting (maintainer operations are trusted)
- Durable Object ensures atomic state transitions
- Prevents accidental re-submission (409 conflict)
