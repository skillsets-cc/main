# API Routes

Cloudflare Workers API endpoints for the skillsets.cc site. Covers star/download tracking, session introspection and GDPR erasure, and a reservation system for ghost entry slots backed by a Durable Object.

## Architecture

```
site/src/pages/api/
├── downloads/
│   ├── start.ts            # GET (count) + POST (issue nonce) — step 1
│   └── complete.ts         # POST (consume nonce + increment) — step 2
├── me.ts                   # GET session info + DELETE GDPR erasure
├── star.ts                 # GET (count+status) + POST (toggle) star operations
├── reservations.ts         # GET/POST/DELETE reservation lifecycle
├── reservations/
│   ├── config.ts           # POST config update (maintainer-only)
│   ├── lookup.ts           # GET lookup batch ID by GitHub ID (CLI init)
│   ├── submit.ts           # POST mark slot submitted (maintainer-only)
│   └── verify.ts           # GET verify reservation for CI
├── _docs_api/               # Documentation
└── _tests_api/              # Vitest tests
```

## Files

| File | Purpose | Documentation |
|------|---------|---------------|
| — | Architecture overview | [ARC_api.md](./_docs_api/ARC_api.md) |
| `downloads/` | Download tracking (nonce protocol) | [downloads.md](./_docs_api/downloads.md) |
| `downloads/start.ts` | Issue nonce + fetch count | [Docs](./_docs_api/downloads/start.md) |
| `downloads/complete.ts` | Consume nonce + increment counter | [Docs](./_docs_api/downloads/complete.md) |
| `me.ts` | Session introspection + GDPR erasure (GET + DELETE) | [Docs](./_docs_api/me.md) |
| `star.ts` | Star toggle and status (authenticated + anonymous) | [Docs](./_docs_api/star.md) |
| `reservations.ts` | Ghost slot reservation lifecycle (GET/POST/DELETE) | [Docs](./_docs_api/reservations.md) |
| `reservations/config.ts` | Update reservation system config (maintainer-only) | [Docs](./_docs_api/reservations/config.md) |
| `reservations/lookup.ts` | Look up batch ID by GitHub user ID (CLI) | [Docs](./_docs_api/reservations/lookup.md) |
| `reservations/submit.ts` | Mark reservation as submitted/fulfilled (maintainer) | [Docs](./_docs_api/reservations/submit.md) |
| `reservations/verify.ts` | Verify reservation ownership for CI validation | [Docs](./_docs_api/reservations/verify.md) |
