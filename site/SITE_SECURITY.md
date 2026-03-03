# Security Mitigations — site/

## 1. Authentication & OAuth (`lib/auth.ts`)
- **CSRF**: Random `state` param stored in KV with 5-min TTL, deleted after use (no replay)
- **PKCE**: 32-byte `code_verifier` + SHA-256 `code_challenge` on every OAuth flow
- **JWT Sessions**: HMAC-SHA256 signed, 7-day expiry, validated on every request
- **Cookie flags**: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, 7-day max-age
- **Logout**: Cookie set with `Max-Age=0` for immediate invalidation

## 2. Security Headers (`middleware.ts`)
- `X-Frame-Options: SAMEORIGIN` — clickjacking prevention (legacy browsers)
- `X-Content-Type-Options: nosniff` — MIME sniffing prevention
- `Referrer-Policy: strict-origin-when-cross-origin` — referrer leakage control
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` — feature lockdown
- `Content-Security-Policy: frame-ancestors 'self'; base-uri 'self'; form-action 'self' https://github.com` — clickjacking + form hijack prevention

## 3. XSS Prevention (`lib/sanitize.ts`)
- **HTML**: `xss` (js-xss) with tag/attribute whitelist, strips `<script>`, `<style>`, `<noscript>`
- **URLs**: `sanitizeUrl()` parses with `new URL()`, allows only `http:`/`https:` protocols, returns `#` for everything else
- Applied to all user-supplied markdown and URLs (author links, production links)

## 4. Open Redirect Prevention (`pages/login.ts`)
- `returnTo` must start with `/`
- Rejects `//` (protocol-relative redirect)
- Rejects `\` (browser normalization to `//evil.com`)
- Falls back to `/` on any invalid value

## 5. Rate Limiting (`lib/rate-limit.ts`, `lib/stars.ts`, `lib/downloads.ts`)

| Resource | Limit | Bucket | Key |
|----------|-------|--------|-----|
| Stars | 10 ops/min | per user ID | minute-bucketed |
| Downloads | 30/hr | per IP (`clientAddress`) | hour-bucketed |
| Reservations | 5/hr | per user ID | hour-bucketed |
| Reservation lookup | 30/hr | per IP (`clientAddress`) | hour-bucketed |

KV-backed with time-based bucketing to prevent TTL-reset drift. Stars also have exponential backoff retry (3 attempts) on KV 429s.

## 6. Input Validation

| Input | Validation | File |
|-------|-----------|------|
| Skillset ID | `/^@?[\w-]+\/[\w-]+$/` | `lib/validation.ts` |
| Batch ID | `/^\d{1,3}\.\d{1,3}\.\d{3}$/` | `lib/reservation-do.ts` |
| Skillset ID (submit) | `/^@[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/`, max 200 chars | `lib/reservation-do.ts` |
| GitHub ID (lookup) | `/^\d+$/` | `api/reservations/lookup.ts` |
| Config ranges | totalGhostSlots: 1-100, ttlDays: 1-30, cohort: 1-999 | `lib/reservation-do.ts` |
| JSON bodies | Try-catch parse, 400 on invalid | `lib/responses.ts` |

## 7. API Security
- **Auth gating**: `/api/star`, `/api/me`, `/api/reservations` POST/DELETE require valid JWT
- **Maintainer gating**: `/api/reservations/submit` requires `isMaintainer()` check
- **Body stripping**: submit endpoint forwards only `{ batchId, skillsetId }`, not raw body
- **Cache headers**: `private, no-store` on `/api/me`; `public, max-age=60` on download counts
- **Consistent error format**: `errorResponse()` returns proper status codes without leaking internals

## 8. Concurrency (Durable Object)
- **TOCTOU prevention**: `blockConcurrencyWhile()` serializes reservation/release/submit operations
- **Idempotency guards**: Checks for existing reservations, already-submitted slots, expired slots
- **Cohort transitions**: Preserves submitted data, cleans reserved slots on config changes

## 9. Error Handling
- Generic messages to clients ("Internal server error")
- Detailed server-side logging with tags (`[Auth]`, `[Stars]`, `[Downloads]`, etc.)
- No stack traces or internal state exposed in responses
