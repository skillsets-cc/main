# login.ts

## Purpose
OAuth login initiation endpoint. Generates CSRF state and PKCE challenge, stores them in KV with TTL, and redirects user to GitHub authorization page. Supports optional return URL for post-login navigation.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `GET` | APIRoute | Initiate GitHub OAuth flow, redirect to GitHub authorization |

## Dependencies
- **Internal**:
  - `lib/auth` (initiateOAuth, Env type)
- **External**:
  - `astro` (APIRoute type)

## Integration Points
- **Used by**:
  - `components/StarButton.tsx` (redirects unauthenticated users)
  - Manual navigation to `/login` link
- **Consumes**:
  - Cloudflare KV (AUTH namespace for state storage)
- **Emits**: 302 redirect to GitHub

## Key Logic

### GET /login?returnTo={url}
1. Extract optional `returnTo` query parameter (default: `/`)
2. **Validate returnTo**: Must start with `/` but not `//` (prevent open redirect attacks)
3. Call `initiateOAuth()` to generate state, PKCE verifier, and GitHub URL
4. Store `{ codeVerifier, returnTo }` in KV with 5-minute TTL (key: `oauth:{state}`)
5. Redirect user to GitHub authorization page with state and code_challenge

### Flow
```
User → /login?returnTo=/browse
  ↓
Generate state + PKCE → Store in KV
  ↓
Redirect → https://github.com/login/oauth/authorize?...
  ↓
User authenticates on GitHub → GitHub redirects to /callback
```

### Error Handling
- OAuth initiation failure: returns 500 error (logs error)
- No retry logic (user must retry manual navigation)

### Security
- **Open redirect protection**: returnTo must start with `/` (relative path), rejects `//` (protocol-relative URLs)
- **CSRF protection**: Cryptographically random state stored in KV
- **PKCE**: Prevents authorization code interception
- **State TTL**: 5-minute expiration prevents replay attacks
