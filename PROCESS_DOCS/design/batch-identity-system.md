# Design: Batch Identity System

## 1. Executive Summary

Replace the arbitrary `ghost-N` key system with a structured batch ID format (`{position}.{batch_size}.{cohort}`) that serves as the canonical identity for every registry entry. The batch ID threads through the entire lifecycle: slot creation, reservation, CLI scaffolding, PR submission, CI validation, and merged skillset display. It gates the submission pipeline — no reservation, no merge.

**Impact**: Every component that touches ghost cards changes: Durable Object storage keys, API responses, type definitions, grid rendering, CLI init flow, CI validation, and the skillset manifest schema.

---

## 2. Rationale

| Decision | Rationale | Alternative | Why Rejected |
|----------|-----------|-------------|--------------|
| Format `{pos}.{size}.{cohort}` | Single format everywhere — display, storage, API, CLI, CI. Encodes position, batch context, and cohort in one string | UUID or sequential integer | No semantic meaning; can't derive batch context from the ID alone |
| Batch ID in `skillset.yaml` | CI already parses the manifest; consolidates metadata in one file; `init` already scaffolds it | Separate `.skillset-meta.json` | Extra file to invent, validate, and maintain; CI reads two files instead of one |
| Cohort immutability | Batch size is embedded in every ID — changing slot count mid-cohort creates stale IDs | Allow batch_size changes within a cohort | IDs like `5.11.001` become wrong when cohort grows to 15 slots; confusing and incorrect |
| `gh` CLI hard dependency | Need authenticated GitHub username to validate reservation ownership | Manual username entry | Can't trust self-reported usernames; `gh` provides verified identity |
| Maintainer manual submit | Simple, explicit, matches existing manual merge flow | Post-merge webhook automation | Adds complexity; maintainer already reviews and merges manually |
| Lazy migration (cut-over) | Pre-launch, no real user reservations to preserve | Dual-read migration period | Unnecessary complexity for zero production data |

---

## 3. Technology Stack

No new dependencies. All changes use existing primitives:

| Component | Technology | Status |
|-----------|-----------|--------|
| Slot storage | Cloudflare Durable Object (SQLite-backed) | Existing — key format changes |
| API routes | Astro SSR endpoints | Existing — new `/verify` and `/submit` endpoints |
| Rate limiting | KV hour-bucketed counters | Existing — added to `/verify` and `/lookup` endpoints |
| CLI | Commander.js + `gh` CLI | Existing + new `gh` dependency for `init` |
| CI | GitHub Actions + `yq` | Existing — new validation step |
| Schema | JSON Schema (draft 2020-12) | Existing — new `batch_id` field |
| Grid display | React island (SkillsetGrid + GhostCard) | Existing — batch ID replaces index/total |

---

## 4. Architecture

### 4.1 Batch ID Format

```
{position}.{batch_size}.{cohort}
    │           │          │
    │           │          └── 3-digit zero-padded cohort number (001, 002, ...)
    │           └──────────── total slots in this cohort (immutable once created)
    └──────────────────────── 1-indexed position within the cohort
```

**Examples**: `1.11.001`, `5.11.001`, `11.11.001`, `3.20.002`

**Syntactic validation regex**: `^\d{1,3}\.\d{1,3}\.\d{3}$`

**Parsing + semantic validation**:
```typescript
function parseBatchId(id: string): { position: number; batchSize: number; cohort: number } {
  const [pos, size, cohort] = id.split('.');
  return { position: parseInt(pos, 10), batchSize: parseInt(size, 10), cohort: parseInt(cohort, 10) };
}

function formatBatchId(position: number, batchSize: number, cohort: number): string {
  return `${position}.${batchSize}.${String(cohort).padStart(3, '0')}`;
}

/** Validate batch ID against current config. Returns error string or null. */
function validateBatchId(id: string, config: Config): string | null {
  const BATCH_ID_REGEX = /^\d{1,3}\.\d{1,3}\.\d{3}$/;
  if (!BATCH_ID_REGEX.test(id)) return 'Invalid batch ID format';
  const { position, batchSize, cohort } = parseBatchId(id);
  if (position < 1 || position > batchSize) return 'Position out of range';
  if (batchSize !== config.totalGhostSlots) return 'Batch size does not match current cohort';
  if (cohort !== config.cohort) return 'Cohort does not match current cohort';
  return null;
}
```

**Invariants**:
- `1 <= position <= batch_size`
- `1 <= batch_size <= 100`
- `1 <= cohort <= 999`
- Batch size is immutable for a given cohort

### 4.2 State Machine

