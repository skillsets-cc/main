# Design: Reservable Ghost Entries

## 1. Executive Summary

The registry grid displays 25 total slots. Real skillsets fill from the top; the remaining slots are **ghost entries** — visually identical cards with the life drained out. Logged-in users can reserve one ghost slot, creating a commitment to submit within a configurable TTL (default 7 days). Reservations are anonymous ("Reserved" + countdown), enforced to one-per-user, and expire silently.

Reservation coordination uses a **Durable Object** for atomicity. Everything else (star counts, downloads) stays on KV. The DO is the single source of truth for reservation config. No new external infrastructure — Durable Objects are a Worker primitive configured in `wrangler.toml`.

**Value delivered:**
- Visual fullness — grid looks alive with 25 slots, not dead with 1
- Commitment mechanism — reservation creates social contract to follow through
- Volume control — 25-slot cap is the rate limiter, sized quarterly

---

## 2. Rationale

| Decision | Rationale | Alternative | Why Rejected |
|----------|-----------|-------------|--------------|
| Durable Object for reservations | Single-threaded execution eliminates race conditions on slot claims. Atomic check-and-set for one-per-user constraint. | KV with claim-then-verify | KV is eventually consistent — two workers in different PoPs can both read "slot free" and both write. Hack mitigations (lock keys, read-after-write delays) are unreliable. |
| Fixed named ghost slots | Reservations bind to stable IDs (`ghost-1` through `ghost-N`). Survive real-skillset additions without invalidation. | Positional (fill from top) | Adding a real skillset would shift all positions, invalidating existing reservations. |
| Client-side fetch for ghost state | Index page stays `prerender: true` (static). Ghost/reservation state fetched on mount via API. | SSR the index page | Loses CDN caching, slower page loads, marginal benefit since grid already fetches live star counts client-side. |
| Silent expiry, no notifications | Lazy expiry on read within DO. No Cron Trigger, no GitHub API, no PAT/App token. | Cron Trigger + GitHub @mention 24h before expiry | Requires GitHub App or PAT, custom worker entry point for `scheduled` handler, tracking issue. Significant complexity for a nice-to-have reminder. |
| Configurable TTL per batch | Stored in DO storage (single source of truth). Maintainers update via API without redeploy. | Hardcoded 7 days | Skillsets require production verification + audit. TTL needs flexibility as the community scales. |
| DO as sole config owner | Config lives only in DO storage. API route forwards config updates to DO. No KV config key. | Dual-store in KV + DO | Two sources of truth diverge when maintainer forgets to sync both. DO needs the config for validation anyway. |
| Login on action (not on render) | Reserve button always visible. Clicking it triggers 401 → OAuth redirect. Same pattern as `StarButton`. | Show reserve button only when logged in | Requires client-side auth state check before rendering. Adds complexity. Current pattern already proven. |

---

## 3. Technology Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| Reservation coordination | Cloudflare Durable Object (SQLite-backed) | New — single class, ~100 lines |
| Config storage | DO internal storage (single source of truth) | No KV config key |
| Auth | GitHub OAuth (existing) | No changes |
| Frontend | React island in Astro (existing pattern) | Extended `SkillsetGrid` |
| API | Astro API routes (existing pattern) | New `/api/reservations` endpoint |
| Worker entry | Custom `src/worker.ts` with `createExports()` | Required for DO class export |

**No new dependencies.** No new npm packages, no external services. One new secret: `MAINTAINER_USER_IDS` (comma-separated GitHub user IDs for config endpoint authorization).

---

## 4. Architecture

