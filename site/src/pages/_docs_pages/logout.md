# logout.ts

## Purpose
Logout endpoint that clears the user's session by setting a logout cookie (Max-Age=0) and redirects to the homepage.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `GET` | APIRoute | Clear session cookie and redirect to homepage |

## Dependencies
- **Internal**:
  - `lib/auth` (createLogoutCookie, Env type)
- **External**:
  - `astro` (APIRoute type)

## Integration Points
- **Used by**:
  - User-initiated logout links/buttons
- **Consumes**: None
- **Emits**: 302 redirect with logout cookie

## Key Logic

### GET /logout
1. Generate logout cookie: `session=; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
2. Redirect to `SITE_URL` (or `/` if env var not set)
3. Browser deletes session cookie immediately

### Cookie Attributes
- **Max-Age=0**: Tells browser to delete cookie immediately
- **Path=/**: Deletes cookie for all paths
- **HttpOnly**: Prevents JavaScript access (consistent with login cookie)
- **Secure**: Only sent over HTTPS (consistent with login cookie)
- **SameSite=Lax**: CSRF protection (consistent with login cookie)

### No Server-Side State
- No KV cleanup required (JWT is stateless)
- Session is invalidated client-side by cookie deletion
- Expired JWTs are rejected by `verifySessionToken()` (no need to revoke)

### Simplicity
- Single redirect operation
- No error handling (always succeeds)
- No authentication check (anyone can call /logout)
