# Lib

## Purpose
Server-side utility libraries for the Skillsets.cc platform. Provides authentication, star management, download tracking, data access, API responses, HTML sanitization, input validation, maintainer authorization, and ghost entry reservations.

## Architecture
```
lib/
├── docs_lib/                  # Library documentation
│   ├── ARC_lib.md             # Architecture overview
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
├── __tests__/                 # Library tests
│   ├── test-utils.ts
│   ├── auth.test.ts
│   ├── downloads.test.ts
│   ├── maintainer.test.ts
│   ├── reservation-do.test.ts
│   ├── sanitize.test.ts
│   └── validation.test.ts
├── auth.ts                    # GitHub OAuth + JWT session management
├── data.ts                    # Search index access (build-time)
├── downloads.ts               # Download counting
├── maintainer.ts              # Maintainer authorization logic
├── rate-limit.ts              # Hour-bucketed KV rate limiter
├── reservation-do.ts          # Ghost entry reservation Durable Object
├── responses.ts               # JSON response helpers
├── sanitize.ts                # XSS protection for README content
├── stars.ts                   # Star/unstar with rate limiting
└── validation.ts              # Input validation (skillset ID format)
```

## Files

| File | Purpose | Documentation |
|------|---------|---------------|
| — | Architecture overview | [ARC_lib.md](./docs_lib/ARC_lib.md) |
| `auth.ts` | GitHub OAuth 2.0 with PKCE and CSRF protection, JWT session management | [Docs](./docs_lib/auth.md) |
| `data.ts` | Read-only access to build-time search index, skillset queries | [Docs](./docs_lib/data.md) |
| `downloads.ts` | Download counter with IP-based rate limiting (30/hr) | [Docs](./docs_lib/downloads.md) |
| `maintainer.ts` | Check if user is in maintainer allowlist (MAINTAINER_USER_IDS) | [Docs](./docs_lib/maintainer.md) |
| `rate-limit.ts` | Hour-bucketed KV rate limiter with auto-expiring counters | [Docs](./docs_lib/rate-limit.md) |
| `reservation-do.ts` | Durable Object for ghost entry slot reservations with atomic operations | [Docs](./docs_lib/reservation-do.md) |
| `responses.ts` | Standardized JSON response helpers for API routes | [Docs](./docs_lib/responses.md) |
| `sanitize.ts` | XSS protection via whitelist-based HTML sanitization and URL protocol validation | [Docs](./docs_lib/sanitize.md) |
| `stars.ts` | Star/unstar operations with user-based rate limiting (10 ops/min) | [Docs](./docs_lib/stars.md) |
| `validation.ts` | Validate skillset ID format to prevent KV key injection | [Docs](./docs_lib/validation.md) |