### 4.1 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Index Page (static)                       │
│                                                                  │
│  SkillsetGrid (React island, client:load)                        │
│  ├── Real skillset cards (from build-time data)                  │
│  ├── Ghost cards (rendered client-side after fetch)              │
│  │   ├── Available → "Reserve" button                            │
│  │   └── Reserved → "Reserved" + countdown                      │
│  │                                                               │
│  │  On mount:                                                    │
│  │  ├── GET /api/stats/counts → live star counts (existing)      │
│  │  └── GET /api/reservations → ghost slot states (new)          │
│  │                                                               │
│  │  On reserve click:                                            │
│  │  └── POST /api/reservations { slotId }                        │
│  │      ├── 201 → card transitions to "Reserved" + countdown     │
│  │      ├── 401 → redirect to /login?returnTo=/                  │
│  │      ├── 409 → "You already have a reservation" or slot taken │
│  │      └── 404 → slot doesn't exist (grid refresh)              │
│  │                                                               │
│  │  On cancel click (own reservation):                           │
│  │  └── DELETE /api/reservations                                 │
│  │      └── 200 → card transitions back to available             │
└──┼──────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Routes (Astro SSR)                         │
│                                                                  │
│  /api/reservations                                               │
│  ├── GET  → Query DO for all slot states + config                │
│  ├── POST → Auth + rate limit check, forward to DO for reserve   │
│  └── DELETE → Auth + rate limit check, forward to DO for release │
│                                                                  │
│  /api/reservations/config                                        │
│  └── POST → Auth + maintainer check, forward to DO for config    │
│                                                                  │
│  Auth: getSessionFromRequest(env, request)                       │
│  Responses: jsonResponse() / errorResponse() from lib/responses  │
└──┼──────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│              ReservationCoordinator (Durable Object)             │
│                                                                  │
│  Single instance — all reservation ops serialized                │
│                                                                  │
│  Internal storage (transactional):                               │
│  ├── slot:{slotId} → { userId, createdAt, expiresAt }           │
│  ├── user:{userId} → { slotId, expiresAt }                      │
│  └── config → { totalGhostSlots, ttlDays }                      │
│                                                                  │
│  Operations:                                                     │
│  ├── GET /status → all slots with state (no user IDs exposed)   │
│  ├── POST /reserve → atomic check-and-set                        │
│  ├── DELETE /release → atomic release                            │
│  └── POST /config → update batch config                          │
│                                                                  │
│  Expiry: Checked on read — if expiresAt < now, treat as empty   │
│  (lazy expiry, no background cleanup needed)                     │
│                                                                  │
│  Config is authoritative here — no KV config key.                │
│  Updated via POST /config (gated at API route level).            │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Component Catalog

| Component | Type | Location | Purpose |
|-----------|------|----------|---------|
| `ReservationCoordinator` | Durable Object class | `site/src/lib/reservation-do.ts` | Atomic reservation coordination |
| Worker entry | Custom entry file | `site/src/worker.ts` | Exports DO class + default fetch handler |
| `/api/reservations` | API route | `site/src/pages/api/reservations.ts` | REST endpoint proxying to DO (with rate limiting) |
| `/api/reservations/config` | API route | `site/src/pages/api/reservations/config.ts` | Maintainer config endpoint (auth-gated) |
| `GhostCard` | React component | `site/src/components/GhostCard.tsx` | Ghost entry card with reserve/countdown |
| `SkillsetGrid` (modified) | React component | `site/src/components/SkillsetGrid.tsx` | Extended to render ghost cards after real entries |
| `useCountdown` | React hook | `site/src/components/useCountdown.ts` | Client-side countdown from `expiresAt` timestamp |

### 4.3 Ghost Card Visual States

All ghost cards share the same HTML structure as real skillset cards. The visual difference is purely CSS:

**Available (unreserved):**
```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
  ░░░░░░░░░░░░░░░                          ← name placeholder (bg bar)
  ░░░░░░░░░░ • ░░░░░░                      ← version/author placeholder

  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ← description placeholder
  ░░░░░░░░░░░░░░░░░░░░░

  [Reserve]                                ← button, always visible
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
```
- `opacity-25` on entire card
- `border-dashed border-border-ink` (dashed border instead of solid)
- Placeholder bars are `bg-border-ink rounded-none h-4/h-3` divs
- Reserve button: `border border-border-ink text-text-tertiary hover:border-orange-500 hover:text-orange-500`

**Reserved (claimed, anonymous):**
```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
  Reserved                                 ← text, font-mono
  ░░░░░░░░░░ • ░░░░░░                      ← placeholder

  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        ← placeholder
  ░░░░░░░░░░░░░░░░░░░░░

  6d 14h 32m remaining                     ← countdown, font-mono
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
```
- `opacity-35` on card (slightly more visible than available)
- `border-dashed border-orange-500/30` (faint orange dashed border)
- "Reserved" in `text-text-tertiary font-mono text-sm`
- Countdown in `text-orange-500/50 font-mono text-xs`

**Own reservation (only the holder sees this):**
- Same as reserved, but countdown is `text-orange-500` (full opacity)
- Cancel button appears: `text-xs text-text-tertiary hover:text-status-error underline`

