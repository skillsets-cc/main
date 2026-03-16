# DataControls.tsx

## Purpose
GDPR-compliant data controls React island for the privacy page. Renders only when the user is logged in and provides two actions: export account data as a JSON file (Article 20 portability) and permanently delete the account with a confirmation step.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| DataControls | React component (default) | Renders export + delete buttons for authenticated users; returns null if not logged in |

## Dependencies
- **Internal**: `/api/me` (GET for auth check + data export, DELETE for account deletion)
- **External**: React (`useState`, `useEffect`)

## Integration Points
- **Used by**: `src/pages/privacy.astro` via `<DataControls client:load />`
- **Emits**: No events; navigates to `/login` on 401, navigates to `/` after successful deletion

## Key Logic

### Auth gating
On mount, fetches `GET /api/me` to determine login state. Returns `null` (renders nothing) until the check resolves and if the user is not logged in. This avoids flicker on SSR-prerendered pages.

### State machine
Uses a single `State` type (`'idle' | 'loading' | 'confirm' | 'deleted' | 'error'`). The delete flow requires an explicit confirmation click — the Delete button transitions to `confirm`, which replaces it with a warning button that triggers the actual DELETE request.

### Data export
Fetches `GET /api/me` with `credentials: 'include'`, serializes the JSON response to a Blob, creates an object URL, triggers a synthetic anchor click for download as `skillsets-cc-data.json`, then revokes the URL.

### Account deletion
Calls `DELETE /api/me`. On success, shows a confirmation message and redirects to `/` after 2 seconds. 401 responses redirect to `/login` rather than showing an error.
