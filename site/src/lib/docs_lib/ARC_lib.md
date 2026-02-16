# Lib Architecture

## Overview
Server-side utility libraries for authentication, star management, download tracking, data access, API responses, HTML sanitization, input validation, maintainer authorization, and ghost entry reservations. All libraries are stateless functions operating on Cloudflare KV and environment bindings (except reservation-do.ts which is a Durable Object).

## Directory Structure
```
lib/
├── docs_lib/                  # Library documentation
│   ├── ARC_lib.md
│   ├── auth.md
│   ├── data.md
│   ├── downloads.md
│   ├── maintainer.md
│   ├── rate-limit.md
│   ├── reservation-do.md
│   ├── responses.md
│   ├── sanitize.md
│   ├── stars.md
│   └── validation.md
├── tests_lib/                 # Library tests
│   ├── test-utils.ts
│   ├── auth.test.ts
│   ├── data.test.ts
│   ├── downloads.test.ts
│   ├── maintainer.test.ts
│   ├── reservation-do.test.ts
│   ├── sanitize.test.ts
│   ├── stars.test.ts
│   └── validation.test.ts
├── auth.ts                    # GitHub OAuth + JWT session management
├── data.ts                    # Search index access (build-time)
├── downloads.ts               # Download counting
├── maintainer.ts              # Maintainer authorization logic
├── rate-limit.ts              # Bucketed KV rate limiters (minute + hour)
├── reservation-do.ts          # Ghost entry reservation Durable Object
├── responses.ts               # JSON response helpers
├── sanitize.ts                # XSS protection for README content
├── stars.ts                   # Star/unstar with rate limiting
└── validation.ts              # Input validation (skillset ID format)
```

## Components

| Library | Purpose | Key Exports |
|---------|---------|-------------|
| **auth.ts** | GitHub OAuth with PKCE, JWT sessions | initiateOAuth, handleOAuthCallback, createSessionToken, verifySessionToken |
| **data.ts** | Read-only search index access | getSkillsets, getSkillsetById, getAllTags |
| **downloads.ts** | Download count tracking | incrementDownloads, getDownloadCount, isDownloadRateLimited |
| **maintainer.ts** | Maintainer authorization | isMaintainer |
| **rate-limit.ts** | Bucketed KV rate limiters | isMinuteRateLimited, isHourlyRateLimited |
| **reservation-do.ts** | Ghost entry reservation coordination (Durable Object) | ReservationCoordinator, getReservationStub |
| **responses.ts** | Standardized JSON responses | jsonResponse, errorResponse |
| **sanitize.ts** | XSS protection for HTML and URL validation | sanitizeHtml, sanitizeUrl |
| **stars.ts** | Star/unstar with rate limiting | toggleStar, isStarred, getStarCount, isRateLimited |
| **validation.ts** | Input validation for API requests | isValidSkillsetId |

## Data Flow

### Authentication Flow
```
User → /login
  ↓
initiateOAuth() → Generate state + PKCE → Store in KV
  ↓
Redirect to GitHub
  ↓
GitHub → /callback?code={code}&state={state}
  ↓
handleOAuthCallback() → Validate state → Exchange code → Fetch user
  ↓
createSessionToken() → JWT with HMAC-SHA256
  ↓
Set httpOnly cookie → Redirect to returnTo
```

### Star Flow
```
POST /api/star
  ↓
getSessionFromRequest() → Verify JWT
  ↓
isRateLimited() → Check 10 ops/min limit
  ↓
toggleStar() → Read user stars + count → Update both in KV
  ↓
Return { starred, count }
```

### Download Flow
```
POST /api/downloads
  ↓
isDownloadRateLimited() → Check 30 downloads/hr per IP
  ↓
incrementDownloads() → Read count → Increment → Write
  ↓
Return new count
```

### Reservation Flow
```
GET /api/reservations (status)
  ↓
DO stub → /status → Return all slot states + config
  ↓
POST /api/reservations (reserve)
  ↓
DO stub → /reserve → Atomic write (slot + user index)
  ↓
Return { batchId, expiresAt }
  ↓
DELETE /api/reservations (release)
  ↓
DO stub → /release → Atomic delete (slot + user index)
  ↓
Return { released: batchId }
```

