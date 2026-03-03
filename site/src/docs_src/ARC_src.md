# Site Root Architecture (src/)

## Overview
Root-level source files for the Astro + Cloudflare Workers site. Provides the Worker entry point (required for Durable Objects) and global TypeScript type declarations for the Cloudflare runtime environment.

## Directory Structure
```
src/
├── docs_src/
│   ├── ARC_src.md          # This file
│   ├── env.d.ts.md         # env.d.ts documentation
│   └── worker.ts.md        # worker.ts documentation
├── env.d.ts                # Cloudflare runtime bindings + App.Locals declaration
└── worker.ts               # Custom Worker entry point (required for Durable Objects)
```

## Components

| Component | Purpose | Key Exports |
|-----------|---------|-------------|
| `env.d.ts` | Runtime binding types + Astro namespace augmentation | `CloudflareEnv` interface |
| `worker.ts` | Custom Worker entry for Durable Object export | `createExports` function |

## Data Flow

```
wrangler.toml (bindings config)
  ↓
CloudflareEnv (env.d.ts) — declares typed bindings
  ↓
App.Locals (extends Runtime<CloudflareEnv>)
  ↓
Astro.locals.runtime.env in all SSR routes

worker.ts (entry point)
  ├── createExports(manifest) called by @astrojs/cloudflare adapter
  ├── default export: handle() → Astro SSR for all HTTP routes
  └── ReservationCoordinator export → Cloudflare routes DO requests here
```

## Integration Points

### Consumed By
- `lib/auth.ts` (`Env` type from env.d.ts)
- All API routes (`Astro.locals.runtime.env` typed via App.Locals)
- `@astrojs/cloudflare` adapter (calls `createExports` in worker.ts)

### Depends On
- `lib/reservation-do.ts` (`ReservationCoordinator` class)
- `@cloudflare/workers-types` (KVNamespace, DurableObjectNamespace)
- `astro/client` + `@astrojs/cloudflare` (type references)
