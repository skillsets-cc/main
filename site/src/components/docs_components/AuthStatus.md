# AuthStatus.tsx

## Purpose
React island that displays the user's authentication state in the sidebar. Fetches session info from `/api/me` and renders either a Login link or username with Logout link.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `default` | React component | Auth status display (used as `<AuthStatus client:load />`) |

## Dependencies
- **Internal**: `/api/me` endpoint (fetched client-side)
- **External**: React (`useState`, `useEffect`)

## Key Logic
1. Mounts and fetches `GET /api/me`
2. Returns `null` during loading (no layout shift)
3. 200 response: shows `@{login} · Logout`
4. 401/error: shows `Login` link with `returnTo` query param