**Tag filter interaction:** Ghost cards always render below real entries regardless of active tag filter. When a tag is selected, only real cards are filtered; ghost cards remain visible to maintain grid fullness. The `SkillsetGrid` fetches `/api/reservations` on mount; the response's `userSlot` field tells the component which slot (if any) belongs to the current user. `GhostCard` compares its `slotId` against `userSlot` to select the visual variant.

---

## 5. Protocol & Schema

### 5.1 Durable Object Internal API

The API route communicates with the DO via `fetch()` on the stub. The DO exposes a simple REST interface internally:

**GET /status**
```json
// Response 200
{
  "slots": {
    "ghost-1": { "status": "available" },
    "ghost-2": { "status": "reserved", "expiresAt": 1738900000 },
    "ghost-3": { "status": "reserved", "expiresAt": 1738850000 }
  },
  "config": { "totalGhostSlots": 24, "ttlDays": 7 },
  "userSlot": "ghost-2"  // null if caller has no reservation (userId passed via header)
}
```

**POST /reserve**
```json
// Request
{ "slotId": "ghost-3", "userId": "12345" }

// Response 201
{ "slotId": "ghost-3", "expiresAt": 1738900000 }

// Response 409 — user already has reservation
{ "error": "user_has_reservation", "existingSlot": "ghost-2" }

// Response 409 — slot taken
{ "error": "slot_taken" }

// Response 404 — slot doesn't exist
{ "error": "slot_not_found" }
```

**DELETE /release**
```json
// Request
{ "userId": "12345" }

// Response 200
{ "released": "ghost-3" }

// Response 404 — no reservation found
{ "error": "no_reservation" }
```

**POST /config** (maintainer only — no auth gate in DO, gated at API route level)
```json
// Request
{ "totalGhostSlots": 24, "ttlDays": 14 }

// Response 200
{ "config": { "totalGhostSlots": 24, "ttlDays": 14 } }
```

### 5.2 Public API

**GET /api/reservations**
```json
// Response 200
// Cache-Control: public, max-age=10 (no session)
// Cache-Control: private, max-age=10 (with session)
{
  "slots": {
    "ghost-1": { "status": "available" },
    "ghost-2": { "status": "reserved", "expiresAt": 1738900000 }
  },
  "totalGhostSlots": 24,
  "userSlot": null
}
```
- `userSlot` is populated only if the request has a valid session cookie
- When session is present, `Cache-Control: private` prevents CDN from caching user-specific `userSlot` data
- No user IDs exposed in the response

**POST /api/reservations**
```json
// Request (session cookie required)
{ "slotId": "ghost-3" }

// Response 201
{ "slotId": "ghost-3", "expiresAt": 1738900000 }

// Response 401
{ "error": "Authentication required" }

// Response 409 — user already has reservation
{ "error": "user_has_reservation", "existingSlot": "ghost-2" }
// or — slot taken
{ "error": "slot_taken" }

// Response 429
{ "error": "Rate limit exceeded", "message": "Maximum 5 reservation operations per hour." }
```

**DELETE /api/reservations**
```json
// Request (session cookie required, no body — releases caller's reservation)

// Response 200
{ "released": "ghost-3" }

// Response 401
{ "error": "Authentication required" }

// Response 404
{ "error": "No active reservation" }

// Response 429
{ "error": "Rate limit exceeded", "message": "Maximum 5 reservation operations per hour." }
```

Rate limiting: 5 reservation ops/hour per user, KV-based with hour-bucketed keys. Prevents reserve/cancel cycling.

**POST /api/reservations/config** (maintainer only)
```json
// Request (session cookie required, maintainer authorization via MAINTAINER_USER_IDS env var)
{ "totalGhostSlots": 23 }
// or
{ "ttlDays": 14 }
// or both
{ "totalGhostSlots": 23, "ttlDays": 14 }

// Response 200
{ "config": { "totalGhostSlots": 23, "ttlDays": 14 } }

// Response 400
{ "error": "totalGhostSlots must be a number" }
// or
{ "error": "totalGhostSlots must be 0-100" }

// Response 401
{ "error": "Authentication required" }

// Response 403
{ "error": "Forbidden" }
```

Maintainer authorization: `MAINTAINER_USER_IDS` environment variable (comma-separated GitHub numeric user IDs, set via `npx wrangler secret put`). Checked at the API route level before forwarding to the DO.

