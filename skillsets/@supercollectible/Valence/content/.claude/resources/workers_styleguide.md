# Workers Style Guide
## Cloudflare Workers + KV + Durable Objects Development Standards

---

## Architecture

The site runs as a **single Cloudflare Worker** via Astro SSR. There is no separate Workers backend — all API routes, auth endpoints, and static pages are served from one worker. Routing is handled by Astro's file-based routing, not manual `url.pathname` matching.

```
Single Cloudflare Worker (Astro SSR)
├── Static pages (prerendered at build time, served from CDN)
├── SSR pages (skillset detail, rendered on-demand)
├── Auth endpoints (/login, /callback, /logout)
├── API routes (/api/star, /api/downloads, /api/reservations, ...)
└── Durable Object export (ReservationCoordinator)
```

### Custom Worker Entry

```typescript
// /src/worker.ts
// Exports Astro handler + Durable Object class
export { default } from './astro-handler';
export { ReservationCoordinator } from './lib/reservation-do';
```

### Environment Bindings

```typescript
// /src/lib/auth.ts
export interface Env {
  AUTH: KVNamespace;              // OAuth state storage
  DATA: KVNamespace;              // Stars, downloads, rate limits
  RESERVATIONS: DurableObjectNamespace;  // Atomic slot management
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET: string;
  MAINTAINER_USER_IDS: string;    // Comma-separated GitHub user IDs
}
```

Access in Astro API routes:
```typescript
const env = locals.runtime.env as Env;
```

---

## KV Storage Schema

### AUTH Namespace
```
oauth:{state}                  → { codeVerifier, returnTo }    (5-min TTL)
```

### DATA Namespace
```
stars:{skillsetId}             → "42"                          (star count, no expiry)
user:{userId}:stars            → ["id1", "id2"]                (starred IDs, JSON array, no expiry)
downloads:{skillsetId}         → "123"                         (download count, no expiry)
ratelimit:{userId}             → "7"                           (star ops count, 60s TTL)
dl-rate:{ip}                   → "12"                          (download ops count, 3600s TTL)
ratelimit:{prefix}:{id}:{hour} → "3"                          (hour-bucketed counter, 7200s TTL)
```

### RESERVATIONS Durable Object Storage
```
slot:{batchId}                 → SlotData (reserved or submitted)
user:{userId}                  → string (batch ID user has reserved)
config                         → { totalGhostSlots, ttlDays, cohort }
```

---

## Session Management (JWT)

Sessions use **JWT tokens in httpOnly cookies** — no server-side session storage in KV.

### Session Flow
```
Login → Create JWT (HMAC-SHA256) → Set httpOnly cookie (7-day expiry)
Request → Extract cookie → Verify JWT signature + expiration → Return session
Logout → Set cookie with Max-Age=0
```

### Key Functions (lib/auth.ts)
```typescript
// Create session after OAuth callback
const token = await createSessionToken(user, env);
// JWT payload: { sub: userId, login, avatar, iat, exp }

// Set secure cookie
const cookie = createSessionCookie(token);
// → "session={token}; HttpOnly; Secure; SameSite=Lax; Max-Age=604800"

// Verify session on API requests
const session = await getSessionFromRequest(request, env);
// Returns { sub, login, avatar } or null

// Clear session
const cookie = createLogoutCookie();
// → "session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
```

### JWT Details
- Algorithm: HS256 (HMAC-SHA256) via Web Crypto API
- Secret: `JWT_SECRET` environment variable
- Expiry: 7 days
- Encoding: RFC 4648 base64url (replaces `+` with `-`, `/` with `_`, strips `=`)
- Cookie: `HttpOnly; Secure; SameSite=Lax`

---

## OAuth Flow with PKCE

```
/login → Generate state + PKCE verifier → Store in AUTH KV (5-min TTL)
  ↓
Redirect to GitHub /login/oauth/authorize (with code_challenge)
  ↓
GitHub → /callback?code={code}&state={state}
  ↓
Validate state (AUTH KV) → Exchange code (with code_verifier) → Fetch /user
  ↓
createSessionToken() → JWT with HMAC-SHA256
  ↓
Set httpOnly cookie → Redirect to returnTo URL
```

