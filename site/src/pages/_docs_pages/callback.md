# callback.ts

## Purpose
OAuth callback endpoint that GitHub redirects to after user authorization. Validates CSRF state, exchanges authorization code for access token using PKCE, fetches user profile, creates JWT session, and redirects to return URL.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `GET` | APIRoute | Handle GitHub OAuth callback, create session, redirect to return URL |

## Dependencies
- **Internal**:
  - `lib/auth` (handleOAuthCallback, createSessionToken, createSessionCookie, AuthError, Env)
- **External**:
  - `astro` (APIRoute type)

## Integration Points
- **Used by**:
  - GitHub OAuth service (redirects here after user authorization)
- **Consumes**:
  - Cloudflare KV (AUTH namespace for state validation)
  - GitHub OAuth API (token exchange, user profile)
- **Emits**: 302 redirect with session cookie

## Key Logic

### GET /callback?code={code}&state={state}
1. Check for GitHub OAuth error parameter (e.g., user denied access)
2. Validate presence of `code` and `state` parameters
3. Call `handleOAuthCallback()` to:
   - Validate state against KV (CSRF protection)
   - Exchange code for access token using PKCE verifier
   - Fetch GitHub user profile
   - Delete state from KV (prevent replay)
4. Create JWT session token (7-day expiry)
5. Set httpOnly session cookie
6. Redirect to `returnTo` URL (or `/` if not set)

### Error Handling

| Scenario | Response |
|----------|----------|
| User denies OAuth | Redirect to `/?error=oauth_denied` |
| Missing code/state | 400 Bad Request |
| Invalid/expired state | Redirect to `/?error=session_expired` |
| Token exchange failure | Redirect to `/?error=auth_failed` |
| AuthError (403) | Redirect to `/?error=session_expired` |
| Other AuthError | Return error message with status code |
| Unexpected error | Redirect to `/?error=auth_failed` |

### Security
- State validation prevents CSRF attacks
- PKCE prevents authorization code interception
- State is deleted immediately after validation (no replay)
- JWT session stored in httpOnly, Secure cookie (XSS protection)

### Flow
```
GitHub → /callback?code={code}&state={state}
  ↓
Validate state from KV
  ↓
Exchange code for token (with PKCE verifier)
  ↓
Fetch user profile from GitHub
  ↓
Create JWT session token
  ↓
Set session cookie → Redirect to returnTo URL
```
