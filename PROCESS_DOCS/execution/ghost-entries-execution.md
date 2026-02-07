# Execution Plan: Reservable Ghost Entries

## Build Agent 1: Infrastructure — Durable Object, Worker Entry, Config Plumbing

### Overview
- **Objective**: Stand up the ReservationCoordinator Durable Object, custom worker entry point, wrangler bindings, and type plumbing so the DO is reachable from API routes.
- **Scope**:
  - Includes: DO class, worker entry, wrangler.toml bindings/migrations, astro.config.mjs adapter change, Env type updates, reservation types
  - Excludes: API routes, frontend components, tests (those are in Agent 2 and 3)
- **Dependencies**: None — this is the foundation layer
- **Estimated Complexity**: Medium — new Cloudflare primitive (DO) but design doc provides complete implementation

### Technical Approach

| Decision | Rationale |
|----------|-----------|
| SQLite-backed DO (not KV-backed) | `new_sqlite_classes` in migration — uses Cloudflare's newer SQLite storage engine for DOs |
| Single named instance (`singleton`) | All reservations go through one DO for serialized access |
| `createExports()` pattern | Required by `@astrojs/cloudflare@^12.6.12` `workerEntryPoint` API |
| Write coalescing for atomicity | Multiple `put()`/`delete()` calls without intervening `await` = single atomic transaction |

### Task Breakdown

#### Task 1: **Add reservation types to shared types** (Module: `site/src/types/`)
- **Description**: Add `GhostSlot` and `ReservationState` interfaces used by both backend and frontend.
- **Acceptance Criteria**:
  - [ ] `GhostSlot` interface exported with `slotId`, `status`, optional `expiresAt`
  - [ ] `ReservationState` interface exported with `slots` record, `totalGhostSlots`, `userSlot`
  - [ ] No changes to existing types
- **File to Modify**: `site/src/types/index.ts`
- **Dependencies**: None
- **Code Example**:
  ```typescript
  // Append to existing file
  export interface GhostSlot {
    slotId: string;
    status: 'available' | 'reserved';
    expiresAt?: number;
  }

  export interface ReservationState {
    slots: Record<string, { status: 'available' | 'reserved'; expiresAt?: number }>;
    totalGhostSlots: number;
    userSlot: string | null;
  }
  ```
- **Test Cases** (file: `site/src/types/__tests__/reservation-types.test.ts`):
  - `test_ghost_slot_type_available`: Create a `GhostSlot` with status `'available'` and no `expiresAt` — TypeScript compiles without error
  - `test_ghost_slot_type_reserved`: Create a `GhostSlot` with status `'reserved'` and `expiresAt: 1738900000` — TypeScript compiles without error
  - `test_reservation_state_type`: Create a `ReservationState` with mixed slot states and `userSlot: null` — TypeScript compiles without error
  - Note: These are compile-time type checks. Implement as simple object assignments that would fail `tsc` if types are wrong. Pattern: `const x: GhostSlot = { ... }; expect(x.status).toBe('available');`

#### Task 2: **Update Env interfaces** (Module: `site/src/`)
- **Description**: Add `RESERVATIONS` DO binding and `MAINTAINER_USER_IDS` secret to both Env interfaces.
- **Acceptance Criteria**:
  - [ ] `CloudflareEnv` in `env.d.ts` includes `RESERVATIONS: DurableObjectNamespace` and `MAINTAINER_USER_IDS: string`
  - [ ] `Env` in `auth.ts` includes `RESERVATIONS: DurableObjectNamespace` and `MAINTAINER_USER_IDS: string`
  - [ ] Both interfaces stay in sync
  - [ ] `typecheck` script passes (`cd site && npm run typecheck`)
- **Files to Modify**:
  - `site/src/env.d.ts` — add to `CloudflareEnv` interface
  - `site/src/lib/auth.ts` — add to `Env` interface
- **Dependencies**: None
- **Code — env.d.ts** (add after `AUTH: KVNamespace;` line):
  ```typescript
  // Durable Objects
  RESERVATIONS: DurableObjectNamespace;

  // Secrets (set via wrangler secret put)
  MAINTAINER_USER_IDS: string;
  ```
- **Code — auth.ts** (add after `SITE_URL: string;` line inside `Env` interface):
  ```typescript
  RESERVATIONS: DurableObjectNamespace;
  MAINTAINER_USER_IDS: string;
  ```
- **Test Cases**: Type-checked via `npm run typecheck`. Also update `createMockEnv` in `site/src/lib/__tests__/test-utils.ts`:
  - Add `RESERVATIONS: {} as DurableObjectNamespace` and `MAINTAINER_USER_IDS: ''` to the default mock env
  - Verify existing tests still pass after the change (`cd site && npm test`)

#### Task 3: **Create ReservationCoordinator Durable Object** (Module: `site/src/lib/`)
- **Description**: Implement the DO class with `getStatus`, `reserve`, `release`, and `updateConfig` operations. Exports `getReservationStub` helper.
- **Acceptance Criteria**:
  - [ ] Class extends `DurableObject<Env>` from `cloudflare:workers`
  - [ ] `GET /status` returns all slot states, config, and `userSlot` (from `X-User-Id` header)
  - [ ] `POST /reserve` atomically reserves a slot (write coalescing — no `await` between `put` calls)
  - [ ] `DELETE /release` atomically releases a user's reservation
  - [ ] `POST /config` updates `totalGhostSlots` and/or `ttlDays`, cleans up orphaned slots on shrink
  - [ ] Lazy expiry: expired entries treated as empty on read, batch-deleted
  - [ ] Default config: `{ totalGhostSlots: 24, ttlDays: 7 }`
  - [ ] `getReservationStub(env)` exported — gets singleton DO stub
  - [ ] Slot validation: `/^ghost-\d+$/` format, within `1..totalGhostSlots` range