### PKCE Implementation
```typescript
// Generate verifier: 32 cryptographically random bytes, base64url-encoded
const bytes = crypto.getRandomValues(new Uint8Array(32));
const verifier = base64url(bytes);

// Generate challenge: SHA-256 hash of verifier, base64url-encoded
const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
const challenge = base64url(new Uint8Array(hash));

// Store in KV
await env.AUTH.put(`oauth:${state}`, JSON.stringify({ codeVerifier: verifier, returnTo }), {
  expirationTtl: 300,
});
```

### CSRF Protection
- UUID `state` parameter stored in AUTH KV with 5-minute TTL
- Validated on callback, **deleted immediately** to prevent replay attacks
- Missing or invalid state → 400 error

---

## API Route Pattern

All API routes follow the same flow: **auth → rate limit → validate → business logic → response**.

```typescript
// /src/pages/api/star.ts
import type { APIRoute } from 'astro';
import { getSessionFromRequest, type Env } from '@/lib/auth';
import { toggleStar, isRateLimited } from '@/lib/stars';
import { jsonResponse, errorResponse } from '@/lib/responses';
import { isValidSkillsetId } from '@/lib/validation';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env as Env;

  // 1. Auth
  const session = await getSessionFromRequest(request, env);
  if (!session) return errorResponse('Unauthorized', 401);

  // 2. Rate limit
  if (await isRateLimited(session.sub, env)) {
    return errorResponse('Rate limit exceeded', 429);
  }

  // 3. Validate
  const { skillsetId } = await request.json();
  if (!isValidSkillsetId(skillsetId)) {
    return errorResponse('Invalid skillset ID', 400);
  }

  // 4. Business logic
  const result = await toggleStar(skillsetId, session.sub, env);

  // 5. Response
  return jsonResponse({ skillsetId, starred: result.starred, count: result.count });
};
```

### Response Helpers (lib/responses.ts)

```typescript
// Success response
jsonResponse(data)                           // → 200, Content-Type: application/json
jsonResponse(data, { status: 201 })          // → 201

// Error response
errorResponse('Unauthorized', 401)           // → { "error": "Unauthorized" }
errorResponse('Rate limited', 429, { retryAfter: 60 })  // → { "error": "...", "retryAfter": 60 }
```

### Standard Error Format
```json
{ "error": "Error message description" }
```

Additional context fields may be spread alongside `error` when useful.

---

## Rate Limiting

Two rate limiting strategies, both KV-based with auto-expiring keys.

### Minute-Window (Stars)
```typescript
// lib/stars.ts — isRateLimited()
// Key: ratelimit:{userId}    TTL: 60s
// Limit: 10 ops/min per user
// Sliding window approximation: first request sets counter with 60s TTL,
// subsequent requests increment and renew TTL
```

### Hour-Bucketed (Downloads, Reservations, Verify, Lookup)
```typescript
// lib/rate-limit.ts — isHourlyRateLimited(kv, prefix, id, limit)
// Key: ratelimit:{prefix}:{id}:{hour}    TTL: 7200s (2 hours, survives hour boundary)
// Hour bucket: Math.floor(Date.now() / 3_600_000)
// Prevents TTL-reset bug where frequent operations extend the window indefinitely
```

### Rate Limit Tiers
| Endpoint | Limit | Key By | Strategy |
|----------|-------|--------|----------|
| Star toggle | 10/min | User ID | Minute-window |
| Download increment | 30/hr | IP address | Hour-bucketed |
| Reservation ops | 5/hr | User ID | Hour-bucketed |
| Verify (CI) | 30/hr | IP address | Hour-bucketed |
| Lookup (CLI) | 30/hr | IP address | Hour-bucketed |

---

## Input Validation

All user input is validated before touching KV or Durable Objects.

### Skillset ID Validation (lib/validation.ts)
```typescript
// Pattern: ^@?[\w-]+\/[\w-]+$
// Valid:   @supercollectible/Valence, user/name
// Invalid: ../etc/passwd, a/b/c, @user name/foo
isValidSkillsetId(skillsetId)  // → boolean
```

### Slot ID Validation
```typescript
// Pattern: ^\d{1,3}\.\d{1,3}\.\d{3}$
// Valid:   5.10.001
// Invalid: 999.999.99, abc.def.ghi
```

### Why Validate Before KV Access
Skillset IDs are used as KV key segments (`stars:{skillsetId}`). Without validation, a crafted ID like `../../secret` could read/write unintended keys.

---

## XSS Protection

### HTML Sanitization (lib/sanitize.ts)
Uses `xss` (js-xss) — a pure string-based parser that works in Cloudflare Workers (no DOM dependency).

