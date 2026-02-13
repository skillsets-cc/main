# src/worker.ts

## Overview
**Purpose**: Custom Cloudflare Worker entry point — bridges Astro's SSR handler with Durable Object class exports required by the Cloudflare runtime.

## Key Components

### Functions
| Function | Purpose | Inputs / Output |
|----------|---------|-----------------|
| `createExports` | Factory called by Astro adapter to produce worker handler + DO exports | `(manifest: SSRManifest)` → `{ default, ReservationCoordinator }` |

### Exports
| Export | Type | Purpose |
|--------|------|---------|
| `default.fetch` | `ExportedHandler` | Routes all HTTP requests through Astro's SSR handler |
| `ReservationCoordinator` | `DurableObjectClass` | Re-exported from `lib/reservation-do.ts` for Cloudflare binding |

## Dependencies
- External: `astro`, `@astrojs/cloudflare`
- Internal: `lib/reservation-do.ts` (ReservationCoordinator), `lib/auth.ts` (Env type)

## Integration Points
- **astro.config.mjs**: References this file as `workerEntryPoint.path` with `namedExports: ['ReservationCoordinator']`
- **wrangler.toml**: Durable Object binding expects `ReservationCoordinator` as a named export from the worker
- **Cloudflare runtime**: Calls `createExports(manifest)` at worker startup

## Notes
Required because `@astrojs/cloudflare` generates a default worker that only exports the fetch handler. Durable Object classes must be named exports from the same worker module, so this custom entry re-exports both.
