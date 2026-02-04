# Lib Architecture

## Overview
Server-side utility libraries for authentication, star management, download tracking, data access, API responses, and HTML sanitization. All libraries are stateless functions operating on Cloudflare KV and environment bindings.

## Directory Structure
```
lib/
├── docs_lib/                  # Library documentation
│   ├── auth.md
│   ├── stars.md
│   ├── data.md
│   ├── downloads.md
│   ├── responses.md
│   └── sanitize.md
├── __tests__/                 # Library tests
│   ├── test-utils.ts
│   ├── auth.test.ts
│   ├── stars.test.ts
│   ├── downloads.test.ts
│   └── sanitize.test.ts
├── auth.ts                    # GitHub OAuth + JWT session management
├── stars.ts                   # Star/unstar with rate limiting
├── data.ts                    # Search index access (build-time)
├── downloads.ts               # Download counting
├── responses.ts               # JSON response helpers
└── sanitize.ts                # XSS protection for README content
```

## Components

| Library | Purpose | Key Exports |
|---------|---------|-------------|
| **auth.ts** | GitHub OAuth with PKCE, JWT sessions | initiateOAuth, handleOAuthCallback, createSessionToken, verifySessionToken |
| **stars.ts** | Star/unstar with rate limiting | toggleStar, isStarred, getStarCount, isRateLimited |
| **data.ts** | Read-only search index access | getSkillsets, getSkillsetById, getAllTags |
| **downloads.ts** | Download count tracking | incrementDownloads, getDownloadCount |
| **responses.ts** | Standardized JSON responses | jsonResponse, errorResponse |
| **sanitize.ts** | XSS protection for HTML and URL validation | sanitizeHtml, sanitizeUrl |

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
incrementDownloads() → Read count → Increment → Write
  ↓
Return new count
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
- Web Crypto API (HMAC-SHA256, random UUID/bytes)
- GitHub OAuth API (authorization, token exchange, user profile)
- `xss` (js-xss library for HTML sanitization)

### Used By
- `pages/login.ts`, `pages/callback.ts`, `pages/logout.ts` (auth flow)
- `pages/api/star.ts` (star operations)
- `pages/api/downloads.ts` (download tracking)
- `pages/api/stats/counts.ts` (bulk stats)
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
- Rate limiting (10 ops/min per user)
- JWT with HMAC-SHA256 (7-day expiry)
- XSS protection (whitelist-based HTML filtering)

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
stars:{skillsetId}       → "42" (star count)
user:{userId}:stars      → ["id1", "id2"] (starred skillset IDs)
downloads:{skillsetId}   → "123" (download count)
ratelimit:{userId}       → "7" (request count, 60s TTL)
```

## Performance Considerations
- Build-time data loading (no runtime GitHub API for search index)
- Batch API in stats/counts.ts (single request for all counts)
- KV caching with TTLs (rate limits, OAuth state)
- Exponential backoff prevents KV throttling cascades
