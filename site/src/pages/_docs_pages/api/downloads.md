# api/downloads.ts

## Purpose
Download tracking API endpoint for incrementing skillset download counts. Called by CLI on successful installation. Uses IP-based rate limiting to prevent abuse.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `POST` | APIRoute | Increment download count for a skillset |

## Dependencies
- **Internal**:
  - `lib/auth` (`Env`)
  - `lib/downloads` (`incrementDownloads`, `isDownloadRateLimited`)
  - `lib/responses` (`jsonResponse`, `errorResponse`)
  - `lib/validation` (`isValidSkillsetId`)
- **External**:
  - `astro` (`APIRoute`)

## Integration Points
- **Used by**:
  - CLI `install` command (increments count on successful installation)
- **Consumes**:
  - Cloudflare KV (DATA namespace for download counts, rate limits)
  - Cloudflare request headers (CF-Connecting-IP, X-Forwarded-For)
- **Emits**: JSON responses

## Key Logic

### POST /api/downloads

Request body:
```json
{ "skillset": "@user/name" }
```

Flow:
1. Extract client IP from Cloudflare headers (`CF-Connecting-IP` or `X-Forwarded-For`)
2. Check IP-based rate limit (30 downloads/hour per IP)
3. Validate JSON body and skillset format
4. Call `incrementDownloads()` to increment count in KV
5. Return result: `{ skillset, count }`

Error responses:
- 429 if rate limited (30 downloads/hour exceeded)
- 400 if missing or invalid skillset format
- 500 on KV failure

### Rate Limiting
- **Limit**: 30 download operations per hour per IP
- **Implementation**: KV-based with rolling window
- **Key**: `ratelimit:download:{ip}`
- **Rationale**: Prevent spam while allowing legitimate batch installs

### Security
- No authentication required (CLI calls without user session)
- IP-based rate limiting prevents abuse
- skillsetId validation prevents injection attacks
- Uses Cloudflare's trusted IP headers
