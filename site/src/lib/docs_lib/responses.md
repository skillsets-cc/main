# responses.ts

## Purpose
Provides standardized JSON response helpers for API routes to ensure consistent formatting, proper Content-Type headers, and structured error messages across all endpoints.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `getEnv` | function | Extract typed `Env` from `App.Locals` (Astro runtime locals) |
| `JsonResponseOptions` | interface | Options for response (status code, headers) |
| `jsonResponse` | function | Create JSON response with Content-Type header and optional status/headers |
| `errorResponse` | function | Create JSON error response with error field and status code |
| `parseJsonBody` | function | Parse JSON body from request; returns parsed body or 400 error Response on failure |
| `frozenResponse` | function | Create 403 JSON response for suspended accounts (frozen by rate-limit breach) |

## Dependencies
- **Internal**: `auth.ts` (`Env` type)
- **External**: Web API `Response` constructor

## Integration Points
- **Used by**:
  - `pages/api/star.ts`
  - `pages/api/downloads/start.ts`, `pages/api/downloads/complete.ts`
  - `pages/api/me.ts`
  - `pages/api/reservations.ts`
  - `rate-limit.ts` (`errorResponse`, `frozenResponse`)
- **Consumes**: No external services
- **Emits**: No events

## Key Logic

### Response Formatting
- Sets `Content-Type: application/json` header automatically
- Serializes data with `JSON.stringify`
- Default status: 200 (can be overridden)
- Supports custom headers via spread operator

### Error Response Structure
```json
{
  "error": "Error message",
  ...additionalData
}
```

Example with additional data:
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```
