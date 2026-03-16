# logout.ts

## Purpose
Logout endpoint that clears the user's session by setting a logout cookie (Max-Age=0) and redirects to the homepage.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `GET` | APIRoute | Clear session cookie and redirect to homepage |

## Dependencies
- **Internal**:
  - `lib/auth` (createLogoutCookie, getTokenFromRequest, revokeSessionToken, Env type)
- **External**:
  - `astro` (APIRoute type)

## Integration Points
- **Used by**:
  - User-initiated logout links/buttons
- **Consumes**: None
- **Emits**: 302 redirect with logout cookie

## Key Logic

### GET /logout
1. Extract session token from request cookie
2. If token exists, revoke it server-side via `revokeSessionToken()` (writes `revoked:{jti}` to AUTH KV with remaining-lifetime TTL)
3. Generate logout cookie: `session=; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
4. Redirect to `SITE_URL` (or `/` if env var not set)
5. Browser deletes session cookie immediately

### Cookie Attributes
- **Max-Age=0**: Tells browser to delete cookie immediately
- **Path=/**: Deletes cookie for all paths
- **HttpOnly**: Prevents JavaScript access (consistent with login cookie)
- **Secure**: Only sent over HTTPS (consistent with login cookie)
- **SameSite=Lax**: CSRF protection (consistent with login cookie)

### Server-Side Revocation
- Token's JTI is added to AUTH KV blocklist (`revoked:{jti}`) with TTL matching remaining token lifetime
- `verifySessionToken()` checks this blocklist — revoked tokens are rejected even if cryptographically valid
- Revocation entries auto-expire via KV TTL when the token would have expired anyway
- Revocation is best-effort — if KV write fails, logout still clears the cookie (defense in depth)

### Simplicity
- No authentication check required (anyone can call /logout)
- Revocation failure does not block the redirect
