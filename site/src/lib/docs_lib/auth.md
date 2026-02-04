# auth.ts

## Purpose
Provides GitHub OAuth 2.0 authentication with PKCE (Proof Key for Code Exchange) and CSRF protection. Implements a complete OAuth flow with secure session management using JWT tokens stored in httpOnly cookies. Uses Cloudflare KV for temporary state storage during the OAuth handshake.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `Env` | interface | Environment bindings for Cloudflare (KV namespaces, secrets) |
| `GitHubUser` | interface | GitHub user profile data (id, login, avatar_url) |
| `AuthState` | interface | OAuth state stored in KV (codeVerifier, returnTo) |
| `initiateOAuth` | function | Start OAuth flow, generate state + PKCE, return GitHub auth URL |
| `handleOAuthCallback` | function | Validate state, exchange code for token, return user profile |
| `createSessionToken` | function | Generate signed JWT session token (7-day expiry) |
| `verifySessionToken` | function | Verify JWT signature and expiration, return user session |
| `getSessionFromRequest` | function | Extract and verify session token from request cookies |
| `createSessionCookie` | function | Generate secure session cookie string (HttpOnly, Secure, SameSite=Lax) |
| `createLogoutCookie` | function | Generate logout cookie (Max-Age=0) |
| `AuthError` | class | Custom error with statusCode property for HTTP responses |

## Dependencies
- **Internal**: None (standalone library)
- **External**:
  - Web Crypto API (crypto.subtle for HMAC-SHA256, crypto.randomUUID)
  - Cloudflare KV API (env.AUTH for state storage)
  - GitHub OAuth API (authorization + user endpoints)

## Integration Points
- **Used by**:
  - `pages/login.ts` (initiate OAuth flow)
  - `pages/callback.ts` (handle OAuth callback)
  - `pages/logout.ts` (clear session)
  - `pages/api/star.ts` (verify user session for star operations)
- **Consumes**:
  - GitHub OAuth API (`/login/oauth/authorize`, `/login/oauth/access_token`, `/user`)
- **Emits**: JWT session tokens (stored in httpOnly cookies)

## Key Logic

### PKCE Flow
1. Generate cryptographically random `code_verifier` (32 bytes, base64url-encoded)
2. Create SHA-256 hash of verifier as `code_challenge`
3. Send challenge to GitHub, store verifier in KV with 5-minute TTL
4. On callback, send verifier to GitHub for validation (prevents authorization code interception)

### CSRF Protection
- Generate UUID as `state` parameter
- Store state in KV with 5-minute TTL before redirecting to GitHub
- Validate state on callback, delete immediately to prevent replay attacks

### JWT Session Management
- HS256 (HMAC-SHA256) signature using `JWT_SECRET`
- 7-day expiration (configurable via `createSessionCookie` maxAge)
- Payload includes userId (sub), login, avatar, iat, exp
- Stored in httpOnly, Secure, SameSite=Lax cookie (XSS protection)

### Base64URL Encoding
Uses RFC 4648 base64url encoding (replaces `+` with `-`, `/` with `_`, strips padding `=`) for PKCE verifier, challenge, and JWT segments.
