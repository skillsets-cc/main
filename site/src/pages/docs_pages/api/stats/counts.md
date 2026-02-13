# api/stats/counts.ts

## Purpose
Bulk stats endpoint for CLI to fetch all star and download counts in a single request. Returns aggregated counts from KV storage with caching.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `GET` | APIRoute | Return all star and download counts |

## Dependencies
- **Internal**:
  - `lib/auth` (`Env`)
  - `lib/responses` (`jsonResponse`, `errorResponse`)
- **External**:
  - `astro` (`APIRoute`)

## Integration Points
- **Used by**:
  - CLI `list` and `search` commands (fetch counts for display)
- **Consumes**:
  - Cloudflare KV (DATA namespace, reads `stars:*` and `downloads:*` keys)
- **Emits**: JSON responses

## Key Logic

### GET /api/stats/counts

Returns:
```json
{
  "stars": {
    "@user/name": 42,
    "@other/skillset": 15
  },
  "downloads": {
    "@user/name": 1234,
    "@other/skillset": 567
  }
}
```

Flow:
1. List all KV keys with `stars:` prefix
2. List all KV keys with `downloads:` prefix
3. Fetch all values in parallel (batch get)
4. Build maps: strip prefix from keys, parse counts
5. Return aggregated response with 60s cache header

### Helper: buildCountsMap
- Strips KV key prefix (`stars:`, `downloads:`)
- Parses integer values (defaults to 0 on null)
- Returns `Record<string, number>` map

### Caching
- **Cache-Control**: `public, max-age=60` (1 minute)
- Public cache (no user-specific data)
- Reduces KV reads for frequent CLI usage
- CDN can cache response at edge

### Error Handling
- KV list/get failures: 500 error
- Logs errors for debugging
- No fallback (CLI shows error)