```
                    ┌─────────────┐
                    │  Available   │◄──────────────────┐
                    └──────┬──────┘                    │
                           │ POST /reserve             │ cancel / expire
                           ▼                           │
                    ┌─────────────┐                    │
                    │  Reserved    │────────────────────┘
                    └──────┬──────┘
                           │ POST /submit (maintainer)
                           ▼
                    ┌─────────────┐
                    │  Submitted   │  ← terminal state
                    └─────────────┘
```

- **Available → Reserved**: User claims slot via website (existing flow, new key format)
- **Reserved → Available**: User cancels, or reservation expires (lazy expiry on read)
- **Reserved → Submitted**: Maintainer marks slot after PR merge
- **Submitted**: Permanent. Real skillset card inherits the batch ID

### 4.3 Data Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│  Maintainer                                                          │
│  POST /api/reservations/config { totalGhostSlots: 11, cohort: 1 }   │
│  → Creates slots 1.11.001 through 11.11.001                         │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  User (website)                                                      │
│  1. Browses grid, sees available ghost cards with batch IDs          │
│  2. Clicks "Claim" on slot 5.11.001                                  │
│  3. POST /api/reservations { slotId: "5.11.001" }                    │
│  4. Reservation stored with userId + githubLogin + expiresAt         │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  User (CLI)                                                          │
│  1. npx skillsets init                                               │
│  2. gh auth status → verified GitHub login                           │
│  3. gh api user → { login: "username", id: "12345" }                 │
│  4. GET /api/reservations/lookup?githubId=12345 → { batchId }        │
│  5. Scaffold skillset.yaml with batch_id: "5.11.001"                 │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  User (PR)                                                           │
│  1. Submits PR to skillsets-cc/main                                  │
│  2. skillset.yaml contains batch_id: "5.11.001"                      │
│  3. CI extracts batch_id + PR author login                           │
│  4. GET /api/reservations/verify?batchId=5.11.001&login=username     │
│  5. Match → pass; no match → block                                   │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Maintainer (post-merge)                                             │
│  1. Reviews PR, merges                                               │
│  2. POST /api/reservations/submit { batchId: "5.11.001",             │
│       skillsetId: "@username/SkillsetName" }                         │
│  3. Slot transitions to submitted state                              │
│  4. Grid now shows real skillset card with batch ID bottom-right     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. Protocol / Schema

### 5.1 skillset.yaml — New `batch_id` Field

```yaml
schema_version: "1.0"
batch_id: "5.11.001"    # ← NEW: assigned by init from reservation

name: "MySkillset"
version: "1.0.0"
# ... rest unchanged
```

**JSON Schema addition** (`schema/skillset.schema.json`):

```json
{
  "batch_id": {
    "type": "string",
    "pattern": "^\\d{1,3}\\.\\d{1,3}\\.\\d{3}$",
    "description": "Registry batch ID assigned from reservation (format: position.batch_size.cohort)"
  }
}
```

Add `"batch_id"` to `properties` but **not** to the `required` array. The schema uses `additionalProperties: false`, so `batch_id` must be in `properties` to be accepted, but making it required would break existing skillsets (e.g., Valence) that predate the batch system. CI enforces `batch_id` presence for new submissions via the `/verify` endpoint — schema validation alone does not gate it.

### 5.2 Durable Object Storage Schema

**Config** (`config` key):
```typescript
interface Config {
  totalGhostSlots: number;  // = batch_size for this cohort
  ttlDays: number;
  cohort: number;           // integer, displayed zero-padded as 3 digits
}
```

**Slot data** (`slot:{batchId}` key, e.g. `slot:5.11.001`):
```typescript
// Discriminated union — `status` field distinguishes reserved from submitted
interface ReservedSlotData {
  status: 'reserved';
  userId: string;           // GitHub numeric user ID
  githubLogin: string;      // GitHub login (for CI verification)
  expiresAt: number;        // Unix timestamp (seconds)
}

interface SubmittedSlotData {
  status: 'submitted';
  userId: string;
  githubLogin: string;
  skillsetId: string;       // e.g., "@username/SkillsetName"
  submittedAt: number;      // Unix timestamp (seconds)
}

type SlotData = ReservedSlotData | SubmittedSlotData;
```

**User index** (`user:{userId}` key):
```typescript
// Value is the batch ID string, e.g. "5.11.001"
string
```

### 5.3 API Types

**ReservationState** (returned by `GET /api/reservations`):
```typescript
interface ReservationState {
  slots: Record<string, {
    status: 'available' | 'reserved' | 'submitted';
    expiresAt?: number;         // only for reserved
    skillsetId?: string;        // only for submitted
  }>;
  totalGhostSlots: number;
  cohort: number;
  userSlot: string | null;      // batch ID or null
}
```

**GhostSlot** (update existing type in `site/src/types/index.ts`):
```typescript
export interface GhostSlot {
  slotId: string;               // batch ID, e.g. "5.11.001"
  status: 'available' | 'reserved' | 'submitted';
  expiresAt?: number;           // only for reserved
  skillsetId?: string;          // only for submitted
}
```

