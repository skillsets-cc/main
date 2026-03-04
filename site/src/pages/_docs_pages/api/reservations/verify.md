# api/reservations/verify.ts

## Purpose
Public verification endpoint for CI to validate that a PR submission matches a claimed reservation. IP-based rate limiting prevents abuse.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `GET` | APIRoute | Verify batch ID reservation (public, rate-limited) |

## Dependencies
- **Internal**:
  - `lib/auth` (`Env`)
  - `lib/responses` (`jsonResponse`, `errorResponse`)
  - `lib/reservation-do` (`getReservationStub`)
- **External**:
  - `astro` (`APIRoute`)

## Integration Points
- **Used by**:
  - GitHub Actions (PR validation workflow)
- **Consumes**:
  - Cloudflare Durable Object (ReservationDO)
  - Cloudflare KV (DATA namespace for rate limiting)
- **Emits**: JSON responses

## Key Logic

### GET /api/reservations/verify?batchId=X&login=Y&userId=Z
**Verify a batch ID reservation matches the given identity**

Query params:
- `batchId`: Required, format `^\d{1,3}\.\d{1,3}\.\d{3}$`
- `login`: Optional, GitHub login to match
- `userId`: Optional, GitHub user ID to match

Returns:
```json
{ "valid": true, "batchId": "001.001.001" }
```

Or:
```json
{ "valid": false, "reason": "invalid_batch_id" }
```

Flow:
1. Check IP-based rate limit (30 requests/hour)
2. Validate batchId format
3. Forward to Durable Object with query params
4. DO verifies:
   - batchId exists
   - Status is "reserved" or "submitted"
   - Login/userId matches (if provided)
5. Return validation result

Error responses:
- 429 if rate limited (30 requests/hour per IP)
- Invalid batchId: `{ valid: false, reason: 'invalid_batch_id' }`
- 500 on DO failure

### Rate Limiting
- **Limit**: 30 requests per hour per IP
- **Key format**: `ratelimit:verify:{ip}:{hour}`
- **Hour buckets**: `Math.floor(Date.now() / 3_600_000)`
- **TTL**: 7200s (2 hours, survives hour boundary)

### CI Use Case
GitHub Actions workflow calls this endpoint during PR validation:
1. Extract batchId from PR metadata
2. Verify batchId matches PR author's GitHub identity
3. Block merge if verification fails

### Security
- No authentication required (public endpoint)
- IP-based rate limiting prevents abuse
- batchId format validation prevents injection
- Durable Object ensures consistent state