- **File to Create**: `site/src/lib/reservation-do.ts`
- **Dependencies**: Task 2 (Env interface must include `RESERVATIONS`)
- **Code**: Implement exactly as specified in design doc §6.2. Key patterns:
  - Import: `import { DurableObject } from 'cloudflare:workers';`
  - Storage keys: `slot:{slotId}`, `user:{userId}`, `config`
  - Batch read: `this.ctx.storage.list<SlotData>({ prefix: 'slot:' })` for status endpoint
  - Write coalescing: `this.ctx.storage.put(...)` calls with NO `await` between them
  - Stub helper: `env.RESERVATIONS.idFromName('singleton')` → `env.RESERVATIONS.get(id)`
- **Test Cases** (file: `site/src/lib/__tests__/reservation-do.test.ts`):
  - `test_get_status_empty`: New DO → GET /status returns 24 available slots, config `{ totalGhostSlots: 24, ttlDays: 7 }`, `userSlot: null`
  - `test_reserve_slot`: POST /reserve `{ slotId: "ghost-1", userId: "123" }` → 201 with `slotId` and `expiresAt` ~7 days from now
  - `test_reserve_duplicate_user`: Reserve ghost-1 as user 123, then reserve ghost-2 as user 123 → 409 `user_has_reservation` with `existingSlot: "ghost-1"`
  - `test_reserve_taken_slot`: Reserve ghost-1 as user 123, then reserve ghost-1 as user 456 → 409 `slot_taken`
  - `test_reserve_invalid_slot`: Reserve ghost-0 → 404 `slot_not_found`. Reserve ghost-25 (when totalGhostSlots=24) → 404 `slot_not_found`
  - `test_release_reservation`: Reserve ghost-3 as user 123, then DELETE /release `{ userId: "123" }` → 200 `{ released: "ghost-3" }`
  - `test_release_no_reservation`: DELETE /release `{ userId: "999" }` → 404 `no_reservation`
  - `test_lazy_expiry`: Reserve a slot, manually set `expiresAt` to past timestamp in mock storage, GET /status → slot shows as `available`
  - `test_update_config`: POST /config `{ ttlDays: 14 }` → 200 with merged config `{ totalGhostSlots: 24, ttlDays: 14 }`
  - `test_update_config_shrink_cleanup`: Set totalGhostSlots=24, reserve ghost-24 as user 123, POST /config `{ totalGhostSlots: 23 }` → ghost-24 reservation cleaned up
  - `test_update_config_bounds`: POST /config `{ totalGhostSlots: 101 }` → 400. POST /config `{ ttlDays: 0 }` → 400
  - `test_status_with_user_id`: Reserve ghost-5 as user 123, GET /status with `X-User-Id: 123` → `userSlot: "ghost-5"`
  - **Test Setup**: The DO class methods operate on `this.ctx.storage`. Create a mock `DurableObjectState` with an in-memory `Map` backing `get`, `put`, `delete`, `list`. Instantiate `ReservationCoordinator` with this mock. Call `fetch()` with constructed `Request` objects. Pattern:
    ```typescript
    function createMockStorage(): DurableObjectStorage {
      const store = new Map<string, unknown>();
      return {
        get: async (key: string) => store.get(key) ?? null,
        put: async (key: string, value: unknown) => { store.set(key, value); },
        delete: async (keyOrKeys: string | string[]) => {
          if (Array.isArray(keyOrKeys)) {
            for (const k of keyOrKeys) store.delete(k);
            return keyOrKeys.length;
          }
          return store.delete(keyOrKeys);
        },
        list: async (opts?: { prefix?: string }) => {
          const result = new Map();
          for (const [k, v] of store) {
            if (!opts?.prefix || k.startsWith(opts.prefix)) result.set(k, v);
          }
          return result;
        },
      } as unknown as DurableObjectStorage;
    }
    ```

#### Task 4: **Create custom worker entry point** (Module: `site/src/`)
- **Description**: Create `worker.ts` that exports the DO class via `createExports()` so the Cloudflare runtime can instantiate it.
- **Acceptance Criteria**:
  - [ ] Exports `createExports(manifest: SSRManifest)` function
  - [ ] Return object has `default` handler (using `handle` from `@astrojs/cloudflare/handler`) and `ReservationCoordinator`
  - [ ] DO class is a property of the return object (NOT a top-level re-export)
- **File to Create**: `site/src/worker.ts`
- **Dependencies**: Task 3 (DO class must exist)
- **Code**:
  ```typescript
  import type { SSRManifest } from 'astro';
  import { App } from 'astro/app';
  import { handle } from '@astrojs/cloudflare/handler';
  import { ReservationCoordinator } from './lib/reservation-do';

  export function createExports(manifest: SSRManifest) {
    const app = new App(manifest);
    return {
      default: {
        async fetch(request: Request, env: Env, ctx: ExecutionContext) {
          return handle(manifest, app, request, env, ctx);
        },
      } satisfies ExportedHandler<Env>,
      ReservationCoordinator,
    };
  }
  ```
- **Test Cases**: No unit tests — this is glue code. Verified by build (`cd site && npm run build`) and wrangler dev.

#### Task 5: **Update wrangler.toml and astro.config.mjs** (Module: `site/`)
- **Description**: Add DO binding, migration, and configure Astro adapter with custom worker entry point.
- **Acceptance Criteria**:
  - [ ] `wrangler.toml` has `[[durable_objects.bindings]]` with `name = "RESERVATIONS"` and `class_name = "ReservationCoordinator"`
  - [ ] `wrangler.toml` has `[[migrations]]` with `tag = "v1"` and `new_sqlite_classes = ["ReservationCoordinator"]`
  - [ ] `astro.config.mjs` adapter has `workerEntryPoint: { path: 'src/worker.ts', namedExports: ['ReservationCoordinator'] }`
  - [ ] `npm run build` succeeds in the `site/` directory