**Skillset** (update existing type in `site/src/types/index.ts`):
```typescript
export interface Skillset {
  // ... existing fields ...
  batch_id?: string;            // from skillset.yaml, optional for backward compatibility
}
```

Add `batch_id?: string` to the `Skillset` interface for consistency with the YAML schema and `SearchIndexEntry`. Optional because pre-batch skillsets (e.g., Valence) lack this field.

### 5.4 New API Endpoints

**GET /api/reservations/verify** (public, rate-limited):
```
Query params:
  batchId: string   — e.g. "5.11.001"
  login: string     — GitHub login to verify (optional if userId provided)
  userId: string    — GitHub numeric user ID (optional if login provided)

Response 200:
  { "valid": true, "batchId": "5.11.001" }

Response 200 (no match):
  { "valid": false, "reason": "login_mismatch" | "not_reserved" | "already_submitted" | "invalid_batch_id" }

Response 429:
  { "error": "rate_limit", "message": "Too many requests" }
```

Rate limited: 30 requests/hour per IP via KV (hour-bucketed, consistent with existing reservation rate limiting pattern). Accepts either `login` or `userId` — matches if either field matches the stored reservation. This handles GitHub username renames: the CI step can pass both `login=${{ github.event.pull_request.user.login }}` and `userId=${{ github.event.pull_request.user.id }}`. Returns `already_submitted` for batch IDs that have already been submitted — a consumed batch ID cannot pass CI verification for a new PR.

**GET /api/reservations/lookup** (public, rate-limited):
```
Query params:
  githubId: string  — GitHub numeric user ID

Response 200:
  { "batchId": "5.11.001" }

Response 200 (no reservation):
  { "batchId": null }

Response 429:
  { "error": "rate_limit", "message": "Too many requests" }
```

Used by CLI `init` to find the user's active reservation. Rate limited: 30 requests/hour per IP (hour-bucketed, consistent with existing pattern). Returns only the batch ID for slots in `reserved` state — submitted slots return `null` since the reservation is fulfilled and cannot be used for a new `init` scaffold.

**POST /api/reservations/submit** (authenticated, maintainer-only):
```
Request body:
  { "batchId": "5.11.001", "skillsetId": "@username/SkillsetName" }

Response 200:
  { "batchId": "5.11.001", "status": "submitted", "skillsetId": "..." }

Response 404:
  { "error": "not_reserved", "message": "Slot is not in reserved state" }
```

### 5.5 Durable Object Endpoints

Add to `ReservationCoordinator.fetch()`:

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/verify` | Check batch ID + login/userId match (for CI) |
| `POST` | `/submit` | Transition slot to submitted (for maintainer) |
| `GET` | `/lookup` | Find user's batch ID by GitHub user ID (for CLI) |

Existing endpoints change signature (batch ID keys instead of ghost-N):

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/status` | Generate batch ID keys from config; return cohort |
| `POST` | `/reserve` | Accept batch ID format; validate against current cohort; store `githubLogin` |
| `DELETE` | `/release` | Guard against submitted state — reject with 409 if slot is submitted; otherwise unchanged (uses `user:{userId}` lookup) |
| `POST` | `/config` | Accept `cohort`; new cohort wipes non-submitted slots; reject `totalGhostSlots` change within same cohort |

---

## 6. Implementation Details

### 6.1 File Changes

```
site/src/lib/reservation-do.ts          ← Storage key migration, new endpoints, cohort logic, handleRelease submitted guard
site/src/pages/api/reservations.ts       ← Batch ID validation regex, pass githubLogin to DO
site/src/pages/api/reservations/config.ts ← Accept cohort param, validate immutability
site/src/pages/api/reservations/verify.ts ← NEW: CI verification endpoint (rate-limited)
site/src/pages/api/reservations/lookup.ts ← NEW: CLI reservation lookup (rate-limited)
site/src/pages/api/reservations/submit.ts ← NEW: Maintainer submit endpoint
site/src/lib/maintainer.ts               ← NEW: Extract isMaintainer from config.ts
site/src/components/GhostCard.tsx         ← Display batch ID, handle submitted state
site/src/components/SkillsetGrid.tsx      ← Pass batch ID to cards, render submitted state
site/src/types/index.ts                   ← Update GhostSlot, ReservationState, Skillset, SearchIndexEntry types
schema/skillset.schema.json              ← Add batch_id field
cli/src/commands/init.ts                 ← gh auth check, reservation lookup, batch_id scaffolding
.github/workflows/validate-submission.yml ← Add reservation verification step
```

### 6.2 Durable Object: Key Migration

Since this is pre-launch with no production reservations, the migration is a clean cut:

