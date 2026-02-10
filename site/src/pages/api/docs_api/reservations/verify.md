# verify.ts

## Purpose
Public API endpoint for CI validation of batch ID reservations. Used by GitHub Actions workflow to verify that a PR author holds a valid reservation for the batch ID they're submitting. No authentication required (IP-based rate limiting instead).

## Public API

| Export | Type | Description |
|--------|------|-------------|
| `GET` | APIRoute | Verify batch ID + login/userId match (public, 30 req/hour per IP) |

## Dependencies

- **Internal**:
  - `@/lib/auth` (Env type)
  - `@/lib/responses` (jsonResponse, errorResponse helpers)
  - `@/lib/reservation-do` (getReservationStub for DO access)
- **External**: `astro` (APIRoute type)

## Integration Points

- **Used by**: GitHub Actions workflow (PR validation in `.github/workflows/validate-submission.yml`)
- **Calls**: `ReservationCoordinator` Durable Object `/verify` endpoint

## Key Logic

### Rate Limiting (isVerifyRateLimited)
Hour-bucketed KV keys, IP-based (not userId) since endpoint is public:
- Key format: `ratelimit:verify:{ip}:{hour}`
- Limit: 30 requests per hour
- TTL: 2 hours (survives hour boundary)

### GET /api/reservations/verify
- **Auth**: None required (public endpoint)
- **Rate Limit**: 30 requests/hour per IP (429 if exceeded)
- **Query Params**:
  - `batchId` (required): Batch ID to verify (format: `N.N.NNN`)
  - `login` (optional): GitHub username to match
  - `userId` (optional): GitHub numeric user ID to match
- **Returns**: `{ valid: boolean, reason?: string, batchId?: string }`

### Validation Logic (in DO)
1. Check batch ID format
2. Verify slot has reservation
3. Reject if slot is already submitted
4. Reject if reservation expired
5. Match login OR userId (handles GitHub username changes)

Returns `valid: true` only if:
- Batch ID format valid
- Slot has active reservation (not expired, not submitted)
- Login or userId matches reservation
