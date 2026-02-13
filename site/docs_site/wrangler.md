# wrangler.toml

## Overview
**Purpose**: Cloudflare Workers deployment configuration — worker bindings for KV namespaces, Durable Objects, environment variables, and static asset serving.

## Worker Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| `name` | `skillsets-site` | Worker name on Cloudflare |
| `main` | `dist/_worker.js/index.js` | Astro build output entry point |
| `compatibility_date` | `2026-01-30` | Workers runtime version |
| `compatibility_flags` | `["nodejs_compat"]` | Enables Node.js APIs (`Buffer`, `crypto`, etc.) |

## Bindings

### KV Namespaces
| Binding | Purpose | Key Patterns |
|---------|---------|-------------|
| `DATA` | Stars, downloads, rate limits | `stars:*`, `downloads:*`, `ratelimit:*`, `dl-rate:*` |
| `AUTH` | OAuth state storage | `oauth:*` (5-min TTL) |

### Durable Objects
| Binding | Class | Purpose |
|---------|-------|---------|
| `RESERVATIONS` | `ReservationCoordinator` | Atomic ghost entry slot management |

### Static Assets
| Setting | Value | Purpose |
|---------|-------|---------|
| `assets.binding` | `ASSETS` | Serves static files from `./dist` |
| `assets.directory` | `./dist` | Astro build output directory |

### Environment Variables
| Variable | Method | Purpose |
|----------|--------|---------|
| `CALLBACK_URL` | `[vars]` | OAuth redirect URI (non-secret) |
| `SITE_URL` | `[vars]` | Base URL for redirects (non-secret) |
| `GITHUB_CLIENT_ID` | `wrangler secret put` | OAuth app ID |
| `GITHUB_CLIENT_SECRET` | `wrangler secret put` | OAuth app secret |
| `JWT_SECRET` | `wrangler secret put` | HMAC signing key for session tokens |

## Migrations
| Tag | Change |
|-----|--------|
| `v1` | Create `ReservationCoordinator` SQLite-backed Durable Object |

## Integration Points
- **astro.config.mjs**: Builds the `dist/` output this config serves
- **src/worker.ts**: Custom entry point exports `ReservationCoordinator` class
- **src/lib/auth.ts**: Reads `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `JWT_SECRET`, `CALLBACK_URL`, `SITE_URL` from env
- **DEPLOYMENT.md**: Full deployment instructions