- **Files to Modify**:
  - `site/wrangler.toml` — append DO binding and migration blocks
  - `site/astro.config.mjs` — add `workerEntryPoint` option to `cloudflare()` adapter
- **Dependencies**: Task 4 (worker entry must exist)
- **Code — wrangler.toml** (append to end of file):
  ```toml
  # Durable Objects
  [[durable_objects.bindings]]
  name = "RESERVATIONS"
  class_name = "ReservationCoordinator"

  [[migrations]]
  tag = "v1"
  new_sqlite_classes = ["ReservationCoordinator"]
  ```
- **Code — astro.config.mjs** (modify `adapter: cloudflare()` to):
  ```javascript
  adapter: cloudflare({
    workerEntryPoint: {
      path: 'src/worker.ts',
      namedExports: ['ReservationCoordinator'],
    },
  }),
  ```
- **Test Cases**: No unit tests. Verified by:
  - `cd site && npm run build` succeeds without errors
  - `cd site && npm run typecheck` succeeds

### Testing Strategy
- **Framework**: Vitest (existing setup at `site/vitest.config.ts`, jsdom environment)
- **Test locations**: `site/src/types/__tests__/`, `site/src/lib/__tests__/`
- **Mock pattern**: In-memory Map-backed mocks for `DurableObjectStorage` and `KVNamespace` (see existing `test-utils.ts`)
- **Coverage**: Near-100% on `reservation-do.ts` (12 test cases covering all operations, edge cases, and error paths)

### Risk Mitigation

| Risk | Probability | Impact | Mitigation | Fallback | Detection |
|------|-------------|--------|------------|----------|-----------|
| `cloudflare:workers` import fails in test env | Medium | High | Mock the DO class instantiation, don't import `cloudflare:workers` in test files — test the class methods directly | Use `vi.mock('cloudflare:workers')` to stub the DurableObject base class | `npm test` fails with import error |
| `createExports` API changes between @astrojs/cloudflare versions | Low | High | Pinned to `^12.6.12`, verified against docs | Fall back to top-level named export if adapter supports it | `npm run build` fails |
| Write coalescing breaks with async operations | Low | Critical | Follow design doc strictly: NO `await` between coalesced writes | Wrap in `this.ctx.storage.transaction()` if available | Data inconsistency in reservation state |
| `DurableObjectNamespace` type not available in test context | Medium | Medium | Cast to `unknown` in mock env, use `as DurableObjectNamespace` | Skip type checking in test file with targeted `@ts-expect-error` | TypeScript errors in test files |

### Success Criteria
- [ ] `npm run build` succeeds in `site/`
- [ ] `npm run typecheck` succeeds in `site/`
- [ ] All existing tests still pass (`npm test` in `site/`)
- [ ] New DO tests pass with full coverage of reservation logic
- [ ] `ReservationCoordinator` is exported from the built worker

---

## Build Agent 2: API Routes — Reservations Endpoint + Config Endpoint

### Overview
- **Objective**: Create the REST API layer that bridges the frontend to the Durable Object, including authentication, rate limiting, and maintainer authorization.
- **Scope**:
  - Includes: `/api/reservations` (GET/POST/DELETE), `/api/reservations/config` (POST), rate limiting
  - Excludes: DO implementation (Agent 1), frontend components (Agent 3)
- **Dependencies**: Build Agent 1 must complete first (needs DO class, types, Env updates)
- **Estimated Complexity**: Medium — follows existing API route patterns, adds hour-bucketed rate limiting

### Technical Approach

| Decision | Rationale |
|----------|-----------|
| Hour-bucketed rate limiter keys | Fixes the TTL-reset bug in the star rate limiter. Key format: `ratelimit:reserve:{userId}:{hour}`. Fixed 1-hour window per key. |
| Session-conditional cache headers | `private, max-age=10` when session present (userSlot is user-specific), `public, max-age=10` otherwise |
| Maintainer auth via env var | `MAINTAINER_USER_IDS` comma-separated GitHub user IDs — simple, no new role system |
| Input validation at API layer | Validate `slotId` format (`/^ghost-\d+$/`) and config types before forwarding to DO |

### Task Breakdown

#### Task 1: **Create reservations API route** (Module: `site/src/pages/api/`)
- **Description**: Implement GET/POST/DELETE handlers for `/api/reservations` with auth, rate limiting, and DO proxy.
- **Acceptance Criteria**:
  - [ ] `GET /api/reservations` returns slot states + config + `userSlot` (nullable). No auth required. Cache-Control varies by session presence.
  - [ ] `POST /api/reservations` requires auth, rate-limits (5/hr), validates `slotId` format, forwards to DO
  - [ ] `DELETE /api/reservations` requires auth, rate-limits (5/hr), forwards to DO (no body — uses session userId)
  - [ ] 401 returned for unauthenticated POST/DELETE
  - [ ] 429 returned when rate limited, with descriptive message
  - [ ] 400 returned for invalid/missing `slotId` in POST
  - [ ] DO errors (409, 404) are passed through with correct status codes
