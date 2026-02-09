# me.ts

## Purpose
Session introspection endpoint. Returns the authenticated user's GitHub login or 401 if not authenticated. Used by the `AuthStatus` React island to determine client-side auth state.

## Public API
| Export | Method | Response | Description |
|--------|--------|----------|-------------|
| `GET` | GET | `200 { login }` or `401 { error }` | Check session state |

## Dependencies
- **Internal**: `lib/auth.ts` (`getSessionFromRequest`), `lib/responses.ts` (`jsonResponse`, `errorResponse`)

## Key Logic
1. Read env from `locals.runtime.env` (Cloudflare Workers binding)
2. Call `getSessionFromRequest(env, request)` — parses session cookie + verifies JWT
3. No session → `errorResponse('Unauthorized', 401)`
4. Valid session → `jsonResponse({ login }, { headers: { 'Cache-Control': 'private, no-store' } })`
