# API Routes Architecture

## Overview
The `site/src/pages/api/` directory contains all Cloudflare Workers API endpoints for the skillsets.cc site. Routes cover star/download tracking, user session introspection, aggregate stats for the CLI, and a full reservation system for managing ghost entry slots backed by a Durable Object.

## Directory Structure
```
site/src/pages/api/
├── downloads.ts            # GET (count) + POST (increment) download tracking
├── me.ts                   # GET authenticated user info (session introspection)
├── star.ts                 # GET (count+status) + POST (toggle) star operations
├── reservations.ts         # GET/POST/DELETE reservation slots (proxies to DO)
├── reservations/
│   ├── config.ts           # POST update reservation config (maintainer-only)
│   ├── lookup.ts           # GET lookup by GitHub ID (public, for CLI init)
│   ├── submit.ts           # POST mark slot submitted (maintainer-only, terminal)
│   └── verify.ts           # GET verify reservation for CI validation
├── stats/
│   └── counts.ts           # GET bulk star+download counts (for CLI search/list)
├── docs_api/               # Documentation
└── tests_api/              # Vitest test files
```

## Components

| Component | Purpose | Key Exports |
|-----------|---------|-------------|
| `downloads.ts` | Download count tracking | `GET`, `POST` |
| `me.ts` | Session introspection | `GET` |
| `star.ts` | Star toggle and status | `GET`, `POST` |
| `reservations.ts` | Ghost slot reservation lifecycle | `GET`, `POST`, `DELETE`, `isReservationRateLimited` |
| `reservations/config.ts` | Reservation system config (maintainer) | `POST` |
| `reservations/lookup.ts` | Batch ID lookup by GitHub ID | `GET` |
| `reservations/submit.ts` | Mark slot submitted (maintainer) | `POST` |
| `reservations/verify.ts` | Verify reservation for CI | `GET` |
| `stats/counts.ts` | Bulk star+download counts for CLI | `GET` |

## Data Flow

### Public metrics (stars, downloads)
```
CLI install → POST /api/downloads → lib/downloads → KV (DATA)
StarButton  → POST /api/star     → lib/stars     → KV (DATA)
StarButton  → GET  /api/star     → lib/stars     → KV (DATA)
CLI list    → GET  /api/stats/counts → KV list   → bulk response
```

### Authentication flow
```
Browser → GET /api/me → lib/auth.getSessionFromRequest → JWT cookie → { login }
```

### Reservation system
```
Frontend → GET  /api/reservations          → ReservationCoordinator DO (/status)
Frontend → POST /api/reservations          → rate limit + auth → DO (/reserve)
Frontend → DELETE /api/reservations        → rate limit + auth → DO (/release)
CLI init → GET  /api/reservations/lookup   → rate limit → DO (/lookup)
CI       → GET  /api/reservations/verify   → rate limit → DO (/verify)
Maintainer → POST /api/reservations/config → auth + maintainer → DO (/config)
Maintainer → POST /api/reservations/submit → auth + maintainer → DO (/submit)
```

## Integration Points

### Consumed by
- **Frontend components**: `StarButton.tsx`, `GhostCard.tsx`, `AuthStatus.tsx`, `DownloadCount.tsx`
- **CLI commands**: `install` (downloads), `search`/`list` (stats/counts), `init` (reservations/lookup)
- **GitHub Actions**: `validate-submission.yml` (reservations/verify)

### Depends on
- **`lib/auth`**: `getSessionFromRequest`, `Env` type
- **`lib/stars`**: `toggleStar`, `isRateLimited`, `isStarred`, `getStarCount`
- **`lib/downloads`**: `incrementDownloads`, `isDownloadRateLimited`, `getDownloadCount`
- **`lib/rate-limit`**: `isHourlyRateLimited` (reservations, lookup, verify)
- **`lib/reservation-do`**: `getReservationStub`, `BATCH_ID_REGEX`
- **`lib/maintainer`**: `isMaintainer` (config, submit endpoints)
- **`lib/responses`**: `jsonResponse`, `errorResponse`, `parseJsonBody`
- **`lib/validation`**: `isValidSkillsetId`
- **Cloudflare KV** (`DATA` namespace): stars, downloads, rate limits
- **`ReservationCoordinator` Durable Object**: all reservation state

## Security Patterns

| Endpoint | Auth | Rate Limit |
|----------|------|------------|
| `GET /api/downloads` | None | None |
| `POST /api/downloads` | None | 30/hr per IP |
| `GET /api/me` | Session required | None |
| `GET /api/star` | Optional (anonymous ok) | None |
| `POST /api/star` | Session required | 10 ops/min per user |
| `GET /api/stats/counts` | None | None (CDN cached 60s) |
| `GET /api/reservations` | Optional (enhances response) | None |
| `POST /api/reservations` | Session required | 5 ops/hr per user |
| `DELETE /api/reservations` | Session required | 5 ops/hr per user |
| `POST /api/reservations/config` | Session + maintainer | None |
| `GET /api/reservations/lookup` | None | 30 req/hr per IP |
| `POST /api/reservations/submit` | Session + maintainer | None |
| `GET /api/reservations/verify` | None | 30 req/hr per IP |