### 5.3 Durable Object Storage Keys

All stored in the DO's transactional storage (not KV):

| Key | Value | Expiry |
|-----|-------|--------|
| `slot:{slotId}` | `{ userId: string, createdAt: number, expiresAt: number }` | Lazy (checked on read) |
| `user:{userId}` | `{ slotId: string, expiresAt: number }` | Lazy (checked on read) |
| `config` | `{ totalGhostSlots: number, ttlDays: number }` | None (persistent) |

**Lazy expiry:** On every read, if `expiresAt < Date.now() / 1000`, the entry is treated as empty and batch-deleted. No background cleanup, no Cron Trigger.

**Atomicity:** All multi-key writes use Cloudflare's automatic write coalescing — multiple `put()` / `delete()` calls with **no intervening `await`** are combined into a single atomic transaction. This is the crash-safe pattern used in `reserve()` and `updateConfig()`. Separating writes with `await` breaks coalescing and risks inconsistency on crash.

---

## 6. Implementation Details

### 6.1 File Structure

```
site/
├── src/
│   ├── worker.ts                         ← NEW: custom worker entry (exports DO class)
│   ├── lib/
│   │   ├── auth.ts                       ← MODIFIED: add RESERVATIONS to Env interface
│   │   └── reservation-do.ts            ← NEW: ReservationCoordinator DO class
│   ├── pages/
│   │   └── api/
│   │       ├── reservations.ts           ← NEW: REST endpoint (with rate limiting)
│   │       └── reservations/
│   │           └── config.ts             ← NEW: Maintainer config endpoint
│   ├── components/
│   │   ├── SkillsetGrid.tsx              ← MODIFIED: render ghost cards after real entries
│   │   ├── GhostCard.tsx                 ← NEW: ghost entry component
│   │   └── useCountdown.ts              ← NEW: countdown hook
│   └── types/
│       └── index.ts                      ← MODIFIED: add reservation types
├── wrangler.toml                         ← MODIFIED: DO binding + migration
├── astro.config.mjs                      ← MODIFIED: workerEntryPoint config (required for DO)
└── src/env.d.ts                          ← MODIFIED: add RESERVATIONS to CloudflareEnv
```

### 6.2 Durable Object Class

