# counts.ts

## Purpose
Bulk stats endpoint that returns all star and download counts in a single response. Used by the CLI to fetch aggregate metrics for display in `search` and `list` commands without making per-skillset API calls.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `GET` | APIRoute | Returns `{ stars, downloads }` maps of skillsetId → count; cached 60s |

## Dependencies
- **Internal**:
  - `lib/auth` (Env type for KV access)
  - `lib/responses` (jsonResponse, errorResponse)
- **External**:
  - `astro` (APIRoute type)

## Integration Points
- **Used by**:
  - `npx skillsets search` and `npx skillsets list` CLI commands
- **Consumes**:
  - Cloudflare KV (DATA namespace) — lists all `stars:*` and `downloads:*` keys
- **Emits**: `{ stars: Record<skillsetId, count>, downloads: Record<skillsetId, count> }`

## Key Logic

### GET /api/stats/counts
1. List all KV keys with prefix `stars:` and `downloads:` in parallel
2. Fetch all values for each key set in parallel
3. Build maps using `buildCountsMap()`: strips prefix, parses count as int, defaults to `0`
4. Return combined response with `Cache-Control: public, max-age=60`

### buildCountsMap(keys, values, prefix)
Private helper that converts parallel arrays of KV keys + values into a `Record<skillsetId, number>` by stripping the prefix from each key.

### Performance
- Two `Promise.all()` calls: one for listing, one for bulk-fetching values
- 60-second CDN cache reduces KV read pressure
- No auth check — entirely public endpoint

### Error Responses
- 500: Internal server error (KV list/get failures)