- **File to Create**: `site/src/pages/api/reservations.ts`
- **Dependencies**: Agent 1 Task 2 (Env), Agent 1 Task 3 (DO + `getReservationStub`)
- **Rate Limiting Implementation**:
  ```typescript
  // Hour-bucketed keys — fixed 1-hour window, no TTL reset bug
  async function isReservationRateLimited(kv: KVNamespace, userId: string): Promise<boolean> {
    const hour = Math.floor(Date.now() / 3_600_000);
    const key = `ratelimit:reserve:${userId}:${hour}`;
    const current = parseInt(await kv.get(key) ?? '0', 10);
    if (current >= 5) return true;
    await kv.put(key, String(current + 1), { expirationTtl: 7200 });
    return false;
  }
  ```
  The `expirationTtl: 7200` (2 hours) ensures the key lives past the current hour bucket. The key naturally becomes unreachable once the hour changes, and KV garbage-collects it after TTL.
- **Code Pattern** (follow existing `site/src/pages/api/star.ts` pattern):
  ```typescript
  import type { APIRoute } from 'astro';
  import { getSessionFromRequest, type Env } from '@/lib/auth';
  import { jsonResponse, errorResponse } from '@/lib/responses';
  import { getReservationStub } from '@/lib/reservation-do';

  export const GET: APIRoute = async ({ request, locals }) => {
    const env = locals.runtime.env as Env;
    const session = await getSessionFromRequest(env, request);
    const stub = getReservationStub(env);

    const doRequest = new Request('https://do/status', {
      headers: session ? { 'X-User-Id': session.userId } : {},
    });

    try {
      const response = await stub.fetch(doRequest);
      const data = await response.json();
      const cacheControl = session ? 'private, max-age=10' : 'public, max-age=10';
      return jsonResponse(data, { headers: { 'Cache-Control': cacheControl } });
    } catch (error) {
      console.error('[Reservations] DO fetch failed:', error);
      return errorResponse('Internal server error', 500);
    }
  };

  export const POST: APIRoute = async ({ request, locals }) => {
    const env = locals.runtime.env as Env;
    const session = await getSessionFromRequest(env, request);
    if (!session) return errorResponse('Authentication required', 401);
    if (await isReservationRateLimited(env.DATA, session.userId)) {
      return errorResponse('Rate limit exceeded', 429, {
        message: 'Maximum 5 reservation operations per hour.',
      });
    }

    const { slotId } = await request.json() as { slotId: string };
    if (!slotId || !/^ghost-\d+$/.test(slotId)) {
      return errorResponse('Invalid slot ID', 400);
    }

    const stub = getReservationStub(env);
    const doRequest = new Request('https://do/reserve', {
      method: 'POST',
      body: JSON.stringify({ slotId, userId: session.userId }),
    });

    try {
      const response = await stub.fetch(doRequest);
      const data = await response.json();
      return jsonResponse(data, { status: response.status });
    } catch (error) {
      console.error('[Reservations] DO reserve failed:', error);
      return errorResponse('Internal server error', 500);
    }
  };

  export const DELETE: APIRoute = async ({ request, locals }) => {
    const env = locals.runtime.env as Env;
    const session = await getSessionFromRequest(env, request);
    if (!session) return errorResponse('Authentication required', 401);
    if (await isReservationRateLimited(env.DATA, session.userId)) {
      return errorResponse('Rate limit exceeded', 429, {
        message: 'Maximum 5 reservation operations per hour.',
      });
    }

    const stub = getReservationStub(env);
    const doRequest = new Request('https://do/release', {
      method: 'DELETE',
      body: JSON.stringify({ userId: session.userId }),
    });

    try {
      const response = await stub.fetch(doRequest);
      const data = await response.json();
      return jsonResponse(data, { status: response.status });
    } catch (error) {
      console.error('[Reservations] DO release failed:', error);
      return errorResponse('Internal server error', 500);
    }
  };
  ```
- **Test Cases** (file: `site/src/pages/api/__tests__/reservations.test.ts`):
  - `test_get_unauthenticated`: GET without session → 200, `Cache-Control: public, max-age=10`, `userSlot: null`
  - `test_get_authenticated`: GET with valid session → 200, `Cache-Control: private, max-age=10`, `userSlot` populated if user has reservation
  - `test_post_unauthenticated`: POST without session → 401 `Authentication required`
  - `test_post_valid_reserve`: POST with session + valid `slotId` → forwards to DO, returns 201 on success
  - `test_post_invalid_slot_id`: POST with `slotId: "invalid"` → 400 `Invalid slot ID`. POST with `slotId: "ghost-"` → 400. POST with no body → 400.
  - `test_post_rate_limited`: Set rate limit counter to 5 for current hour, POST → 429
  - `test_delete_unauthenticated`: DELETE without session → 401
  - `test_delete_valid_release`: DELETE with session → forwards to DO, returns 200
  - `test_delete_rate_limited`: Set rate limit counter to 5, DELETE → 429
  - `test_do_error_passthrough`: Mock DO returning 409 → API returns 409 with DO's error body
  - **Test Setup**: Mock `getSessionFromRequest` to return test session or null. Mock `getReservationStub` to return a fake stub with controlled `fetch()` responses. Mock `KVNamespace` for rate limiting (use `createMockKV` from `test-utils.ts`).

#### Task 2: **Create reservations config route** (Module: `site/src/pages/api/reservations/`)
- **Description**: Implement POST handler for `/api/reservations/config` with maintainer authorization.
- **Acceptance Criteria**:
  - [ ] POST requires authentication (401 if missing)
  - [ ] POST requires maintainer authorization (403 if not in `MAINTAINER_USER_IDS`)
  - [ ] Validates `totalGhostSlots` is a number if provided
  - [ ] Validates `ttlDays` is a number if provided
  - [ ] Returns 400 for invalid JSON body
  - [ ] Forwards valid config to DO, returns DO response
  - [ ] Maintainer check uses comma-separated `MAINTAINER_USER_IDS` env var
