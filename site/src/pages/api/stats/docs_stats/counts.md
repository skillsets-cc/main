# counts.ts

## Purpose
Bulk statistics endpoint that returns all star and download counts for all skillsets in a single request. Used by the CLI and frontend components to efficiently fetch metrics without making per-skillset API calls.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `GET` | APIRoute | Return all star and download counts as JSON with caching header |

## Dependencies
- **Internal**:
  - `lib/auth` (Env type for KV access)
  - `lib/responses` (jsonResponse, errorResponse)
- **External**:
  - `astro` (APIRoute type)

## Integration Points
- **Used by**:
  - `npx skillsets list` CLI command (display star/download counts)
  - `components/SkillsetGrid.tsx` (fetch live star counts)
  - `components/DownloadCount.tsx` (fetch download count)
- **Consumes**:
  - Cloudflare KV (DATA namespace)
- **Emits**: JSON response with all counts

## Key Logic

### GET /api/stats/counts
1. List all KV keys with `stars:` prefix
2. List all KV keys with `downloads:` prefix
3. Fetch values for all star keys in parallel
4. Fetch values for all download keys in parallel
5. Build counts maps by stripping prefixes from keys
6. Return `{ stars: {...}, downloads: {...} }` with 60s cache header

### Response Format
```json
{
  "stars": {
    "@user/skillset-a": 42,
    "@user/skillset-b": 7
  },
  "downloads": {
    "@user/skillset-a": 123,
    "@user/skillset-b": 56
  }
}
```

### Performance
- **Parallel fetching**: Uses `Promise.all` for concurrent KV reads
- **Caching**: `Cache-Control: public, max-age=60` reduces load
- **Batch operation**: Single request replaces N individual API calls

### Limitations
- **No pagination**: Assumes small dataset (< 1000 skillsets)
- **KV list limit**: Cloudflare KV list() returns max 1000 keys by default
- **Cold start**: First request may be slow if many skillsets exist

### Error Responses
- 500: Internal server error (KV failures)
