# downloads.ts

## Purpose
API endpoint for tracking skillset downloads. Called by the CLI after successful installation to increment the download counter in Cloudflare KV. No authentication required (public metric).

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `GET` | APIRoute | Get download count for a skillset by `?skillsetId=` query param; cached 60s |
| `POST` | APIRoute | Increment download count for a skillset, return new count |

## Dependencies
- **Internal**:
  - `lib/auth` (Env type for KV access)
  - `lib/downloads` (incrementDownloads, isDownloadRateLimited, getDownloadCount)
  - `lib/responses` (jsonResponse, errorResponse, parseJsonBody)
  - `lib/validation` (isValidSkillsetId)
- **External**:
  - `astro` (APIRoute type)

## Integration Points
- **Used by**:
  - `npx skillsets install <name>` CLI command (increments on successful install)
- **Consumes**:
  - Cloudflare KV (DATA namespace, reuses namespace for download counters)
- **Emits**: JSON response with new download count

## Key Logic

### GET /api/downloads?skillsetId=
1. Validate `skillsetId` query param presence and format
2. Call `getDownloadCount()` to fetch current count from KV
3. Return `{ skillsetId, count }` with `Cache-Control: public, max-age=60`

### POST /api/downloads
1. Extract IP from `CF-Connecting-IP` or `X-Forwarded-For` headers
2. Check rate limit: 30 downloads per hour per IP (429 if exceeded)
3. Parse request body: `{ skillset: string }`
4. Validate skillset format: `/^@?[\w-]+\/[\w-]+$/` (prevent KV injection)
5. Call `incrementDownloads()` to increment counter
6. Return `{ skillset: string, count: number }`

### Security
- **No authentication required**: Public metric (anyone can increment)
- **IP-based rate limiting**: 30 downloads per hour per IP (prevent abuse)
- **SkillsetId validation**: Prevents KV key injection attacks
- **IP extraction**: Cloudflare-specific headers for accurate IP tracking

### Error Responses
- 400: Missing or invalid skillset format
- 429: Rate limit exceeded (30 downloads/hr per IP)
- 500: Internal server error (KV failures)

### KV Storage
- Uses same KV namespace as stars (env.DATA) for simplicity
- Key format: `downloads:{skillsetId}`
- Value: Download count as string