```typescript
sanitizeHtml(readmeHtml)
// Whitelist: h1-h6, p, br, hr, blockquote, em, strong, del, ul, ol, li,
//            a (href, title, target, rel), img (src, alt, title),
//            code, pre (class), table, thead, tbody, tr, th, td, div, span (class)
// Strips: script, style, noscript (tag AND content removed)
// Removes: inline event handlers (onclick, onerror), javascript: URLs
```

### URL Protocol Validation
```typescript
sanitizeUrl(url)
// Parses with new URL(), allows only http: and https: protocols
// Returns '#' for: javascript:, data:, vbscript:, file:, malformed URLs
```

### Why Not DOMPurify?
DOM-based sanitizers (`isomorphic-dompurify`, `sanitize-html`) require DOM APIs that don't exist in Cloudflare Workers. `xss` (js-xss) uses pure string parsing.

---

## Durable Objects (Reservations)

The reservation system uses a Durable Object for atomic slot management. A single named instance ("singleton") provides serialized access.

### Access Pattern
```typescript
// lib/reservation-do.ts
const stub = getReservationStub(env);  // Gets singleton DO stub
const response = await stub.fetch(new Request('http://do/reserve', {
  method: 'POST',
  body: JSON.stringify({ slotId, userId, githubLogin }),
}));
```

### DO HTTP Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/status` | All slot states + config (optional `X-User-Id` header) |
| POST | `/reserve` | Atomic slot reservation |
| DELETE | `/release` | Atomic slot release |
| POST | `/config` | Update config (maintainer) |
| GET | `/verify` | Verify batch ID + identity (CI) |
| POST | `/submit` | Transition slot to submitted (maintainer) |
| GET | `/lookup` | Find user's batch ID |

### Atomic Write Coalescing
The DO runtime coalesces `ctx.storage.put()` and `ctx.storage.delete()` calls within the same request into a single transaction. Avoid `await` between related writes:

```typescript
// Atomic reserve (both writes coalesced into one transaction)
this.ctx.storage.put(`slot:${slotId}`, slotData);
this.ctx.storage.put(`user:${userId}`, slotId);

// Atomic release
this.ctx.storage.delete(`slot:${slotId}`);
this.ctx.storage.delete(`user:${userId}`);
```

### Batch ID Format
`{position}.{batchSize}.{cohort}` (e.g., `5.10.001`)
- Position: 1-indexed slot number
- BatchSize: total ghost slots in cohort
- Cohort: 3-digit zero-padded identifier

### State Machine
```
available → reserved (POST /reserve, 24-hour TTL)
reserved  → available (DELETE /release, or TTL expiry)
reserved  → submitted (POST /submit, maintainer only, terminal)
submitted → (terminal, never released)
```

---

## Maintainer Authorization

```typescript
// lib/maintainer.ts
isMaintainer(userId, env)
// Checks userId against MAINTAINER_USER_IDS env var (comma-separated)
// Returns false if env var not set
```

Used by: `/api/reservations/config` (POST), `/api/reservations/submit` (POST).

---

## Error Handling

### AuthError (lib/auth.ts)
```typescript
class AuthError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
  }
}
// Thrown during OAuth flow failures
// Caught by auth endpoints, redirected to homepage with error params
```

### KV Retry with Exponential Backoff (lib/stars.ts)
```typescript
// On 429 errors from KV:
// Attempt 1: wait 100ms
// Attempt 2: wait 200ms
// Attempt 3: wait 400ms (final, throw on failure)
// Applies to both reads and writes
// Returns default value on read failure after retries
```

### API Error Responses
All API endpoints use `errorResponse()` for consistent formatting:
```typescript
errorResponse('Unauthorized', 401)       // Missing session
errorResponse('Rate limit exceeded', 429) // Too many requests
errorResponse('Invalid skillset ID', 400) // Bad input
errorResponse('Forbidden', 403)          // Not maintainer
errorResponse('Conflict', 409)           // Slot already taken
```

---

## KV Read/Write Patterns

### Read with Fallback
```typescript
async function getStarCount(skillsetId: string, env: Env): Promise<number> {
  const value = await env.DATA.get(`stars:${skillsetId}`);
  return value ? parseInt(value, 10) : 0;
}
```

