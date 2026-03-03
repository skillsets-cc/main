# env.d.ts

## Purpose
Declares Cloudflare runtime environment bindings and extends Astro's `App.Locals` type so all SSR handlers have typed access to KV namespaces, Durable Objects, secrets, and environment variables.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `CloudflareEnv` | interface | All Cloudflare runtime bindings (KV, DO, secrets, vars) |

## Dependencies
- Internal: None
- External:
  - `astro/client` (triple-slash reference, Astro client types)
  - `@cloudflare/workers-types` (triple-slash reference, KVNamespace, DurableObjectNamespace, etc.)
  - `@astrojs/cloudflare` (Runtime type for App.Locals)

## Integration Points
- **Used by**: All SSR pages and API routes via `Astro.locals.runtime.env`
- **Declares**: `App.Locals` namespace (Astro global augmentation)
- **Consumed by**: `lib/auth.ts` (Env type re-exported), `lib/stars.ts`, `lib/data.ts`, all API routes

## Key Logic

### CloudflareEnv Bindings
- **KV Namespaces**: `DATA` (stars, downloads, rate limits), `AUTH` (OAuth state, JWT sessions)
- **Durable Objects**: `RESERVATIONS` (ReservationCoordinator DO)
- **Secrets** (set via `wrangler secret put`): `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `JWT_SECRET`, `MAINTAINER_USER_IDS`
- **Vars** (set in `wrangler.toml [vars]`): `CALLBACK_URL`, `SITE_URL`

### App.Locals Extension
Extends Astro's `App.Locals` to include the Cloudflare runtime via `@astrojs/cloudflare`'s `Runtime<CloudflareEnv>` type. This makes `Astro.locals.runtime.env` typed in all server-side handlers.
