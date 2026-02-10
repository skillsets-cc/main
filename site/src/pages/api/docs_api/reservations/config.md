# config.ts

## Purpose
Maintainer-only API endpoint for updating reservation system configuration (totalGhostSlots, ttlDays, cohort). Enforces authentication, maintainer authorization, and type validation before proxying to ReservationCoordinator Durable Object.

## Public API

| Export | Type | Description |
|--------|------|-------------|
| `POST` | APIRoute | Update config (maintainer-only, validates types) |

## Dependencies

- **Internal**:
  - `@/lib/auth` (session validation, Env type)
  - `@/lib/responses` (jsonResponse, errorResponse helpers)
  - `@/lib/reservation-do` (getReservationStub for DO access)
  - `@/lib/maintainer` (isMaintainer authorization check)
- **External**: `astro` (APIRoute type)

## Integration Points

- **Used by**: Maintainer tooling (manual admin operations)
- **Calls**: `ReservationCoordinator` Durable Object `/config` endpoint

## Key Logic

### Authorization Chain
1. Session validation (401 if missing)
2. Maintainer check via `isMaintainer(env, session.userId)` (403 if not maintainer)

### Type Validation
Validates request body fields before forwarding to DO:
- `totalGhostSlots`: Must be number (if present)
- `ttlDays`: Must be number (if present)
- `cohort`: Must be number (if present)

The DO performs additional range validation:
- totalGhostSlots: 1-100
- ttlDays: 1-30
- cohort: 1-999

### Cohort Change Side Effects
When cohort changes (handled by DO):
1. All reserved slots from old cohort are deleted
2. All user index keys are wiped (frees users for new cohort)
3. Submitted slots are preserved (terminal state survives cohort changes)
