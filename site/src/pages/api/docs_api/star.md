# star.ts

## Purpose
API endpoint for star/unstar operations on skillsets. Handles authenticated POST requests to toggle star status (with rate limiting) and GET requests to fetch star count and user's star status.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `POST` | APIRoute | Toggle star status for authenticated user, return new state and count |
| `GET` | APIRoute | Get star count and user's starred status (authenticated or anonymous) |

## Dependencies
- **Internal**:
  - `lib/auth` (getSessionFromRequest, Env type)
  - `lib/stars` (toggleStar, isRateLimited, isStarred, getStarCount)
  - `lib/responses` (jsonResponse, errorResponse)
  - `lib/validation` (isValidSkillsetId)
- **External**:
  - `astro` (APIRoute type)

## Integration Points
- **Used by**:
  - `components/StarButton.tsx` (toggle and fetch star state)
  - `components/SkillsetGrid.tsx` (fetch star counts)
- **Consumes**:
  - Session cookie (httpOnly JWT token)
  - Cloudflare KV (DATA namespace)
- **Emits**: JSON responses with star data

## Key Logic

### POST /api/star
1. Check session authentication (401 if missing)
2. Check rate limit: 10 ops/min per user (429 if exceeded)
3. Validate request body: `{ skillsetId: string }`
4. Validate skillsetId format: `/^@?[\w-]+\/[\w-]+$/` (prevent KV injection)
5. Call `toggleStar()` to flip state and update counts
6. Return `{ starred: boolean, count: number }`

### GET /api/star?skillsetId={id}
1. Validate skillsetId query parameter (400 if missing)
2. Fetch star count (always public)
3. If authenticated: check if user has starred this skillset
4. If anonymous: return `starred: false`
5. Return `{ skillsetId, count, starred, authenticated }`

### Security
- Rate limiting prevents star spam
- SkillsetId validation prevents KV key injection attacks
- Session verification prevents unauthorized star operations
- Anonymous GET allowed (public star counts)

### Error Responses
- 400: Missing or invalid skillsetId
- 401: Unauthorized (POST only, authentication required)
- 429: Rate limit exceeded (10 ops/min)
- 500: Internal server error (KV failures)
