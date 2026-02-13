# AuthStatus.tsx

## Purpose
React island that displays authentication action links in the navigation. Fetches session info from `/api/me` and renders either a "Log in" or "Log out" link based on authentication state.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `default` | React component | Auth action link (used as `<AuthStatus client:load />`) |

## Dependencies
- **Internal**: `/api/me` endpoint (fetched client-side)
- **External**: React (`useState`, `useEffect`)

## Integration Points
- Used by: Navigation/sidebar components
- Returns to current page after login via `returnTo` query param

## Key Logic
1. Mounts and fetches `GET /api/me`
2. Returns `null` during loading (prevents layout shift)
3. 200 response: renders "Log out" link to `/logout`
4. 401/error: renders "Log in" link to `/login?returnTo={currentPath}`