```typescript
// site/src/lib/reservation-do.ts

import { DurableObject } from 'cloudflare:workers';
import type { Env } from '@/lib/auth';

interface SlotData {
  userId: string;
  createdAt: number;
  expiresAt: number;
}

interface ReservationConfig {
  totalGhostSlots: number;
  ttlDays: number;
}

export class ReservationCoordinator extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (`${request.method} ${url.pathname}`) {
      case 'GET /status':
        return this.getStatus(request);
      case 'POST /reserve':
        return this.reserve(request);
      case 'DELETE /release':
        return this.release(request);
      case 'POST /config':
        return this.updateConfig(request);
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  private async getStatus(request: Request): Promise<Response> {
    const userId = request.headers.get('X-User-Id');
    const config = await this.getConfig();
    const now = Math.floor(Date.now() / 1000);

    // Batch read all slots in one call instead of N sequential reads
    const allSlots = await this.ctx.storage.list<SlotData>({ prefix: 'slot:' });

    const slots: Record<string, { status: string; expiresAt?: number }> = {};
    let userSlot: string | null = null;
    const staleKeys: string[] = [];

    // Build lookup from stored data
    const storedSlots = new Map<string, SlotData>();
    for (const [key, data] of allSlots) {
      const slotId = key.replace('slot:', '');
      if (data.expiresAt > now) {
        storedSlots.set(slotId, data);
      } else {
        // Mark stale entries for batch cleanup
        staleKeys.push(key);
        staleKeys.push(`user:${data.userId}`);
      }
    }

    // Build response for all ghost slots
    for (let i = 1; i <= config.totalGhostSlots; i++) {
      const slotId = `ghost-${i}`;
      const data = storedSlots.get(slotId);

      if (data) {
        slots[slotId] = { status: 'reserved', expiresAt: data.expiresAt };
        if (userId && data.userId === userId) {
          userSlot = slotId;
        }
      } else {
        slots[slotId] = { status: 'available' };
      }
    }

    // Lazy batch cleanup of expired entries
    if (staleKeys.length > 0) {
      await this.ctx.storage.delete(staleKeys);
    }

    return Response.json({ slots, config, userSlot });
  }

  private async reserve(request: Request): Promise<Response> {
    const { slotId, userId } = await request.json() as { slotId: string; userId: string };
    const config = await this.getConfig();
    const now = Math.floor(Date.now() / 1000);

    // Validate slot exists
    const slotNum = parseInt(slotId.replace('ghost-', ''), 10);
    if (isNaN(slotNum) || slotNum < 1 || slotNum > config.totalGhostSlots) {
      return Response.json({ error: 'slot_not_found' }, { status: 404 });
    }

    // Check if user already has a reservation
    const existing = await this.ctx.storage.get<{ slotId: string; expiresAt: number }>(`user:${userId}`);
    if (existing && existing.expiresAt > now) {
      return Response.json(
        { error: 'user_has_reservation', existingSlot: existing.slotId },
        { status: 409 }
      );
    }

    // Check if slot is free
    const slotData = await this.ctx.storage.get<SlotData>(`slot:${slotId}`);
    if (slotData && slotData.expiresAt > now) {
      return Response.json({ error: 'slot_taken' }, { status: 409 });
    }

    // Reserve — all writes coalesced (no intervening await = crash-safe)
    const expiresAt = now + config.ttlDays * 86400;
    this.ctx.storage.put(`slot:${slotId}`, { userId, createdAt: now, expiresAt });
    this.ctx.storage.put(`user:${userId}`, { slotId, expiresAt });
    if (existing) {
      this.ctx.storage.delete(`slot:${existing.slotId}`);
    }
    // All three ops coalesce into a single atomic write (no await between them).
    // Cloudflare's automatic write coalescing guarantees this — see §5.3.

    return Response.json({ slotId, expiresAt }, { status: 201 });
  }

  private async release(request: Request): Promise<Response> {
    const { userId } = await request.json() as { userId: string };

    const existing = await this.ctx.storage.get<{ slotId: string; expiresAt: number }>(`user:${userId}`);
    if (!existing) {
      return Response.json({ error: 'no_reservation' }, { status: 404 });
    }

    // Atomic batch delete
    await this.ctx.storage.delete([`slot:${existing.slotId}`, `user:${userId}`]);

    return Response.json({ released: existing.slotId });
  }

  private async updateConfig(request: Request): Promise<Response> {
    const newConfig = await request.json() as Partial<ReservationConfig>;
    const current = await this.getConfig();
    const merged = { ...current, ...newConfig };

    // Validate bounds
    if (merged.totalGhostSlots < 0 || merged.totalGhostSlots > 100) {
      return Response.json({ error: 'totalGhostSlots must be 0-100' }, { status: 400 });
    }
    if (merged.ttlDays < 1 || merged.ttlDays > 90) {
      return Response.json({ error: 'ttlDays must be 1-90' }, { status: 400 });
    }

    // If totalGhostSlots decreased, clean up orphaned reservations.
    // Reads must happen before writes; all writes coalesce (no await between them).
    const staleKeys: string[] = [];
    if (merged.totalGhostSlots < current.totalGhostSlots) {
      for (let i = merged.totalGhostSlots + 1; i <= current.totalGhostSlots; i++) {
        const slotId = `ghost-${i}`;
        const data = await this.ctx.storage.get<SlotData>(`slot:${slotId}`);
        if (data) {
          staleKeys.push(`slot:${slotId}`);
          staleKeys.push(`user:${data.userId}`);
        }
      }
    }

    // All writes coalesced — no intervening await (see §5.3)
    if (staleKeys.length > 0) {
      this.ctx.storage.delete(staleKeys);
    }
    this.ctx.storage.put('config', merged);

    return Response.json({ config: merged });
  }

  private async getConfig(): Promise<ReservationConfig> {
    const config = await this.ctx.storage.get<ReservationConfig>('config');
    return config ?? { totalGhostSlots: 24, ttlDays: 7 };
  }
}

/** Shared helper — used by both /api/reservations and /api/reservations/config */
export function getReservationStub(env: Env): DurableObjectStub {
  const id = env.RESERVATIONS.idFromName('singleton');
  return env.RESERVATIONS.get(id);
}
```

### 6.3 API Route

