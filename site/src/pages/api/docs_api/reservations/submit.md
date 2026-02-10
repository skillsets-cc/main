# submit.ts

## Purpose
Maintainer-only API endpoint for transitioning a reserved slot to submitted state (terminal). Called after merging a ghost entry PR. Marks the slot as permanently fulfilled and records the skillset ID.

## Public API

| Export | Type | Description |
|--------|------|-------------|
| `POST` | APIRoute | Transition slot to submitted (maintainer-only, authoritative) |

## Dependencies

- **Internal**:
  - `@/lib/auth` (session validation, Env type)
  - `@/lib/responses` (jsonResponse, errorResponse helpers)
  - `@/lib/reservation-do` (getReservationStub for DO access)
  - `@/lib/maintainer` (isMaintainer authorization check)
- **External**: `astro` (APIRoute type)

## Integration Points

- **Used by**: Maintainer workflow (manual or automated post-merge hook)
- **Calls**: `ReservationCoordinator` Durable Object `/submit` endpoint

## Key Logic

### Authorization Chain
1. Session validation (401 if missing)
2. Maintainer check via `isMaintainer(env, session.userId)` (403 if not maintainer)

### POST /api/reservations/submit
- **Auth**: Required (401 if missing)
- **Maintainer**: Required (403 if not maintainer)
- **Body**: `{ batchId: string, skillsetId: string }`
- **Forwards to DO**: `/submit` endpoint with full body

### DO Submit Logic (authoritative)
1. Validates batch ID format (NOT against current config - works across cohorts)
2. Validates skillsetId format (`@namespace/Name`, max 200 chars)
3. Checks if slot has reservation (404 if not)
4. Rejects if already submitted (409 if duplicate)
5. **Does NOT check expiry** - maintainer submit is authoritative
6. Replaces slot data with `SubmittedSlotData` (terminal state)
7. Deletes user index key (reservation fulfilled)

### Terminal State
Submitted slots cannot be released or changed. They remain permanently in storage as proof of contribution and are included in `/status` responses across all future cohorts.
