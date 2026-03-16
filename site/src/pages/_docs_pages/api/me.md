# api/me.ts

## Purpose
User account endpoint supporting GDPR data export (GET) and account deletion (DELETE). GET returns the authenticated user's login and starred skillsets. DELETE purges all user data from KV, revokes the session, and clears the session cookie.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `GET` | APIRoute | Return authenticated user's login and starred skillsets |
| `DELETE` | APIRoute | Delete all user data, revoke session, and clear cookie |

## Dependencies
- **Internal**:
  - `lib/auth` (`getSessionFromRequest`, `getTokenFromRequest`, `createLogoutCookie`, `revokeSessionToken`, `Env`)
  - `lib/rate-limit` (`isHourlyRateLimited`)
  - `lib/responses` (`jsonResponse`, `errorResponse`)
- **External**:
  - `astro` (`APIRoute`)

## Integration Points
- **Used by**:
  - Frontend `DataControls` component (data export, account deletion)
- **Consumes**:
  - Session JWT (from httpOnly cookie)
  - `DATA` KV namespace (`user:{userId}:stars`)
- **Emits**: JSON responses; logout cookie on DELETE

## Key Logic

### GET /api/me

Returns:
```json
{ "login": "octocat", "stars": ["@ns/skillset-name"] }
```

Flow:
1. Verify session from cookie — 401 if not authenticated
2. Fetch `user:{userId}:stars` from DATA KV (default empty array)
3. Return `{ login, stars }` with `Cache-Control: private, no-store`

### DELETE /api/me

Flow:
1. Verify session — 401 if not authenticated
2. Rate limit: 5 deletion attempts per hour per user (via DATA KV) — 429 if exceeded
3. Delete `user:{userId}:stars` from DATA KV
4. Log deletion for audit: `[GDPR] User data deleted`
5. Revoke current JWT (writes `revoked:{jti}` to AUTH KV with remaining-lifetime TTL)
6. Return `{ deleted: true }` with `Set-Cookie: session=; Max-Age=0` and `Cache-Control: private, no-store`

### Caching
- Both endpoints use `Cache-Control: private, no-store` — never cached, re-validates on every request