### Data Access Flow
```
Build time: GitHub Action generates search-index.json
  ↓
Astro imports search-index.json at build time
  ↓
getSkillsets() → Return sorted by stars
  ↓
Pages use build-time data (no runtime GitHub API calls)
```

## Integration Points

### Internal Dependencies
- `@/types` (Skillset, SearchIndex interfaces)
- `../../public/search-index.json` (build-time import in data.ts)

### External Dependencies
- Cloudflare KV API (AUTH, DATA namespaces)
- Cloudflare Durable Objects (RESERVATIONS namespace)
- Web Crypto API (HMAC-SHA256, random UUID/bytes)
- GitHub OAuth API (authorization, token exchange, user profile)
- `xss` (js-xss library for HTML sanitization)

### Used By
- `pages/login.ts`, `pages/callback.ts`, `pages/logout.ts` (auth flow)
- `pages/api/star.ts` (star operations)
- `pages/api/downloads.ts` (download tracking)
- `pages/api/stats/counts.ts` (bulk stats)
- `pages/api/reservations.ts`, `pages/api/reservations/config.ts`, `pages/api/reservations/verify.ts`, `pages/api/reservations/submit.ts`, `pages/api/reservations/lookup.ts` (reservation operations)
- `pages/index.astro`, `pages/browse.astro`, `pages/skillset/[namespace]/[name].astro` (data access)

## Design Patterns

### Stateless Functions
- No module-level state
- All state in KV or JWT
- Pure functions (deterministic given same inputs)

### Environment Abstraction
- `Env` interface for Cloudflare bindings (KV, secrets)
- Passed as parameter to all functions
- Type-safe access to environment variables

### Error Handling
- Custom `AuthError` class with status code
- Graceful fallbacks (e.g., sanitize.ts allows safe HTML on XSS library failure)
- Logging to console (Cloudflare Workers dashboard)

### Security
- CSRF protection (cryptographically random state)
- PKCE for OAuth (prevents code interception)
- Rate limiting (10 ops/min for stars per user, 30 downloads/hr per IP)
- JWT with HMAC-SHA256 (7-day expiry)
- XSS protection (whitelist-based HTML filtering)
- Input validation (skillset ID format checks prevent KV key injection)
- Maintainer authorization (allowlist-based access control)

### Retry Logic
- Exponential backoff on KV 429 errors (stars.ts)
- 3 retry attempts with doubling delay (100ms, 200ms, 400ms)
- No retry on auth failures (immediate error)

## KV Storage Schema

### AUTH Namespace
```
oauth:{state} → { codeVerifier, returnTo } (5-min TTL)
```

### DATA Namespace
```
stars:{skillsetId}                  → "42" (star count)
user:{userId}:stars                 → ["id1", "id2"] (starred skillset IDs)
downloads:{skillsetId}              → "123" (download count)
ratelimit:star:{userId}:{minute}    → "3" (star rate limit, 120s TTL)
ratelimit:dl:{ip}:{hour}            → "7" (download rate limit, 7200s TTL)
ratelimit:{prefix}:{id}:{bucket}    → "N" (generic bucketed rate limit counter)
```

### RESERVATIONS Durable Object Storage
```
slot:{batchId} → SlotData (discriminated union: reserved or submitted)
user:{userId}  → string (batch ID user has reserved)
config         → { totalGhostSlots, ttlDays, cohort }
```

## Performance Considerations
- Build-time data loading (no runtime GitHub API for search index)
- Batch API in stats/counts.ts (single request for all counts)
- KV caching with TTLs (rate limits, OAuth state)
- Exponential backoff prevents KV throttling cascades

## Known Limitations
- **stats/counts.ts KV list pagination**: `KV.list()` returns max 1000 keys per call. The `GET /api/stats/counts` endpoint does not paginate, so it will silently drop entries if the registry grows past ~1000 skillsets. Pagination with cursor-based iteration should be added when the registry approaches this scale.
