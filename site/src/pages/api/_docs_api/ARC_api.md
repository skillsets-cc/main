# API Routes Architecture

## Overview
The `site/src/pages/api/` directory contains all Cloudflare Workers API endpoints for the skillsets.cc site. Routes cover star/download tracking, user session introspection and GDPR erasure, and a full reservation system for managing ghost entry slots backed by a Durable Object.

## Directory Structure
```
site/src/pages/api/
├── downloads/
│   ├── start.ts            # GET (count) + POST (issue nonce) — step 1 of download tracking
│   └── complete.ts         # POST (consume nonce + increment) — step 2 of download tracking
├── me.ts                   # GET session info + DELETE GDPR erasure
├── star.ts                 # GET (count+status) + POST (toggle) star operations
├── reservations.ts         # GET/POST/DELETE reservation slots (proxies to DO)
├── reservations/
│   ├── config.ts           # POST update reservation config (maintainer-only)
│   ├── lookup.ts           # GET lookup by GitHub ID (public, for CLI init)
│   ├── submit.ts           # POST mark slot submitted (maintainer-only, terminal)
│   └── verify.ts           # GET verify reservation for CI validation
├── _docs_api/               # Documentation
└── _tests_api/              # Vitest test files
```

## Components

| Component | Purpose | Key Exports |
|-----------|---------|-------------|
| `downloads/start.ts` | Issue download nonce + fetch count | `GET`, `POST` |
| `downloads/complete.ts` | Consume nonce + increment counter | `POST` |
| `me.ts` | Session introspection + GDPR erasure | `GET`, `DELETE` |
| `star.ts` | Star toggle and status | `GET`, `POST` |
| `reservations.ts` | Ghost slot reservation lifecycle | `GET`, `POST`, `DELETE` |
| `reservations/config.ts` | Reservation system config (maintainer) | `POST` |
| `reservations/lookup.ts` | Batch ID lookup by GitHub ID | `GET` |
| `reservations/submit.ts` | Mark slot submitted (maintainer) | `POST` |
| `reservations/verify.ts` | Verify reservation for CI | `GET` |

## Data Flow

### Public metrics (stars, downloads)
```
CLI install → POST /api/downloads/start   → lib/downloads.createDownloadNonce → KV (nonce)
CLI install → POST /api/downloads/complete → lib/downloads.consumeDownloadNonce + incrementDownloads → KV
StarButton  → POST /api/star              → lib/stars.toggleStar     → KV (DATA)
StarButton  → GET  /api/star              → lib/stars.getStarCount   → KV (DATA)
```

### Authentication / account management
```
Browser  → GET    /api/me → lib/auth.getSessionFromRequest → JWT cookie → { login, stars }
Browser  → DELETE /api/me → verify session → purge KV keys → revoke token → { deleted: true }
```

### Reservation system
```
Frontend   → GET    /api/reservations          → ReservationCoordinator DO (/status)
Frontend   → POST   /api/reservations          → rate limit (2/day) + auth → DO (/reserve)
Frontend   → DELETE /api/reservations          → rate limit (2/day) + auth → DO (/release)
CLI init   → GET    /api/reservations/lookup   → rate limit → DO (/lookup)
CI         → GET    /api/reservations/verify   → rate limit → DO (/verify)
Maintainer → POST   /api/reservations/config   → auth + maintainer → DO (/config)
Maintainer → POST   /api/reservations/submit   → auth + maintainer → DO (/submit)
```

## Integration Points

### Consumed by
- **Frontend components**: `StarButton.tsx`, `GhostCard.tsx`, `AuthStatus.tsx`, `DownloadCount.tsx`
- **CLI commands**: `install` (downloads/start + complete), `init` (reservations/lookup)
- **GitHub Actions**: `validate-submission.yml` (reservations/verify)

### Depends on
- **`lib/auth`**: `getSessionFromRequest`, `getTokenFromRequest`, `createLogoutCookie`, `revokeSessionToken`
- **`lib/stars`**: `toggleStar`, `isStarred`, `getStarCount`
- **`lib/downloads`**: `createDownloadNonce`, `consumeDownloadNonce`, `incrementDownloads`, `getDownloadCount`
- **`lib/rate-limit`**: `checkRateLimit`, `checkDailyLimit`, `recordBreach`, `hashIp`, `PREFIX_REGISTRY`
- **`lib/reservation-do`**: `getReservationStub`, `BATCH_ID_REGEX`
- **`lib/maintainer`**: `isMaintainer` (config, submit endpoints)
- **`lib/responses`**: `jsonResponse`, `errorResponse`, `parseJsonBody`, `getEnv`
- **`lib/validation`**: `isValidSkillsetId`
- **Cloudflare KV** (`DATA` namespace): stars, downloads, nonces, rate limits
- **`ReservationCoordinator` Durable Object**: all reservation state

## Security Patterns

| Endpoint | Auth | Rate Limit |
|----------|------|------------|
| `GET /api/downloads/start` | None | None (CDN cached 60s) |
| `POST /api/downloads/start` | None | 5/day per IP (breach threshold 3, freeze on 4th) |
| `POST /api/downloads/complete` | None | None (nonce is single-use, IP-bound) |
| `GET /api/me` | Session required | None |
| `DELETE /api/me` | Session required | 1/day (GDPR — no freeze gate) |
| `GET /api/star` | Optional (anonymous ok) | None |
| `POST /api/star` | Session required | 10/day per user (breach threshold 3) |
| `GET /api/reservations` | Optional (enhances response) | None |
| `POST /api/reservations` | Session required | 2/day per user (breach threshold 0 — immediate freeze) |
| `DELETE /api/reservations` | Session required | 2/day per user (shared counter with POST) |
| `POST /api/reservations/config` | Session + maintainer | None |
| `GET /api/reservations/lookup` | None | Rate limited per IP |
| `POST /api/reservations/submit` | Session + maintainer | None |
| `GET /api/reservations/verify` | None | Rate limited per IP |