- **File to Create**: `site/src/pages/api/reservations/config.ts`
- **Dependencies**: Agent 1 Task 2 (Env with MAINTAINER_USER_IDS), Agent 1 Task 3 (DO)
- **Code**: Implement exactly as design doc §6.3b. Key pattern:
  ```typescript
  function isMaintainer(env: Env, userId: string): boolean {
    const ids = (env.MAINTAINER_USER_IDS ?? '').split(',').map(s => s.trim());
    return ids.includes(userId);
  }
  ```
- **Test Cases** (file: `site/src/pages/api/__tests__/reservations-config.test.ts`):
  - `test_config_unauthenticated`: POST without session → 401
  - `test_config_non_maintainer`: POST with session userId "999" when `MAINTAINER_USER_IDS="123,456"` → 403 `Forbidden`
  - `test_config_maintainer_valid`: POST with maintainer session + `{ totalGhostSlots: 20 }` → forwards to DO, returns 200
  - `test_config_maintainer_both_fields`: POST with `{ totalGhostSlots: 20, ttlDays: 14 }` → forwards to DO, returns 200
  - `test_config_invalid_type_totalGhostSlots`: POST with `{ totalGhostSlots: "abc" }` → 400 `totalGhostSlots must be a number`
  - `test_config_invalid_type_ttlDays`: POST with `{ ttlDays: true }` → 400 `ttlDays must be a number`
  - `test_config_invalid_json`: POST with malformed body → 400 `Invalid JSON body`
  - `test_config_maintainer_whitespace_handling`: `MAINTAINER_USER_IDS=" 123 , 456 "` → userId "123" is recognized as maintainer
  - **Test Setup**: Same mock pattern as Task 1. Set `env.MAINTAINER_USER_IDS` to test values.

#### Task 3: **Rate limiter unit tests** (Module: `site/src/pages/api/`)
- **Description**: Dedicated tests for the hour-bucketed rate limiting function.
- **Acceptance Criteria**:
  - [ ] Rate limiter uses hour-bucketed key format `ratelimit:reserve:{userId}:{hour}`
  - [ ] Returns `false` for first 5 requests in an hour
  - [ ] Returns `true` for 6th+ request in same hour
  - [ ] New hour bucket resets the counter
  - [ ] KV TTL is set to 7200 seconds
- **File**: Tests go in `site/src/pages/api/__tests__/reservations.test.ts` (same file as Task 1, separate `describe` block)
- **Dependencies**: Task 1 (rate limiter function must exist)
- **Test Cases** (within `describe('isReservationRateLimited')` block):
  - `test_allows_first_five`: Call 5 times with same userId → all return `false`
  - `test_blocks_sixth`: Call 6 times → first 5 return `false`, 6th returns `true`
  - `test_different_users_independent`: User A calls 5 times (all false), User B calls 1 time → `false`
  - `test_ttl_set_correctly`: After a call, verify KV `put` was called with `{ expirationTtl: 7200 }`
  - **Test Setup**: Mock `Date.now()` with `vi.useFakeTimers()` to control the hour bucket. Use `createMockKV()` for KV.

### Testing Strategy
- **Framework**: Vitest with jsdom (existing config)
- **Test locations**: `site/src/pages/api/__tests__/`
- **Mock strategy**: Mock `getSessionFromRequest`, `getReservationStub`, and KV. Don't import `cloudflare:workers` — mock the DO stub's `fetch()` to return controlled responses.
- **Coverage**: All auth paths (200, 401, 403, 429), all validation paths (400), DO error passthrough (409, 404, 500)

### Risk Mitigation

| Risk | Probability | Impact | Mitigation | Fallback | Detection |
|------|-------------|--------|------------|----------|-----------|
| Rate limiter KV race condition (two concurrent reads before either writes) | Low | Low | Acceptable: worst case allows 6 ops instead of 5. This is rate limiting, not security critical. | N/A — by design | Monitor KV write patterns |
| `request.json()` throws on invalid body | Medium | Low | Wrap in try/catch for config endpoint, validate slotId presence for reservations | Return 400 on parse failure | Integration test with malformed body |
| `MAINTAINER_USER_IDS` not set in env | Low | Medium | Default to empty string via `(env.MAINTAINER_USER_IDS ?? '')` | All config requests return 403 | Manual smoke test after deploy |

### Success Criteria
- [ ] All API route tests pass
- [ ] Auth enforcement: 401 on unauthenticated POST/DELETE
- [ ] Rate limiting: 429 after 5 ops/hour
- [ ] Config auth: 403 for non-maintainers
- [ ] DO responses passed through with correct status codes
- [ ] `npm run typecheck` passes

---

## Build Agent 3: Frontend — GhostCard, useCountdown, SkillsetGrid Integration

### Overview
- **Objective**: Render ghost cards in the index grid, with reserve/cancel interactions, countdown timers, and correct visual states.
- **Scope**:
  - Includes: `GhostCard` component, `useCountdown` hook, `SkillsetGrid` modifications, component tests
  - Excludes: API routes (Agent 2), DO logic (Agent 1), index.astro (no changes needed)
- **Dependencies**: Build Agent 1 (types), Build Agent 2 (API endpoints) — but frontend can be built and tested with mocked API responses
- **Estimated Complexity**: Medium — follows existing React island patterns, new countdown logic

### Technical Approach

| Decision | Rationale |
|----------|-----------|
| Fetch ghost state in `SkillsetGrid` `useEffect` | Same pattern as live star count fetch — keeps index.astro static |
| Ghost cards below real cards, unaffected by tag filter | Design §4.3: "Ghost cards always render below real entries regardless of active tag filter" |
| `useCountdown` with `setInterval` | Simple 60-second interval updating display string from `expiresAt` timestamp |
| Optimistic UI on reserve | Same pattern as `StarButton` — update local state immediately, reconcile on API response |
| Auth redirect on 401 | `window.location.href = '/login?returnTo=/'` — matches `StarButton` pattern |

