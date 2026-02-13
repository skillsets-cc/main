# astro.config.mjs

## Overview
**Purpose**: Astro framework configuration — sets SSR output mode, Cloudflare Workers adapter with Durable Object exports, and React + Tailwind integrations.

## Key Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| `output` | `'server'` | SSR mode (all pages rendered on-demand unless `prerender = true`) |
| `adapter` | `cloudflare()` | Deploy as Cloudflare Worker |
| `workerEntryPoint.path` | `src/worker.ts` | Custom entry point for Durable Object exports |
| `workerEntryPoint.namedExports` | `['ReservationCoordinator']` | Exposes DO class to Cloudflare runtime |

### Integrations
| Integration | Purpose |
|-------------|---------|
| `react()` | React islands (`client:load`, `client:visible`) |
| `tailwind()` | Tailwind CSS processing |

### Vite Overrides
| Setting | Purpose |
|---------|---------|
| `ssr.external: ['node:buffer']` | Prevents bundling Node.js buffer module (available in Workers with `nodejs_compat`) |

## Integration Points
- **Worker entry**: References `src/worker.ts` which re-exports `ReservationCoordinator` from `lib/reservation-do.ts`
- **Tailwind**: Loads config from `tailwind.config.js`
- **TypeScript**: Works with `tsconfig.json` path aliases (`@/*`, `@components/*`, etc.)
- **Wrangler**: Build output consumed by `wrangler.toml` for deployment