```typescript
// site/src/pages/api/reservations.ts

import type { APIRoute } from 'astro';
import { getSessionFromRequest, type Env } from '@/lib/auth';
import { jsonResponse, errorResponse } from '@/lib/responses';
import { getReservationStub } from '@/lib/reservation-do';

// Rate limiting: 5 reservation ops/hour per user.
// Uses hour-bucketed keys so the window is fixed, not sliding.
// (The star endpoint's pattern resets TTL on every write — acceptable for a
// 60-second window but broken for 1-hour windows. This fixes that.)
async function isReservationRateLimited(kv: KVNamespace, userId: string): Promise<boolean> {
  const hour = Math.floor(Date.now() / 3_600_000);
  const key = `ratelimit:reserve:${userId}:${hour}`;
  const current = parseInt(await kv.get(key) ?? '0', 10);
  if (current >= 5) return true;
  await kv.put(key, String(current + 1), { expirationTtl: 7200 });
  return false;
}

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

    // Private cache when response contains user-specific userSlot data
    const cacheControl = session
      ? 'private, max-age=10'
      : 'public, max-age=10';

    return jsonResponse(data, {
      headers: { 'Cache-Control': cacheControl },
    });
  } catch (error) {
    console.error('[Reservations] DO fetch failed:', error);
    return errorResponse('Internal server error', 500);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env as Env;
  const session = await getSessionFromRequest(env, request);
  if (!session) {
    return errorResponse('Authentication required', 401);
  }

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
  if (!session) {
    return errorResponse('Authentication required', 401);
  }

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

### 6.3b Config Route

```typescript
// site/src/pages/api/reservations/config.ts

import type { APIRoute } from 'astro';
import { getSessionFromRequest, type Env } from '@/lib/auth';
import { jsonResponse, errorResponse } from '@/lib/responses';
import { getReservationStub } from '@/lib/reservation-do';

/**
 * Maintainer authorization: MAINTAINER_USER_IDS env var contains a
 * comma-separated list of GitHub user IDs (numeric strings).
 * Set via: npx wrangler secret put MAINTAINER_USER_IDS
 * Example value: "12345,67890"
 */
