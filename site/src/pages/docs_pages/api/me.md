# api/me.ts

## Purpose
User profile endpoint returning the authenticated user's GitHub login. Used by CLI to verify authentication and display user info.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `GET` | APIRoute | Return authenticated user's GitHub login |

## Dependencies
- **Internal**:
  - `lib/auth` (`getSessionFromRequest`, `Env`)
  - `lib/responses` (`jsonResponse`, `errorResponse`)
- **External**:
  - `astro` (`APIRoute`)

## Integration Points
- **Used by**:
  - CLI (verify authentication, get GitHub handle)
- **Consumes**:
  - Session JWT (from httpOnly cookie)
- **Emits**: JSON responses

## Key Logic

### GET /api/me

Returns:
```json
{ "login": "octocat" }
```

Flow:
1. Verify session from cookie
2. Extract `login` from session payload
3. Return login with private cache header

Error responses:
- 401 if not authenticated

### Caching
- **Cache-Control**: `private, no-store`
- Never cached (user-specific data)
- Re-validates session on each request

### Security
- Requires authentication
- Only returns user's own login (no data leakage)
- Session verified via JWT signature