### Task Breakdown

#### Task 1: **Create useCountdown hook** (Module: `site/src/components/`)
- **Description**: A React hook that takes a Unix timestamp and returns a formatted countdown string, updating every 60 seconds.
- **Acceptance Criteria**:
  - [ ] Accepts `expiresAt: number` (Unix seconds) and returns formatted string like `"6d 14h 32m"`
  - [ ] Returns `"Expired"` when `expiresAt` is in the past
  - [ ] Updates every 60 seconds via `setInterval`
  - [ ] Cleans up interval on unmount
  - [ ] Handles edge cases: 0 remaining, exactly on the boundary
- **File to Create**: `site/src/components/useCountdown.ts`
- **Dependencies**: None
- **Code**:
  ```typescript
  import { useState, useEffect } from 'react';

  function formatCountdown(secondsRemaining: number): string {
    if (secondsRemaining <= 0) return 'Expired';
    const days = Math.floor(secondsRemaining / 86400);
    const hours = Math.floor((secondsRemaining % 86400) / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    return parts.join(' ') + ' remaining';
  }

  export function useCountdown(expiresAt: number): string {
    const [display, setDisplay] = useState(() =>
      formatCountdown(expiresAt - Math.floor(Date.now() / 1000))
    );

    useEffect(() => {
      function update() {
        setDisplay(formatCountdown(expiresAt - Math.floor(Date.now() / 1000)));
      }
      update();
      const interval = setInterval(update, 60_000);
      return () => clearInterval(interval);
    }, [expiresAt]);

    return display;
  }
  ```
- **Test Cases** (file: `site/src/components/__tests__/useCountdown.test.ts`):
  - `test_formats_days_hours_minutes`: `expiresAt` 6 days 14 hours 32 minutes from now → `"6d 14h 32m remaining"`
  - `test_formats_hours_minutes_only`: `expiresAt` 2 hours 15 minutes from now → `"2h 15m remaining"`
  - `test_formats_minutes_only`: `expiresAt` 45 minutes from now → `"45m remaining"`
  - `test_expired`: `expiresAt` 60 seconds in the past → `"Expired"`
  - `test_zero_remaining`: `expiresAt` equals current time → `"Expired"`
  - `test_interval_cleanup`: Render hook, unmount → `clearInterval` called
  - **Test Setup**: Use `vi.useFakeTimers()` to control `Date.now()`. Use `renderHook` from `@testing-library/react` (install if needed: already in devDeps as `@testing-library/react@^16.3.2` which includes `renderHook`).

#### Task 2: **Create GhostCard component** (Module: `site/src/components/`)
- **Description**: A React component rendering a ghost entry card in one of three visual states: available, reserved (others), or own reservation.
- **Acceptance Criteria**:
  - [ ] Available state: `opacity-25`, dashed border, placeholder bars, "Reserve" button
  - [ ] Reserved state: `opacity-35`, orange dashed border, "Reserved" text, countdown timer
  - [ ] Own reservation state: same as reserved but countdown at full orange opacity + "Cancel" link
  - [ ] Reserve button click: `POST /api/reservations { slotId }` with `credentials: 'include'`
  - [ ] On 401 response: redirect to `/login?returnTo=/`
  - [ ] On 201 response: call `onReserved(slotId, expiresAt)` callback
  - [ ] On 409 response: call `onConflict()` callback (triggers grid refresh)
  - [ ] Cancel link click: `DELETE /api/reservations` with `credentials: 'include'`
  - [ ] On successful cancel: call `onCancelled()` callback
  - [ ] Loading state during API calls (button disabled)
- **File to Create**: `site/src/components/GhostCard.tsx`
- **Dependencies**: Task 1 (useCountdown hook)
- **Props Interface**:
  ```typescript
  interface GhostCardProps {
    slotId: string;
    status: 'available' | 'reserved';
    expiresAt?: number;
    isOwn: boolean;
    onReserved: (slotId: string, expiresAt: number) => void;
    onCancelled: () => void;
    onConflict: () => void;
  }
  ```
- **Visual Structure** (matches real card structure from `SkillsetGrid`):
  ```tsx
  <article className={`group border-b border-dashed py-6 transition-colors ${
    status === 'available'
      ? 'opacity-25 border-border-ink'
      : 'opacity-35 border-orange-500/30'
  }`}>
    <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2 mb-2">
      {status === 'reserved' ? (
        <span className="text-text-tertiary font-mono text-sm">Reserved</span>
      ) : (
        <div className="bg-border-ink rounded-none h-4 w-48" />  {/* name placeholder */}
      )}
      <div className="bg-border-ink rounded-none h-3 w-32" />  {/* version placeholder */}
    </div>

    <div className="mb-3 space-y-2">
      <div className="bg-border-ink rounded-none h-3 w-full max-w-lg" />  {/* desc line 1 */}
      <div className="bg-border-ink rounded-none h-3 w-3/4 max-w-sm" />  {/* desc line 2 */}
    </div>

    <div className="flex items-center gap-4">
      {status === 'available' ? (
        <button
          onClick={handleReserve}
          disabled={loading}
          className="border border-border-ink text-text-tertiary hover:border-orange-500 hover:text-orange-500 px-3 py-1 text-sm font-mono transition-colors disabled:opacity-50"
        >
          Reserve
        </button>
      ) : (
        <>
          <span className={`font-mono text-xs ${isOwn ? 'text-orange-500' : 'text-orange-500/50'}`}>
            {countdown}
          </span>
          {isOwn && (
            <button
              onClick={handleCancel}
              disabled={loading}
              className="text-xs text-text-tertiary hover:text-status-error underline"
            >
              Cancel
            </button>
          )}
        </>
      )}
    </div>
  </article>
  ```