function isMaintainer(env: Env, userId: string): boolean {
  const ids = (env.MAINTAINER_USER_IDS ?? '').split(',').map(s => s.trim());
  return ids.includes(userId);
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env as Env;
  const session = await getSessionFromRequest(env, request);
  if (!session) {
    return errorResponse('Authentication required', 401);
  }

  if (!isMaintainer(env, session.userId)) {
    return errorResponse('Forbidden', 403);
  }

  let body: { totalGhostSlots?: unknown; ttlDays?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  // Type validation before forwarding to DO
  if (body.totalGhostSlots !== undefined && typeof body.totalGhostSlots !== 'number') {
    return errorResponse('totalGhostSlots must be a number', 400);
  }
  if (body.ttlDays !== undefined && typeof body.ttlDays !== 'number') {
    return errorResponse('ttlDays must be a number', 400);
  }

  const stub = getReservationStub(env);
  const doRequest = new Request('https://do/config', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  try {
    const response = await stub.fetch(doRequest);
    const data = await response.json();
    return jsonResponse(data, { status: response.status });
  } catch (error) {
    console.error('[Reservations] DO config update failed:', error);
    return errorResponse('Internal server error', 500);
  }
};
```

**Maintainer authorization**: Uses a `MAINTAINER_USER_IDS` environment variable (comma-separated GitHub numeric user IDs). Set via `npx wrangler secret put MAINTAINER_USER_IDS`. This follows the existing pattern of secrets-based config and avoids introducing a new role system. The `Env` interface must include `MAINTAINER_USER_IDS: string`.

### 6.4 wrangler.toml Changes

```toml
# Add to existing wrangler.toml:

[[durable_objects.bindings]]
name = "RESERVATIONS"
class_name = "ReservationCoordinator"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["ReservationCoordinator"]
```

### 6.4b astro.config.mjs Changes (required)

The Astro Cloudflare adapter must be configured with a custom worker entry point to export the DO class. Without this, the DO class is unreachable by the Workers runtime and deployment will fail.

```javascript
// astro.config.mjs — update the adapter call:
adapter: cloudflare({
  workerEntryPoint: {
    path: 'src/worker.ts',
    namedExports: ['ReservationCoordinator']
  }
}),
```

### 6.4c Custom Worker Entry

```typescript
// site/src/worker.ts

import type { SSRManifest } from 'astro';
import { App } from 'astro/app';
import { handle } from '@astrojs/cloudflare/handler';
import { ReservationCoordinator } from './lib/reservation-do';

// DO class must be returned from createExports — Astro's workerEntryPoint.namedExports
// hoists properties from this return object as worker-level named exports.
// A top-level re-export does NOT work; the class must be a property of the return object.

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

### 6.5 Type Additions

```typescript
// Add to site/src/types/index.ts

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

### 6.6 Env Type Updates

Both `CloudflareEnv` and the manually-maintained `Env` must be updated. These are currently separate interfaces (existing tech debt — `Env` in `auth.ts` mirrors `CloudflareEnv` in `env.d.ts`).

```typescript
// Add to site/src/env.d.ts CloudflareEnv interface:
RESERVATIONS: DurableObjectNamespace;
MAINTAINER_USER_IDS: string;
```

```typescript
// Add to site/src/lib/auth.ts Env interface:
RESERVATIONS: DurableObjectNamespace;
MAINTAINER_USER_IDS: string;
```

### 6.7 PR Consumption Flow

When a PR is merged and a new skillset is added to the registry:

1. Maintainer calls `POST /api/reservations/config` with decremented `totalGhostSlots` (DO is the single source of truth — no KV config to sync)
2. The DO's `updateConfig()` automatically cleans up any reservations on slots beyond the new range (e.g., if `totalGhostSlots` goes from 24 to 23, `ghost-24` reservation is deleted along with its `user:{userId}` entry)
3. On next grid render, fewer ghost slots appear

This is a single API call per merged PR. The config endpoint is defined in section 6.3b with maintainer authorization via `MAINTAINER_USER_IDS` env var.

---

## 7. Positioning & Communications Impact

Ghost entries fundamentally change how the registry communicates. This section captures the narrative shift so messaging stays aligned with the feature.

### 7.1 The Narrative Flip

| Before (empty registry) | After (ghost grid) |
|---|---|
| "Here's a registry. We have one skillset." | "25 slots this quarter. 1 filled. 24 available." |
| Empty grid reads as dead project | Full grid with ghosts reads as intentional scarcity |
| "Submit a skillset" (open-ended ask) | "Claim a slot" (bounded action) |
| "We need contributions" | "We have capacity for 24 more" |
| Passive browse, no reason to return | Active grid with countdowns — reason to check back |
| No urgency | Countdown timers signal activity and deadlines |

The core reframe: **emptiness becomes scarcity**. The grid isn't missing content — it's holding space for what's coming.

### 7.2 Three Audiences, One Grid

**Contributors** see a CTA with teeth. "Reserve" is a commitment device — public (though anonymous) accountability with a ticking clock. This filters out casual interest and selects for people who are ready to ship.

**Spectators** (non-contributors) get a reason to return. Reserved slots with countdowns are implicit promises: *someone is building something, and it lands in N days*. When a reservation expires and reopens, or when a real skillset materializes, the grid has changed. It's a feed without being a feed.

**First-time visitors** see a grid that's alive. Even with 1 real skillset, the presence of reserved slots and available ghost cards communicates: this project has momentum, other people are participating, and there's a finite window to get in.

### 7.3 Messaging Implications

**Launch framing**: "We opened 25 slots for Q1" is an event with a cap. "We launched a skillset registry" is a product announcement. The former creates urgency; the latter invites bookmarking and forgetting.

**Batch cadence**: Each quarterly slot refresh is a natural content moment. "Q2 slots are open — 25 new spots" is a repeatable announcement that stays fresh because the number and timing change.

**Social proof via absence**: Reserved slots prove participation without revealing identity. 5 reserved slots = 5 people building right now. This is more compelling than a contributor count because it's forward-looking (things are coming) rather than backward-looking (things were made).

**Expiry as signal**: When a reservation expires without a submission, the slot reopens. This is visible activity — the grid changed, there's an opening. It also subtly communicates the bar: not everyone who reserves follows through, which reinforces that shipped skillsets are real.

### 7.4 What NOT to Communicate

- Don't frame ghost slots as "coming soon" placeholders — that's vaporware energy
- Don't reveal who holds reservations — anonymity is the design, not a limitation
- Don't apologize for the cap — scarcity is the feature, not a constraint
- Don't promise specific skillsets in specific slots — the grid is dynamic and that's the point
