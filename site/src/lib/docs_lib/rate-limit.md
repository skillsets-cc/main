# rate-limit

## Purpose
Trust-gate rate limiting for Cloudflare Workers. Implements daily-bucketed counters, permanent/TTL freeze (account suspension), and consecutive-breach tracking. Replaces the older minute/hour window approach with a day-bucket model and escalating consequences for repeated violations.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `IP_FREEZE_TTL` | const | 3-month TTL in seconds for IP freezes |
| `hashIp` | function | SHA-256 hash of IP address (first 8 bytes, hex) for anonymized KV keys |
| `isFrozen` | function | Check if a prefix:id is frozen (suspended) |
| `freeze` | function | Write a freeze entry to KV with optional TTL |
| `checkDailyLimit` | function | Check and increment daily counter; returns `{limited, count}` |
| `BreachPolicy` | interface | Policy config: `threshold` (0 = immediate freeze), `bucketType`, optional `freezeTtl` |
| `recordBreach` | function | Record a daily limit breach; freezes if consecutive count hits threshold |
| `PREFIX_REGISTRY` | const | Registry of known prefixes: `star`, `dl`, `reserve`, `delete` |
| `checkRateLimit` | function | Orchestrator: freeze check → daily limit → breach tracking; returns `{allowed, response?, warning?}` |

## Dependencies
- **Internal**: `responses.ts` (`errorResponse`, `frozenResponse`)
- **External**: Web Crypto API (`crypto.subtle.digest`), `KVNamespace` (Cloudflare Workers runtime)

## Integration Points
- **Used by**:
  - `pages/api/star.ts` (prefix: `star`, identity: userId)
  - `pages/api/downloads/start.ts` (prefix: `dl`, identity: ip hash)
  - `pages/api/reservations.ts` (prefix: `reserve`, identity: userId)
- **Stores data in KV** with key patterns:
  - `freeze:{prefix}:{id}` → `"1"` (permanent or TTL)
  - `ratelimit:{prefix}:{id}:{dayBucket}` → count string (25h TTL)
  - `breaches:{prefix}:{id}` → JSON `{count, lastBucket}` (permanent or TTL)

## Key Logic

### Daily Bucket
`Math.floor(Date.now() / 86_400_000)` scopes each counter to a UTC calendar day. Counter TTL is 25h (90_000s) to survive day boundaries.

### Breach Escalation
`recordBreach` tracks consecutive daily breaches. A breach is counted only if `lastBucket === currentBucket - 1` (yesterday). Non-consecutive streaks reset the count. When `count >= threshold`, the account is frozen. `threshold: 0` means immediate freeze on first breach.

### Trust Gate Flow
`checkRateLimit` enforces: (1) reject if frozen → (2) reject and record breach if daily limit hit → (3) warn if on last allowed action → (4) allow. On KV error, allows through with a log.