- **Test Cases** (file: `site/src/components/__tests__/GhostCard.test.tsx`):
  - `test_renders_available_state`: Render with `status="available"` → Reserve button visible, no countdown, opacity-25 class
  - `test_renders_reserved_state`: Render with `status="reserved"`, `expiresAt` in future, `isOwn=false` → "Reserved" text, countdown visible, no Cancel button, opacity-35 class
  - `test_renders_own_reservation`: Render with `status="reserved"`, `isOwn=true` → countdown with full orange color, Cancel button visible
  - `test_reserve_click_success`: Mock fetch returning 201 → `onReserved` called with slotId and expiresAt
  - `test_reserve_click_401_redirect`: Mock fetch returning 401 → `window.location.href` set to `/login?returnTo=/`
  - `test_reserve_click_409_conflict`: Mock fetch returning 409 → `onConflict` called
  - `test_cancel_click_success`: Mock fetch returning 200 → `onCancelled` called
  - `test_loading_state_disables_button`: Click Reserve → button disabled during fetch → re-enabled after response
  - **Test Setup**: Mock `globalThis.fetch`. Use `vi.fn()` for callback props. Use `render` and `fireEvent` from `@testing-library/react`.

#### Task 3: **Modify SkillsetGrid to render ghost cards** (Module: `site/src/components/`)
- **Description**: Extend `SkillsetGrid` to fetch reservation state on mount and render ghost cards below real entries.
- **Acceptance Criteria**:
  - [ ] Fetches `/api/reservations` on mount (parallel with existing `/api/stats/counts` fetch)
  - [ ] Renders ghost cards below the real skillset list, outside the tag filter
  - [ ] Ghost cards not affected by tag filter or search
  - [ ] When a user reserves a slot: optimistically update local state (slot becomes "reserved" with their userSlot)
  - [ ] When a user cancels: optimistically update local state (slot becomes "available", userSlot cleared)
  - [ ] On conflict (409): re-fetch reservation state to sync
  - [ ] Ghost cards compute `isOwn` by comparing each `slotId` against `reservationState.userSlot`
  - [ ] Handles fetch error gracefully (no ghost cards shown, no crash)
- **File to Modify**: `site/src/components/SkillsetGrid.tsx`
- **Dependencies**: Task 2 (GhostCard), Agent 1 Task 1 (ReservationState type)
- **Import Changes**:
  ```typescript
  import type { SearchIndexEntry, ReservationState } from '@/types';
  import GhostCard from './GhostCard.js';
  ```
- **State Addition**:
  ```typescript
  const [reservations, setReservations] = useState<ReservationState | null>(null);
  ```
- **Fetch Addition** (new `useEffect`, parallel with stars):
  ```typescript
  useEffect(() => {
    async function fetchReservations(): Promise<void> {
      try {
        const response = await fetch('/api/reservations', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json() as ReservationState;
          setReservations(data);
        }
      } catch {
        // No ghost cards on error
      }
    }
    fetchReservations();
  }, []);
  ```
- **Render Addition** (after the closing `</div>` of the skillset list, before the empty-state message):
  ```tsx
  {reservations && (
    <div className="flex flex-col border-t border-dashed border-border-ink mt-0">
      {Object.entries(reservations.slots).map(([slotId, slot]) => (
        <GhostCard
          key={slotId}
          slotId={slotId}
          status={slot.status}
          expiresAt={slot.expiresAt}
          isOwn={reservations.userSlot === slotId}
          onReserved={(sid, exp) => {
            setReservations(prev => prev ? {
              ...prev,
              userSlot: sid,
              slots: { ...prev.slots, [sid]: { status: 'reserved', expiresAt: exp } },
            } : prev);
          }}
          onCancelled={() => {
            setReservations(prev => prev ? {
              ...prev,
              userSlot: null,
              slots: {
                ...prev.slots,
                ...(prev.userSlot ? { [prev.userSlot]: { status: 'available' } } : {}),
              },
            } : prev);
          }}
          onConflict={() => {
            // Re-fetch to sync state
            fetch('/api/reservations', { credentials: 'include' })
              .then(r => r.json())
              .then(data => setReservations(data as ReservationState))
              .catch(() => {});
          }}
        />
      ))}
    </div>
  )}
  ```
- **Test Cases** (file: `site/src/components/__tests__/SkillsetGrid.test.tsx` — extend existing):
  - `test_fetches_reservations_on_mount`: Render grid → verify `/api/reservations` was called
  - `test_renders_ghost_cards`: Mock reservations API returning 3 slots (2 available, 1 reserved) → 3 ghost card articles rendered below real skillsets
  - `test_ghost_cards_unaffected_by_tag_filter`: Select a tag → real cards filtered, ghost cards still visible
  - `test_ghost_cards_not_shown_on_fetch_error`: Mock reservations API returning 500 → no ghost cards, no error
  - `test_optimistic_reserve_update`: Click Reserve on ghost-1 → local state updates to show ghost-1 as reserved with userSlot
  - `test_optimistic_cancel_update`: Have userSlot ghost-2, click Cancel → local state clears userSlot and ghost-2 becomes available
  - **Test Setup**: Extend existing `mockFetch` helper to also handle `/api/reservations` URL. Add mock reservation data.

#### Task 4: **Update existing SkillsetGrid tests** (Module: `site/src/components/__tests__/`)
- **Description**: Ensure all existing SkillsetGrid tests still pass after the ghost card integration, and update the mock fetch to handle the new `/api/reservations` endpoint.
- **Acceptance Criteria**:
  - [ ] All 11 existing `SkillsetGrid` tests pass unchanged
  - [ ] `mockFetch` helper updated to return empty reservation state for `/api/reservations` by default
  - [ ] `renderAndWaitForStars` helper updated to also wait for reservations fetch