### Toggle with Parallel Write
```typescript
async function toggleStar(skillsetId: string, userId: string, env: Env) {
  const userStars = await env.DATA.get(`user:${userId}:stars`, 'json') as string[] ?? [];
  const count = await getStarCount(skillsetId, env);

  const starred = userStars.includes(skillsetId);
  const newStars = starred ? userStars.filter(id => id !== skillsetId) : [...userStars, skillsetId];
  const newCount = starred ? count - 1 : count + 1;

  // Parallel writes (both independent)
  await Promise.all([
    env.DATA.put(`user:${userId}:stars`, JSON.stringify(newStars)),
    env.DATA.put(`stars:${skillsetId}`, newCount.toString()),
  ]);

  return { starred: !starred, count: newCount };
}
```

### Hour-Bucketed Counter
```typescript
async function isHourlyRateLimited(kv: KVNamespace, prefix: string, id: string, limit: number): Promise<boolean> {
  const hour = Math.floor(Date.now() / 3_600_000);
  const key = `ratelimit:${prefix}:${id}:${hour}`;
  const current = parseInt(await kv.get(key) ?? '0', 10);

  if (current >= limit) return true;

  await kv.put(key, (current + 1).toString(), { expirationTtl: 7200 });
  return false;
}
```

---

## Testing Pattern (Vitest + jsdom)

```typescript
// /src/pages/api/__tests__/star.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock KV namespace
function createMockKV(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    put: vi.fn((key: string, value: string) => { store.set(key, value); return Promise.resolve(); }),
    delete: vi.fn((key: string) => { store.delete(key); return Promise.resolve(); }),
  } as unknown as KVNamespace;
}

describe('Star API', () => {
  let env: Env;

  beforeEach(() => {
    env = {
      AUTH: createMockKV(),
      DATA: createMockKV(),
      RESERVATIONS: {} as DurableObjectNamespace,
      GITHUB_CLIENT_ID: 'test',
      GITHUB_CLIENT_SECRET: 'test',
      JWT_SECRET: 'test-secret',
      MAINTAINER_USER_IDS: '',
    };
  });

  it('returns 401 without session', async () => {
    // Test API route handler with mock env
  });
});
```

### Test Infrastructure
- **Framework**: Vitest + jsdom environment
- **React**: React Testing Library for component tests
- **KV Mocking**: In-memory `Map` wrapped as `KVNamespace`
- **DO Mocking**: `vitest-mocks/cloudflare-workers.ts` provides stub `DurableObject` base class
- **Shared Helpers**: `lib/__tests__/test-utils.ts` for mock env creation
- **No `unstable_dev`**: Tests run in jsdom, not in real Workers runtime

---

## Environment Variables

### wrangler.toml
```toml
name = "skillsets-cc"
main = "dist/_worker.js"

kv_namespaces = [
  { binding = "AUTH", id = "..." },
  { binding = "DATA", id = "..." }
]

[durable_objects]
bindings = [
  { name = "RESERVATIONS", class_name = "ReservationCoordinator" }
]

[[migrations]]
tag = "v1"
new_classes = ["ReservationCoordinator"]
```

### Setting Secrets
```bash
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put JWT_SECRET
npx wrangler secret put MAINTAINER_USER_IDS
```

---

## Security Checklist

- [ ] JWT sessions in `HttpOnly; Secure; SameSite=Lax` cookies
- [ ] OAuth CSRF via random state with 5-min KV TTL
- [ ] OAuth PKCE via SHA-256 code_challenge (prevents code interception)
- [ ] Rate limiting on all mutating endpoints
- [ ] Input validation before KV/DO access (`isValidSkillsetId`, slot ID regex)
- [ ] HTML sanitization via js-xss whitelist on user content
- [ ] URL protocol validation (`sanitizeUrl` rejects `javascript:`, `data:`, etc.)
- [ ] Maintainer-only access on privileged endpoints (config, submit)
- [ ] No server-side session storage (JWT is self-contained, no KV session data to leak)
- [ ] Secrets managed via `wrangler secret put` (never committed)

---

## Deployment Checklist

- [ ] Secrets set via `wrangler secret put` (CLIENT_ID, CLIENT_SECRET, JWT_SECRET, MAINTAINER_USER_IDS)
- [ ] AUTH and DATA KV namespaces created and bound
- [ ] RESERVATIONS Durable Object binding configured with migration
- [ ] `search-index.json` regenerated if skillsets changed (`npm run build:index`)
- [ ] Build passes (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Deploy via `npx wrangler deploy` or GitHub Actions