1. Change `SLOT_ID_REGEX` from `/^ghost-\d+$/` to `/^\d{1,3}\.\d{1,3}\.\d{3}$/`
2. Change slot key generation in `handleGetStatus` from `ghost-${i}` to `formatBatchId(i, config.totalGhostSlots, config.cohort)`
3. Update `DEFAULT_CONFIG` to include `cohort: 1`
4. Add `handleVerify`, `handleSubmit`, and `handleLookup` methods
5. Update `ReserveRequest` interface to include `githubLogin: string`
6. Update `ConfigUpdateRequest` interface to include `cohort?: number`

**Updated `handleGetStatus`** — return `cohort`, handle submitted slots from all cohorts:
```typescript
private async handleGetStatus(request: Request): Promise<Response> {
  const userId = request.headers.get('X-User-Id');
  const config = await this.getConfig();

  const slotEntries = await this.ctx.storage.list<SlotData>({ prefix: 'slot:' });
  const slots: Record<string, {
    status: 'available' | 'reserved' | 'submitted';
    expiresAt?: number;
    skillsetId?: string;
  }> = {};

  // Initialize current cohort slots as available
  for (let i = 1; i <= config.totalGhostSlots; i++) {
    const slotId = formatBatchId(i, config.totalGhostSlots, config.cohort);
    slots[slotId] = { status: 'available' };
  }

  // Status discrimination — expired slots are treated as available in the
  // response but their storage entries are NOT deleted. This preserves slot
  // data for the maintainer /submit flow: if a reservation expires after CI
  // passes but before the maintainer calls /submit, the slot data must still
  // exist. Expired slots are overwritten atomically when a new user reserves
  // the same position via handleReserve.
  const now = Math.floor(Date.now() / 1000);

  for (const [key, data] of slotEntries) {
    const slotId = key.replace('slot:', '');

    if (data.status === 'submitted') {
      // Submitted slots are permanent — include from ALL cohorts, not just current.
      // Current-cohort submitted slots overwrite the 'available' placeholder.
      // Old-cohort submitted slots are added to the slots map (they won't collide
      // with current-cohort keys since the cohort segment differs).
      const submitted = data as SubmittedSlotData;
      slots[slotId] = { status: 'submitted', skillsetId: submitted.skillsetId };
    } else if (data.status === 'reserved') {
      const reserved = data as ReservedSlotData;
      if (reserved.expiresAt > now && slots[slotId]) {
        // Active reservation — show as reserved
        slots[slotId] = { status: 'reserved', expiresAt: reserved.expiresAt };
      }
      // Expired reservations: slot stays 'available' in the response (the
      // initialized placeholder is not overwritten). Storage entry is preserved
      // so /submit can still transition it.
    }
  }

  let userSlot: string | null = null;
  if (userId) {
    const userSlotId = await this.ctx.storage.get<string>(`user:${userId}`);
    if (userSlotId && slots[userSlotId]?.status === 'reserved') {
      userSlot = userSlotId;
    }
  }

  return new Response(
    JSON.stringify({ slots, totalGhostSlots: config.totalGhostSlots, cohort: config.cohort, userSlot }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
```

**Note**: Submitted slots from previous cohorts (e.g., `5.11.001` after cohort bumps to 002) are included in the `slots` map alongside current-cohort slots. The grid uses `skillsetId` cross-referencing to render real skillset cards for these — they don't appear as ghost cards. This ensures no submitted skillset becomes invisible after a cohort transition.

**Note on lazy expiry**: Unlike the previous `ghost-N` implementation, `handleGetStatus` does NOT delete expired slot entries from storage. Expired slots are simply treated as `available` in the API response. This is intentional — it preserves slot data so the maintainer can call `/submit` even after a reservation expires (the submit flow is authoritative and does not check expiry). Expired entries are cleaned up in two ways: (1) `handleReserve` overwrites them atomically when a new user claims the same position, and (2) cohort transitions delete all non-submitted slots. The storage cost is bounded by `batch_size` (max 100) per cohort, so stale entries are negligible.

**Semantic validation in `handleReserve`** — replace ghost-N range check:
```typescript
// Replace: const slotNumber = parseInt(slotId.replace('ghost-', ''), 10);
// With: full batch ID validation against current config
const error = validateBatchId(slotId, config);
if (error) {
  return new Response(
    JSON.stringify({ error: 'slot_not_found', message: error }),
    { status: 404, headers: { 'Content-Type': 'application/json' } }
  );
}
```

**Note on expired slot overwrite**: The existing `handleReserve` already checks `slotData.expiresAt > now` before returning "slot taken." If the slot is expired, the reservation proceeds and the `storage.put` call overwrites the stale entry atomically. This is the cleanup path for expired slots — they are overwritten on re-claim rather than eagerly deleted by `handleGetStatus`. This ensures slot data survives for the maintainer `/submit` flow.

