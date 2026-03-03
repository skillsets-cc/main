# API Routes

Cloudflare Workers API endpoints for the skillsets.cc site. Covers star/download tracking, session introspection, bulk stats for the CLI, and a reservation system for ghost entry slots backed by a Durable Object.

## Architecture

```
site/src/pages/api/
├── downloads.ts            # GET (count) + POST (increment) download tracking
├── me.ts                   # GET session introspection
├── star.ts                 # GET (count+status) + POST (toggle) star operations
├── reservations.ts         # GET/POST/DELETE reservation lifecycle
├── reservations/
│   ├── config.ts           # POST config update (maintainer-only)
│   ├── lookup.ts           # GET lookup batch ID by GitHub ID (CLI init)
│   ├── submit.ts           # POST mark slot submitted (maintainer-only)
│   └── verify.ts           # GET verify reservation for CI
├── stats/
│   └── counts.ts           # GET bulk star+download counts (CLI)
├── docs_api/               # Documentation
└── tests_api/              # Vitest tests
```

## Files

| File | Purpose | Documentation |
|------|---------|---------------|
| — | Architecture overview | [ARC_api.md](./docs_api/ARC_api.md) |
| `downloads.ts` | Download count tracking (GET count, POST increment) | [Docs](./docs_api/downloads.md) |
| `me.ts` | Session introspection for auth status checks | [Docs](./docs_api/me.md) |
| `star.ts` | Star toggle and status (authenticated + anonymous) | [Docs](./docs_api/star.md) |
| `reservations.ts` | Ghost slot reservation lifecycle (GET/POST/DELETE) | [Docs](./docs_api/reservations.md) |
| `reservations/config.ts` | Update reservation system config (maintainer-only) | [Docs](./docs_api/reservations/config.md) |
| `reservations/lookup.ts` | Look up batch ID by GitHub user ID (CLI) | [Docs](./docs_api/reservations/lookup.md) |
| `reservations/submit.ts` | Mark reservation as submitted/fulfilled (maintainer) | [Docs](./docs_api/reservations/submit.md) |
| `reservations/verify.ts` | Verify reservation ownership for CI validation | [Docs](./docs_api/reservations/verify.md) |
| `stats/counts.ts` | Bulk star and download counts for CLI display | [Docs](./docs_api/stats/counts.md) |
