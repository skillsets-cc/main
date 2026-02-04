# responses.ts

## Purpose
Provides standardized JSON response helpers for API routes to ensure consistent formatting, proper Content-Type headers, and structured error messages across all endpoints.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `JsonResponseOptions` | interface | Options for response (status code, headers) |
| `jsonResponse` | function | Create JSON response with Content-Type header and optional status/headers |
| `errorResponse` | function | Create JSON error response with error field and status code |

## Dependencies
- **Internal**: None (standalone library)
- **External**:
  - Web API Response constructor

## Integration Points
- **Used by**:
  - `pages/api/star.ts` (star/unstar API responses)
  - `pages/api/downloads.ts` (download tracking responses)
  - `pages/api/stats/counts.ts` (stats API responses)
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