- **File to Modify**: `site/src/components/__tests__/SkillsetGrid.test.tsx`
- **Dependencies**: Task 3 (SkillsetGrid modifications)
- **Mock Update**:
  ```typescript
  function mockFetch(
    starOverrides: Record<string, number> = {},
    reservationOverrides: Partial<ReservationState> = {}
  ) {
    // ... existing star mock ...
    const defaultReservations: ReservationState = {
      slots: {},
      totalGhostSlots: 0,  // 0 ghost slots by default so existing tests don't see ghost cards
      userSlot: null,
      ...reservationOverrides,
    };

    globalThis.fetch = vi.fn().mockImplementation((url: string | URL, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/api/stats/counts')) {
        return Promise.resolve({ ok: true, json: async () => ({ stars, downloads: {} }) });
      }
      if (urlStr.includes('/api/reservations')) {
        return Promise.resolve({ ok: true, json: async () => defaultReservations });
      }
      return Promise.resolve({ ok: false });
    }) as typeof fetch;
  }
  ```

### Testing Strategy
- **Framework**: Vitest with jsdom, `@testing-library/react`
- **Test locations**: `site/src/components/__tests__/`
- **Mock strategy**: Mock `globalThis.fetch` for all API calls, `vi.useFakeTimers()` for countdown tests
- **Coverage**: All visual states, all user interactions, all API response codes, optimistic updates

### Risk Mitigation

| Risk | Probability | Impact | Mitigation | Fallback | Detection |
|------|-------------|--------|------------|----------|-----------|
| Ghost cards break existing grid tests | Medium | Medium | Default mock returns 0 ghost slots | Fix failing tests by updating mock | `npm test` failures |
| Countdown timer drift over long periods | Low | Low | 60-second interval is acceptable for days-long countdowns | User can refresh for exact time | Visual inspection |
| Race between reserve optimistic update and re-fetch | Low | Low | Optimistic update is immediate, re-fetch only on conflict (409) | Grid shows correct state after next automatic poll | User sees momentary flicker |
| `credentials: 'include'` not sent with reservations fetch | Medium | High | Explicitly set in fetch options — required for session cookie | Ghost cards work but `userSlot` always null | Test with authenticated session |

### Success Criteria
- [ ] All existing SkillsetGrid tests still pass
- [ ] Ghost cards render in all three visual states
- [ ] Reserve flow works: click → API call → optimistic update
- [ ] Cancel flow works: click → API call → optimistic update
- [ ] Auth redirect works on 401
- [ ] Countdown displays and updates correctly
- [ ] Tag filter does not affect ghost cards
- [ ] `npm test` passes with all new and existing tests

---

## Implementation Notes

### Build Order
Build Agent 1 **must** complete before Agents 2 and 3, because both depend on the Env type updates, shared types, and the DO class. Agents 2 and 3 can run **in parallel** after Agent 1 completes — they modify different files (API routes vs components) with no overlap.

```
Agent 1 (Infrastructure) ──┬──→ Agent 2 (API Routes)
                           └──→ Agent 3 (Frontend)
```

### Deployment Steps (post-merge)
1. Set new secret: `cd site && npx wrangler secret put MAINTAINER_USER_IDS` (comma-separated GitHub user IDs)
2. Deploy: `cd site && npm run build && npx wrangler deploy`
3. The `[[migrations]]` tag `v1` will create the DO class on first deploy
4. Verify: `curl https://skillsets.cc/api/reservations` should return `{ slots: { "ghost-1": { "status": "available" }, ... }, totalGhostSlots: 24, userSlot: null }`

### Testing DO Locally
The DO cannot be tested with `astro dev` (which uses Vite, no Worker runtime). Use:
```bash
cd site && npm run build && npx wrangler dev --persist-to .wrangler/state
```
This starts a local Worker runtime with DO support. Reservation state persists in `.wrangler/state/`.

### Mocking `cloudflare:workers` in Vitest
The `cloudflare:workers` import is a Workers runtime built-in. It will fail in Vitest's jsdom environment. Two options:
1. **Preferred**: Don't import `DurableObject` base class in tests. Instead, test the DO class by mocking the entire module:
   ```typescript
   vi.mock('cloudflare:workers', () => ({
     DurableObject: class DurableObject {
       ctx: any;
       env: any;
       constructor(ctx: any, env: any) { this.ctx = ctx; this.env = env; }
     },
   }));
   ```
2. **Alternative**: Test DO logic by extracting pure functions and testing those separately, testing the `fetch()` handler via integration.

### File Conflict Matrix
| File | Agent 1 | Agent 2 | Agent 3 |
|------|---------|---------|---------|
| `site/src/types/index.ts` | Creates types | - | Imports types |
| `site/src/env.d.ts` | Modifies | - | - |
| `site/src/lib/auth.ts` | Modifies Env | Imports Env | - |
| `site/src/lib/reservation-do.ts` | Creates | Imports | - |
| `site/src/lib/responses.ts` | - | Imports | - |
| `site/src/pages/api/reservations.ts` | - | Creates | - |
| `site/src/pages/api/reservations/config.ts` | - | Creates | - |
| `site/src/components/GhostCard.tsx` | - | - | Creates |
| `site/src/components/useCountdown.ts` | - | - | Creates |
| `site/src/components/SkillsetGrid.tsx` | - | - | Modifies |
| `site/src/worker.ts` | Creates | - | - |
| `site/wrangler.toml` | Modifies | - | - |
| `site/astro.config.mjs` | Modifies | - | - |
| `site/src/lib/__tests__/test-utils.ts` | Modifies | Imports | - |

No file conflicts between agents — safe for parallel execution of Agents 2 and 3.
