# worker.ts

## Purpose
Custom Cloudflare Worker entry point required when using Durable Objects with the `@astrojs/cloudflare` adapter. Exports both the default Astro SSR handler and the `ReservationCoordinator` Durable Object class as a named export so Cloudflare can route DO requests.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `createExports` | function | Called by Astro adapter; returns `{ default: ExportedHandler, ReservationCoordinator }` |

## Dependencies
- Internal:
  - `./lib/reservation-do` (`ReservationCoordinator` Durable Object class)
  - `./lib/auth` (`Env` type)
- External:
  - `astro` (`SSRManifest` type)
  - `astro/app` (`App` class)
  - `@astrojs/cloudflare/handler` (`handle` function — wraps Astro App for Worker fetch)

## Integration Points
- **Consumed by**: `@astrojs/cloudflare` adapter at build time (configured via `entry` in astro.config)
- **Exports**: `ReservationCoordinator` so `wrangler.toml` `[[durable_objects.bindings]]` can reference it
- **Delegates to**: `handle(manifest, app, request, env, ctx)` for all HTTP routing

## Key Logic

### createExports Pattern
The `@astrojs/cloudflare` adapter calls `createExports(manifest)` to get the worker exports. This file intercepts that pattern to inject the Durable Object named export alongside the default Astro handler. Without this file, DO classes cannot be exported from the worker bundle.