Also update `handleReserve` to store `githubLogin` and the `status` discriminant:
```typescript
const newSlotData: ReservedSlotData = {
  status: 'reserved',
  userId,
  githubLogin,    // from updated ReserveRequest
  expiresAt: now + config.ttlDays * 86400,
};
```

**Submitted-state guard in `handleRelease`** — prevent deletion of terminal slots:
```typescript
private async handleRelease(request: Request): Promise<Response> {
  const body = await request.json() as ReleaseRequest;
  const { userId } = body;

  const slotId = await this.ctx.storage.get<string>(`user:${userId}`);
  if (!slotId) {
    return new Response(
      JSON.stringify({ error: 'no_reservation', message: 'User has no reservation' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Guard: submitted slots are terminal — cannot be released
  const slotData = await this.ctx.storage.get<SlotData>(`slot:${slotId}`);
  if (slotData?.status === 'submitted') {
    return new Response(
      JSON.stringify({ error: 'already_submitted', message: 'Cannot release a submitted slot' }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Delete both slot and user keys — atomic write coalescing
  this.ctx.storage.delete(`slot:${slotId}`);
  this.ctx.storage.delete(`user:${userId}`);

  return new Response(
    JSON.stringify({ released: slotId }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
```

**Batch-size immutability enforcement** (in `handleConfigUpdate`):
```typescript
// Reject batch_size change within same cohort
if (body.totalGhostSlots !== undefined &&
    body.totalGhostSlots !== currentConfig.totalGhostSlots &&
    (body.cohort === undefined || body.cohort === currentConfig.cohort)) {
  return new Response(
    JSON.stringify({
      error: 'invalid_config',
      message: 'Cannot change totalGhostSlots within a cohort. Increment cohort to create a new batch.',
    }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}

// Validate cohort if provided
if (body.cohort !== undefined) {
  if (typeof body.cohort !== 'number' || body.cohort < 1 || body.cohort > 999) {
    return new Response(
      JSON.stringify({ error: 'invalid_config', message: 'cohort must be between 1 and 999' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

**Config update with cohort change** — preserve submitted slot data, clean up everything else:
```typescript
// If cohort changes, wipe reserved slots but preserve submitted slot data.
// Delete user:{userId} keys for ALL slots (including submitted) — submitted
// users' reservations are fulfilled and they must not be blocked from
// reserving in the new cohort.
if (body.cohort !== undefined && body.cohort !== currentConfig.cohort) {
  const allSlots = await this.ctx.storage.list<SlotData>({ prefix: 'slot:' });
  const keysToDelete: string[] = [];
  for (const [key, data] of allSlots) {
    // Always delete user index key — frees user for new cohort reservations
    keysToDelete.push(`user:${data.userId}`);
    // Preserve submitted slot data (terminal state survives cohort changes)
    if (data.status === 'submitted') continue;
    keysToDelete.push(key);
  }
  // Chunk to 128 keys per batch (DO storage.delete limit)
  for (let i = 0; i < keysToDelete.length; i += 128) {
    await this.ctx.storage.delete(keysToDelete.slice(i, i + 128));
  }
}
```

**Submitted slot handling** (new `handleSubmit`):
```typescript
const SKILLSET_ID_REGEX = /^@[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/;

private async handleSubmit(request: Request): Promise<Response> {
  let body: { batchId?: string; skillsetId?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid_body', message: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { batchId, skillsetId } = body;

  // Validate batchId format only — NOT against current config.
  // Maintainer submit is authoritative and must work across cohorts: if the
  // maintainer bumps the cohort between merging a PR and calling /submit,
  // the batch ID from the old cohort must still be accepted. The slot
  // existence check (storage.get below) is the authoritative gate.
  const BATCH_ID_REGEX = /^\d{1,3}\.\d{1,3}\.\d{3}$/;
  if (!batchId || !BATCH_ID_REGEX.test(batchId)) {
    return new Response(
      JSON.stringify({ error: 'invalid_batch_id', message: 'batchId is required and must match format N.N.NNN' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validate skillsetId format — prevent XSS/storage pollution
  if (!skillsetId || !SKILLSET_ID_REGEX.test(skillsetId) || skillsetId.length > 200) {
    return new Response(
      JSON.stringify({ error: 'invalid_skillset_id', message: 'skillsetId must match @namespace/Name format (max 200 chars)' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const slotData = await this.ctx.storage.get<SlotData>(`slot:${batchId}`);
  if (!slotData) {
    return new Response(
      JSON.stringify({ error: 'not_reserved', message: 'Slot has no reservation' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Check discriminant — reject if already submitted
  if (slotData.status === 'submitted') {
    return new Response(
      JSON.stringify({ error: 'already_submitted', message: 'Slot is already submitted' }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Note: expiry is NOT checked. Maintainer submit is authoritative — if the PR
  // was merged, the reservation was valid at merge time. Checking expiry here
  // creates a race condition where a maintainer merges a PR just after the
  // reservation expires but before submitting, leaving the slot in limbo.

  // Transition to submitted — replace slot data
  const submitted: SubmittedSlotData = {
    status: 'submitted',
    userId: slotData.userId,
    githubLogin: slotData.githubLogin,
    skillsetId,
    submittedAt: Math.floor(Date.now() / 1000),
  };
  await this.ctx.storage.put(`slot:${batchId}`, submitted);

  // Delete user index key — reservation is fulfilled, user is free to
  // participate in future cohorts without being blocked by handleReserve's
  // "user already has reservation" check.
  await this.ctx.storage.delete(`user:${slotData.userId}`);

  return new Response(
    JSON.stringify({ batchId, status: 'submitted', skillsetId }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
```

**Verification handler** (new `handleVerify`):
```typescript
private async handleVerify(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const batchId = url.searchParams.get('batchId');
  const login = url.searchParams.get('login');
  const userId = url.searchParams.get('userId');

  const BATCH_ID_REGEX = /^\d{1,3}\.\d{1,3}\.\d{3}$/;
  if (!batchId || !BATCH_ID_REGEX.test(batchId)) {
    return new Response(
      JSON.stringify({ valid: false, reason: 'invalid_batch_id' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  const slotData = await this.ctx.storage.get<SlotData>(`slot:${batchId}`);
  if (!slotData) {
    return new Response(
      JSON.stringify({ valid: false, reason: 'not_reserved' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Already-submitted slots cannot be used for a new PR — terminal state
  if (slotData.status === 'submitted') {
    return new Response(
      JSON.stringify({ valid: false, reason: 'already_submitted' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Expired reserved slots fail verification
  if (slotData.expiresAt <= Math.floor(Date.now() / 1000)) {
    return new Response(
      JSON.stringify({ valid: false, reason: 'not_reserved' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Match by login OR userId (handles GitHub username renames)
  const loginMatch = login && slotData.githubLogin === login;
  const userIdMatch = userId && slotData.userId === userId;

  if (!loginMatch && !userIdMatch) {
    return new Response(
      JSON.stringify({ valid: false, reason: 'login_mismatch' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ valid: true, batchId }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
```

**Lookup handler** (new `handleLookup`):
```typescript
private async handleLookup(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const githubId = url.searchParams.get('githubId');

  if (!githubId) {
    return new Response(
      JSON.stringify({ batchId: null }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  const slotId = await this.ctx.storage.get<string>(`user:${githubId}`);
  if (!slotId) {
    return new Response(
      JSON.stringify({ batchId: null }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Only return batch ID for actively reserved slots.
  // Submitted slots return null — the reservation is fulfilled and the
  // CLI init flow should not scaffold for an already-submitted slot.
  // Expired slots also return null.
  const slotData = await this.ctx.storage.get<SlotData>(`slot:${slotId}`);
  if (!slotData || slotData.status === 'submitted' ||
      (slotData.status === 'reserved' && slotData.expiresAt <= Math.floor(Date.now() / 1000))) {
    return new Response(
      JSON.stringify({ batchId: null }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ batchId: slotId }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
```

### 6.3 API Route: Reservations

**`POST /api/reservations`** — pass `githubLogin` to DO:
```typescript
const doRequest = new Request('https://do/reserve', {
  method: 'POST',
  body: JSON.stringify({
    slotId: batchId,
    userId: session.userId,
    githubLogin: session.login,  // from session (already available via OAuth)
  }),
});
```

**Validation regex change** — fast syntactic check at API boundary, semantic validation happens in DO:
```typescript
const BATCH_ID_REGEX = /^\d{1,3}\.\d{1,3}\.\d{3}$/;
```

### 6.4 New API Route: Verify

```
site/src/pages/api/reservations/verify.ts
```

Public endpoint, no auth. Rate-limited: 30 requests/hour per IP (KV hour-bucketed, key format `ratelimit:verify:{ip}:{hour}`, consistent with existing reservation rate limiting pattern). Validate `batchId` against `BATCH_ID_REGEX` before forwarding to DO. Forwards `batchId`, `login`, and `userId` query params to DO `/verify`. Returns `{ valid: boolean, reason?: string }`.

### 6.4a New API Route: Lookup

```
site/src/pages/api/reservations/lookup.ts
```

Public endpoint, no auth. Rate-limited: 30 requests/hour per IP (same hour-bucketed pattern as verify). Validate `githubId` is present before forwarding to DO. Forwards `githubId` query param to DO `/lookup`. Returns `{ batchId: string | null }`.

### 6.5 New API Route: Submit

```
site/src/pages/api/reservations/submit.ts
```

Authenticated, maintainer-only. Extract `isMaintainer` from `config.ts` to `site/src/lib/maintainer.ts`, export as shared util. Both `config.ts` and `submit.ts` import from there. Forwards to DO `/submit`.

### 6.6 GhostCard Component

**Replace `index/total` with batch ID** (line 97 of current GhostCard.tsx):
```tsx
// Before
<span className="font-mono text-xs text-text-tertiary">{index}/{total}</span>

// After
<span className="font-mono text-xs text-text-tertiary">{batchId}</span>
```

**Props change**: Remove `index` and `total`, add `batchId: string` and `skillsetId?: string`.

**New submitted state rendering**: When `status === 'submitted'` and `skillsetId` is provided, the ghost card becomes a link to the real skillset detail page (`/skillset/{namespace}/{name}` derived from `skillsetId`). Placeholder bars are replaced with a "Submitted" label and the `skillsetId` text. Batch ID still displays bottom-right. If `skillsetId` is somehow missing (defensive), render a "Submitted — pending rebuild" placeholder without a link.

### 6.7 SkillsetGrid Component

**Rendering rules for submitted slots**:

1. If a submitted slot's `skillsetId` matches a skillset in the `skillsets` array → render only the real skillset card with the batch ID badge bottom-right. Do **not** render a ghost card for this slot.
2. If a submitted slot has no matching real skillset (data not yet rebuilt after merge) → render the ghost card in submitted state as a link to the detail page.
3. The grid builds a `Map<skillsetId, batchId>` from submitted slots at render time, then passes `batchId` to matching real cards.

**Batch ID badge on real skillset cards**:
```tsx
<span className="font-mono text-xs text-text-tertiary">{batchId}</span>
```

**Add `batch_id` to `SearchIndexEntry`** (`site/src/types/index.ts`):
```typescript
export interface SearchIndexEntry {
  // ... existing fields ...
  batch_id?: string;  // from skillset.yaml, populated at build time
}
```

This allows real skillset cards to display their batch ID from static data without a runtime DO dependency. The build-time index reads `batch_id` from `skillset.yaml` and includes it in `search-index.json`. The grid prefers the static `batch_id` from the index; the reservation cross-reference is a fallback for the brief window between merge and rebuild.

### 6.8 CLI Init Command

**New flow** (`cli/src/commands/init.ts`):

```typescript
export async function init(options: InitOptions): Promise<void> {
  // 1. Verify gh CLI is available
  try {
    execSync('gh auth status', { stdio: 'pipe' });
  } catch {
    console.error(chalk.red('Error: gh CLI not authenticated.'));
    console.error('Install: https://cli.github.com');
    console.error('Then run: gh auth login');
    process.exit(1);
  }

  // 2. Get GitHub user info via gh CLI (verified identity)
  const userJson = execSync('gh api user', { encoding: 'utf-8' });
  const { login, id } = JSON.parse(userJson);

  // 3. Look up reservation via public /lookup endpoint
  const res = await fetch(
    `https://skillsets.cc/api/reservations/lookup?githubId=${encodeURIComponent(String(id))}`
  );
  const data = await res.json();

  if (!data.batchId) {
    console.error(chalk.red('No active reservation found.'));
    console.error('Visit https://skillsets.cc to claim a slot first.');
    process.exit(1);
  }

  const batchId = data.batchId;
  console.log(chalk.green(`\nReservation found: ${batchId}`));

  // 4. Continue with existing prompts (name, description, etc.)
  //    but auto-fill author handle from gh login
  //    and inject batch_id into skillset.yaml template

  // ... existing prompt flow with batch_id pre-populated ...
}
```

The CLI uses the public `/api/reservations/lookup` endpoint instead of the cookie-authenticated `/api/reservations`. The `gh` CLI provides verified GitHub identity (user ID), and the lookup endpoint returns only the batch ID (non-sensitive).

**Template change** — add `batch_id` to `SKILLSET_YAML_TEMPLATE`:
```yaml
schema_version: "1.0"
batch_id: "{{BATCH_ID}}"

name: "{{NAME}}"
# ...
```

### 6.9 CI Validation

**New step in `validate-submission.yml`** (after "Verify author matches GitHub handle"):

```yaml
- name: Verify batch ID reservation
  if: steps.changed.outputs.dirs != ''
  run: |
    EXIT_CODE=0
    for dir in ${{ steps.changed.outputs.dirs }}; do
      echo "=========================================="
      echo "Verifying reservation in $dir"
      echo "=========================================="

      if [ ! -f "$dir/skillset.yaml" ]; then
        continue
      fi

      BATCH_ID=$(yq eval '.batch_id' "$dir/skillset.yaml")
      PR_AUTHOR="${{ github.event.pull_request.user.login }}"
      PR_AUTHOR_ID="${{ github.event.pull_request.user.id }}"

      if [ "$BATCH_ID" = "null" ] || [ -z "$BATCH_ID" ]; then
        echo "::error::Missing batch_id in $dir/skillset.yaml"
        EXIT_CODE=1
        continue
      fi

      echo "Batch ID: $BATCH_ID"
      echo "PR Author: $PR_AUTHOR (ID: $PR_AUTHOR_ID)"

      # Pass both login and userId — handles GitHub username renames
      # --max-time 10 --retry 2: prevent CI hang if skillsets.cc is down
      RESPONSE=$(curl -sf --max-time 10 --retry 2 "https://skillsets.cc/api/reservations/verify?batchId=$BATCH_ID&login=$PR_AUTHOR&userId=$PR_AUTHOR_ID") || {
        echo "::warning::Reservation verification unavailable (skillsets.cc unreachable). Skipping."
        continue
      }
      VALID=$(echo "$RESPONSE" | jq -r '.valid')

      if [ "$VALID" != "true" ]; then
        REASON=$(echo "$RESPONSE" | jq -r '.reason')
        echo "::error::Reservation verification failed: $REASON"
        EXIT_CODE=1
      else
        echo "Reservation verified for $BATCH_ID"
      fi
    done

    exit $EXIT_CODE
```

### 6.10 Session Data

Confirmed: `getSessionFromRequest` already returns `{ userId, login, avatar }` from the JWT claims. The `createSessionToken` function stores `login: user.login` in the JWT payload (`auth.ts:169`), and `verifySessionToken` returns it (`auth.ts:241-244`). No changes needed for session data.

---

## 7. Edge Cases

| Scenario | Behavior |
|----------|----------|
| User claims slot, reservation expires, another user claims same position | Same batch ID (`5.11.001`), new holder. Position reuse works correctly. |
| Maintainer changes cohort | Reserved and available slots are wiped. Submitted slot data is preserved (terminal state survives cohort changes). All `user:{userId}` keys are deleted (including for submitted slots) so users can reserve in the new cohort. New batch IDs generated with new cohort number. |
| Maintainer changes batch_size within same cohort | Rejected with 400: "Cannot change totalGhostSlots within a cohort. Increment cohort to create a new batch." |
| PR submitted with batch ID from old cohort | CI verification fails — slot no longer exists in DO storage (reserved slots wiped on cohort change). |
| Maintainer submits slot from old cohort (cohort bumped between merge and submit) | Accepted. `handleSubmit` validates batch ID format only (regex), not against current config. The slot existence check is the authoritative gate — if the slot key exists in storage and is in `reserved` state, the submit proceeds regardless of cohort mismatch with current config. |
| PR submitted with already-submitted batch ID | CI verification fails with `already_submitted` — terminal state cannot be reused. |
| User tries to init without reservation | Hard fail: "No active reservation found. Visit skillsets.cc to claim a slot first." |
| User tries to init after their slot was submitted | Lookup returns `null` for submitted slots — user sees "No active reservation found." This is correct: the reservation is fulfilled. |
| User's `gh` login doesn't match their website session | The batch ID is tied to `userId` (numeric), which is stable. `githubLogin` stored at reservation time should match `gh api user` login. Username renames handled: CI verify accepts both `login` and `userId` params, matching if either is correct. |
| Submitted slot — maintainer tries to submit again | Rejected with 409: "Slot is already submitted." The `status` discriminant field prevents silent overwrites. |
| Submitted slot — user tries to release | Rejected with 409: "Cannot release a submitted slot." Terminal state is protected. |
| Maintainer submits after reservation expiry | Accepted. The `/submit` endpoint does not check expiry — maintainer action is authoritative. If the PR was merged, the reservation was valid at merge time. Slot data is preserved in storage because `handleGetStatus` does not delete expired entries (it only excludes them from the response). |
| Submitted slots from old cohorts in grid | Included in `/status` response alongside current-cohort slots. The grid cross-references `skillsetId` to render real skillset cards; old-cohort submitted slots appear as real cards, not ghost cards. |
| Batch ID format in display | Always `{pos}.{size}.{cohort}` with zero-padded cohort. No special formatting for display vs storage. |
| `storage.delete` exceeds 128-key limit | Cohort transitions chunk deletes into batches of 128 keys to stay within DO's batch delete limit. (`handleGetStatus` no longer deletes expired entries — they are overwritten by `handleReserve` or cleaned up on cohort transition.) |
| skillsets.cc down during CI verification | `curl` has `--max-time 10 --retry 2`. On failure, emits a `::warning` annotation and skips verification for that directory (does not hard-fail the workflow). |
