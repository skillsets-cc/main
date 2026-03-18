# me.ts

## Purpose
Session introspection and GDPR account deletion endpoint. GET returns the authenticated user's GitHub login and starred skillset list. DELETE erases all user data (GDPR Art. 17 right to erasure), revokes the session, and clears the auth cookie.

## Public API
| Export | Method | Response | Description |
|--------|--------|----------|-------------|
| `GET` | GET | `200 { login, stars }` or `401` | Return session info + starred skillsets |
| `DELETE` | DELETE | `200 { deleted: true }` or `401/429` | Erase all user data and revoke session |

## Dependencies
- **Internal**:
  - `lib/auth` (`getSessionFromRequest`, `getTokenFromRequest`, `createLogoutCookie`, `revokeSessionToken`)
  - `lib/rate-limit` (`checkDailyLimit`, `recordBreach`, `PREFIX_REGISTRY`)
  - `lib/responses` (`jsonResponse`, `errorResponse`, `getEnv`)
- **External**: `astro` (APIRoute type)

## Integration Points
- **Used by**: `AuthStatus` React island (GET, to determine client-side auth state)
- **Consumes**: Session cookie (httpOnly JWT), Cloudflare KV (`DATA` namespace)

## Key Logic

### GET /api/me
1. Parse session from request cookie via `getSessionFromRequest`
2. No session → `401`
3. Valid session → fetch `user:{userId}:stars` from KV (JSON array)
4. Return `{ login, stars }` with `Cache-Control: private, no-store`

### DELETE /api/me (GDPR erasure)
1. Require session (401 if missing)
2. Check daily deletion limit: 1/day via `checkDailyLimit`; if exceeded, call `recordBreach` and return `429`
   - No freeze gate — GDPR Art. 17 erasure cannot be blocked by rate-limit freezes
3. Delete all user-scoped KV keys in parallel:
   - `user:{userId}:stars`
   - `ratelimit:{prefix}:{userId}:{currentDay}` for every `userId`-identity entry in `PREFIX_REGISTRY`
   - `breaches:{prefix}:{userId}` for every `userId`-identity entry in `PREFIX_REGISTRY`
   - Freeze keys are intentionally NOT deleted (Art. 17(3) — erasure does not lift abuse flags)
4. Revoke session token via `revokeSessionToken`
5. Return `{ deleted: true }` with `Set-Cookie: logout` + `Cache-Control: private, no-store`
