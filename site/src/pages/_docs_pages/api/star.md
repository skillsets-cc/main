# api/star.ts

## Purpose
Star/unstar API endpoint for authenticated users. Supports toggling star status (POST) and checking star count/status (GET). Includes rate limiting and validation.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `POST` | APIRoute | Toggle star for authenticated user |
| `GET` | APIRoute | Get star count and status for skillset |

## Dependencies
- **Internal**:
  - `lib/auth` (`getSessionFromRequest`, `Env`)
  - `lib/stars` (`toggleStar`, `isRateLimited`, `isStarred`, `getStarCount`)
  - `lib/responses` (`jsonResponse`, `errorResponse`)
  - `lib/validation` (`isValidSkillsetId`)
- **External**:
  - `astro` (`APIRoute`)

## Integration Points
- **Used by**:
  - `components/StarButton.tsx` (POST to toggle, GET to sync state)
- **Consumes**:
  - Cloudflare KV (DATA namespace for star counts, user stars, rate limits)
  - Session JWT (from httpOnly cookie)
- **Emits**: JSON responses

## Key Logic

### POST /api/star
**Toggle star for authenticated user**

Request body:
```json
{ "skillsetId": "@user/name" }
```

Flow:
1. Verify session from cookie
2. Check rate limit (10 ops/min per user)
3. Validate JSON body and skillsetId format
4. Call `toggleStar()` to add/remove star in KV
5. Return result: `{ skillsetId, starred: boolean, count: number }`

Error responses:
- 401 if not authenticated
- 429 if rate limited
- 400 if invalid skillsetId format
- 500 on KV failure

### GET /api/star?skillsetId=@user/name
**Get star count and user's star status**

Query params:
- `skillsetId`: Required, must match `@namespace/name` format

Flow:
1. Validate skillsetId parameter and format
2. Fetch total star count from KV
3. If authenticated, check if user has starred
4. Return `{ skillsetId, count, starred, authenticated }`

Error responses:
- 400 if missing or invalid skillsetId

### Rate Limiting
- **Limit**: 10 star operations per minute per user
- **Implementation**: KV-based with rolling window
- **Key**: `ratelimit:star:{userId}`
- **Response**: 429 with retry message

### Security
- POST requires authentication (session JWT)
- GET is public but shows user-specific data if authenticated
- skillsetId validation prevents injection attacks
- Rate limiting prevents abuse
