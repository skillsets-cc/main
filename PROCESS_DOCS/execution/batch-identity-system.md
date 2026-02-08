# Execution Plan: Batch Identity System

## Overview
- **Objective**: Replace the `ghost-N` key system with structured batch IDs (`{position}.{batch_size}.{cohort}`) that thread through the entire lifecycle: DO storage, API, grid rendering, CLI scaffolding, CI validation, and skillset manifest schema.
- **Scope**:
  - Includes: DO rewrite (key migration, 3 new handlers, cohort logic), type updates, 3 new API routes, maintainer util extraction, GhostCard/SkillsetGrid batch ID + submitted state, CLI init with `gh` auth + reservation lookup, JSON Schema `batch_id` field, CI verification step
  - Excludes: Search index build pipeline changes (batch_id populated from skillset.yaml at build time — the existing `generate-index` script reads all YAML fields, so `batch_id` flows through automatically once the schema accepts it). No changes to auth, stars, downloads, or deployment.
- **Dependencies**: No new packages. Uses existing Cloudflare DO, KV, Astro SSR, Commander.js, `gh` CLI, `yq`, GitHub Actions.
- **Estimated Complexity**: High — touches 13 files across 4 modules (DO, API routes, frontend components, CLI/CI), with tight coupling between DO storage format changes and every consumer.

## Technical Clarifications

### Test Framework Configuration
```
Site:      Vitest with jsdom environment (site/vitest.config.ts)
CLI:       Vitest (cli/vitest.config.ts — separate config)
Structure: Tests in __tests__/ directories adjacent to source
Mocks:     createMockStorage(), createMockKV(), createMockEnv() in test-utils.ts
```

### File Locations
```
Style Guides:    .claude/resources/frontend_styleguide.md, workers_styleguide.md, cli_styleguide.md
Types:           site/src/types/index.ts
Test utilities:  site/src/lib/__tests__/test-utils.ts
DO test mocks:   site/src/lib/__tests__/reservation-do.test.ts (inline createMockStorage)
API test helper: site/src/pages/api/__tests__/reservations.test.ts (createAPIContext, createMockStub)
```

### Key Existing Patterns
- **Rate limiting**: Hour-bucketed KV counters, key format `ratelimit:{action}:{identifier}:{hour}`, 2-hour TTL
- **API routes**: Astro `APIRoute` type, `jsonResponse`/`errorResponse` from `@/lib/responses`
- **Session**: `getSessionFromRequest(env, request)` returns `{ userId: string; login: string; avatar: string } | null`
- **DO stub**: `getReservationStub(env)` returns singleton stub, called via `stub.fetch(new Request(...))`
- **Maintainer check**: Currently inline in `config.ts` — `MAINTAINER_USER_IDS` env var, comma-separated

### Architecture Decisions
| Decision | Rationale | Alternative | Why Rejected |
|----------|-----------|-------------|--------------|
| Batch ID format `{pos}.{size}.{cohort}` | Single format everywhere — encodes position, batch context, cohort | UUID or integer | No semantic meaning |
| `batch_id` in skillset.yaml (optional) | CI enforces presence for new submissions; schema allows absence for Valence | Required field | Breaks existing skillsets |
| Lazy expiry (no delete on read) | Preserves slot data for maintainer `/submit` after reservation expires | Eager delete | Race condition: maintainer can't submit after expiry |
| Maintainer submit ignores expiry | Authoritative action — PR was valid at merge time | Check expiry | Leaves slot in limbo if expired between merge and submit |
| `isMaintainer` extracted to shared util | Used by both `config.ts` and `submit.ts` | Inline in both | DRY violation |

### Data Flow
```
Maintainer POST /config { totalGhostSlots: 11, cohort: 1 }
  → DO creates slot keys 1.11.001 through 11.11.001

User clicks "Claim" on slot 5.11.001
  → POST /api/reservations { slotId: "5.11.001" }
  → DO stores slot:5.11.001 + user:{userId} with githubLogin

User runs `npx skillsets init`
  → gh api user → { login, id }
  → GET /api/reservations/lookup?githubId={id} → { batchId: "5.11.001" }
  → Scaffold skillset.yaml with batch_id: "5.11.001"

User submits PR
  → CI: yq eval '.batch_id' skillset.yaml → "5.11.001"
  → GET /api/reservations/verify?batchId=5.11.001&login={author}&userId={authorId}
  → { valid: true } → pass

Maintainer merges + POST /api/reservations/submit { batchId, skillsetId }
  → Slot transitions to submitted state
  → Grid shows real skillset card with batch ID badge
```

---

## Build Agent 1: Durable Object Core + Types + Shared Utils

### Overview
Rewrite the ReservationCoordinator DO to use batch ID keys, add the `submitted` state, implement 3 new handlers (`handleVerify`, `handleSubmit`, `handleLookup`), update existing handlers, and update all shared types. Extract `isMaintainer` to a shared util.

**Files owned:**
- `site/src/lib/reservation-do.ts`
- `site/src/types/index.ts`
- `site/src/lib/maintainer.ts` (NEW)
- `site/src/lib/__tests__/reservation-do.test.ts`
- `site/src/types/__tests__/reservation-types.test.ts`

**No dependencies on other agents.** All other agents depend on this one.

---

#### Task 1: Update shared types (`site/src/types/index.ts`)

- **Description**: Add `submitted` status to `GhostSlot` and `ReservationState`, add `cohort` to `ReservationState`, add `batch_id` to `Skillset`/`SearchIndexEntry`, add new `Skillset` interface.
- **Acceptance Criteria**:
  - [ ] `GhostSlot.status` includes `'submitted'`
  - [ ] `GhostSlot` has optional `skillsetId?: string`
  - [ ] `ReservationState.slots` value type includes `'submitted'` status and optional `skillsetId`
  - [ ] `ReservationState` has `cohort: number`
  - [ ] `SearchIndexEntry` has `batch_id?: string`
  - [ ] New `Skillset` interface exported with `batch_id?: string` and all fields from `SearchIndexEntry`
  - [ ] Type tests updated and passing
- **Files**:
  ```
  site/src/types/index.ts                          ← EDIT
  site/src/types/__tests__/reservation-types.test.ts ← EDIT
  ```
- **Dependencies**: None
- **Code Example** — updated types:
  ```typescript
  export interface GhostSlot {
    slotId: string;               // batch ID, e.g. "5.11.001"
    status: 'available' | 'reserved' | 'submitted';
    expiresAt?: number;           // only for reserved
    skillsetId?: string;          // only for submitted
  }

  export interface ReservationState {
    slots: Record<string, {
      status: 'available' | 'reserved' | 'submitted';
      expiresAt?: number;
      skillsetId?: string;
    }>;
    totalGhostSlots: number;
    cohort: number;
    userSlot: string | null;
  }
  ```
  Add `batch_id?: string` to `SearchIndexEntry` after `mcp_servers` field. Add a `Skillset` interface that is identical to `SearchIndexEntry` with `batch_id?: string` (or simply add the field to `SearchIndexEntry` and export a `Skillset` type alias).
- **Test Cases** (file: `site/src/types/__tests__/reservation-types.test.ts`):
  - `test_ghost_slot_submitted_status`: Verify `GhostSlot` accepts `status: 'submitted'` with `skillsetId`
  - `test_reservation_state_cohort`: Verify `ReservationState` requires `cohort` field
  - `test_search_index_entry_batch_id`: Verify `SearchIndexEntry` accepts optional `batch_id`

---

#### Task 2: Create maintainer util (`site/src/lib/maintainer.ts`)

- **Description**: Extract `isMaintainer` function from `site/src/pages/api/reservations/config.ts` into a shared utility. Both `config.ts` and the new `submit.ts` route will import from here.
- **Acceptance Criteria**:
  - [ ] `isMaintainer(env: Env, userId: string): boolean` exported from `site/src/lib/maintainer.ts`
  - [ ] `site/src/pages/api/reservations/config.ts` imports `isMaintainer` from `@/lib/maintainer` (remove inline function)
  - [ ] Logic identical: splits `env.MAINTAINER_USER_IDS` by comma, trims, checks `includes(userId)`
- **Files**:
  ```
  site/src/lib/maintainer.ts                         ← NEW
  site/src/pages/api/reservations/config.ts           ← EDIT (import from new location)
  ```
- **Dependencies**: None
- **Code Example**:
  ```typescript
  // site/src/lib/maintainer.ts
  import type { Env } from './auth';

  export function isMaintainer(env: Env, userId: string): boolean {
    const ids = (env.MAINTAINER_USER_IDS ?? '').split(',').map(s => s.trim());
    return ids.includes(userId);
  }
  ```
  In `config.ts`, replace the inline `isMaintainer` function with:
  ```typescript
  import { isMaintainer } from '@/lib/maintainer';
  ```
  Delete the inline `function isMaintainer(...)` block (lines 14-17 of current config.ts).
- **Test Cases** (file: `site/src/lib/__tests__/maintainer.test.ts`):
  - `test_maintainer_match`: env with `MAINTAINER_USER_IDS: '123,456'`, userId `'123'` → true
  - `test_maintainer_no_match`: userId `'789'` → false
  - `test_maintainer_empty_env`: `MAINTAINER_USER_IDS: ''` → false for any userId
  - `test_maintainer_trimming`: `MAINTAINER_USER_IDS: ' 123 , 456 '`, userId `'123'` → true
  - Setup: use `createMockEnv({ MAINTAINER_USER_IDS: '...' })` from test-utils

---

#### Task 3: Rewrite DO — storage format + existing handlers (`site/src/lib/reservation-do.ts`)

- **Description**: Migrate from `ghost-N` keys to batch ID keys. Add `cohort` to config, add `status` discriminant to slot data, add `githubLogin` to reserve request, update `handleGetStatus`, `handleReserve`, `handleRelease`, `handleConfigUpdate`.
- **Acceptance Criteria**:
  - [ ] `DEFAULT_CONFIG` includes `cohort: 1`
  - [ ] `SLOT_ID_REGEX` changed to `/^\d{1,3}\.\d{1,3}\.\d{3}$/`
  - [ ] `Config` interface has `cohort: number`
  - [ ] `SlotData` is a discriminated union (`ReservedSlotData | SubmittedSlotData`) with `status` field
  - [ ] `ReserveRequest` has `githubLogin: string`
  - [ ] `ConfigUpdateRequest` has `cohort?: number`
  - [ ] `handleGetStatus` generates batch ID keys via `formatBatchId`, returns `cohort`, handles submitted slots from all cohorts, does NOT delete expired entries
  - [ ] `handleReserve` uses `validateBatchId` instead of ghost-N range check, stores `status: 'reserved'` and `githubLogin`
  - [ ] `handleRelease` guards against `status === 'submitted'` (409 response)
  - [ ] `handleConfigUpdate` rejects `totalGhostSlots` change within same cohort (400), validates cohort range 1-999, on cohort change: wipes reserved slots, preserves submitted slots, deletes all user keys, chunks deletes to 128
  - [ ] Helper functions `parseBatchId`, `formatBatchId`, `validateBatchId` implemented
- **Files**:
  ```
  site/src/lib/reservation-do.ts ← REWRITE
  ```
- **Dependencies**: Task 1 (types) — though the DO file has its own internal type definitions, the design doc types should be consistent.
- **Configuration**:
  ```typescript
  const DEFAULT_CONFIG: Config = {
    totalGhostSlots: 10,
    ttlDays: 7,
    cohort: 1,
  };
  ```
- **Code Examples**: The design doc (sections 6.2, 4.1) contains complete implementations for:
  - `parseBatchId`, `formatBatchId`, `validateBatchId` (section 4.1, lines 58-76)
  - `handleGetStatus` (section 6.2, lines 364-423)
  - `handleReserve` validation replacement (section 6.2, lines 431-441)
  - `handleReserve` new slot data shape (section 6.2, lines 447-453)
  - `handleRelease` submitted guard (section 6.2, lines 457-486)
  - `handleConfigUpdate` immutability enforcement (section 6.2, lines 491-535)

  **IMPORTANT**: Read these from the design doc at `PROCESS_DOCS/design/batch-identity-system.md` sections 4.1 and 6.2. Do NOT invent alternate implementations.
- **Test Cases** (file: `site/src/lib/__tests__/reservation-do.test.ts`):

  Update ALL existing tests to use batch ID format instead of `ghost-N`. Add new tests:

  **Status tests (update existing):**
  - `test_get_status_empty`: Expect 10 slots named `1.10.001` through `10.10.001` (not `ghost-1` through `ghost-10`). Expect `cohort: 1` in response.
  - `test_status_with_user_id`: Pre-populate `slot:5.10.001` with `{ status: 'reserved', userId: '123', githubLogin: 'testuser', expiresAt: now + 86400 }` and `user:123` → `5.10.001`. Expect `userSlot: '5.10.001'`.
  - `test_lazy_expiry_no_delete`: Set expired reservation on `slot:3.10.001`. After GET /status, slot shows as `available` BUT storage still contains `slot:3.10.001` entry (verify `_store.has('slot:3.10.001')` is true).

  **New status tests:**
  - `test_status_submitted_slot`: Pre-populate `slot:5.10.001` with `{ status: 'submitted', userId: '123', githubLogin: 'testuser', skillsetId: '@user/Skill', submittedAt: 1000 }`. Expect `slots['5.10.001'].status === 'submitted'` and `slots['5.10.001'].skillsetId === '@user/Skill'`.
  - `test_status_submitted_old_cohort`: Set config to `{ totalGhostSlots: 10, ttlDays: 7, cohort: 2 }`. Pre-populate `slot:5.10.001` with submitted data (cohort 001). Expect `5.10.001` appears in slots map as submitted alongside current cohort slots `1.10.002` through `10.10.002`.

  **Reserve tests (update existing):**
  - `test_reserve_slot`: Use `slotId: '1.10.001'` and include `githubLogin: 'testuser'`. Verify storage contains `status: 'reserved'` and `githubLogin`.
  - `test_reserve_duplicate_user`: Reserve `1.10.001` then try `2.10.001` as same user → 409.
  - `test_reserve_taken_slot`: Reserve `1.10.001` as user 123, then as user 456 → 409.
  - `test_reserve_invalid_slot`: Test `'invalid'` format → 404. Test `'1.10.002'` (wrong cohort) → 404. Test `'11.10.001'` (position > batchSize) → 404.
  - `test_reserve_expired_overwrite`: Pre-populate `slot:1.10.001` with expired reservation. Reserve same slot as new user → 201. Verify old data overwritten.

  **Release tests (update existing + new):**
  - `test_release_reservation`: Reserve `3.10.001`, release → 200, storage cleared.
  - `test_release_submitted_slot`: Pre-populate submitted slot + user key. Try release → 409 with error `'already_submitted'`.
  - `test_release_no_reservation`: Release non-existent user → 404.

  **Config tests (update existing + new):**
  - `test_update_config`: Set `ttlDays: 14` → 200.
  - `test_config_reject_batch_size_change_same_cohort`: Set `totalGhostSlots: 15` without changing cohort → 400 with `'Cannot change totalGhostSlots within a cohort'`.
  - `test_config_cohort_change_wipes_reserved`: Reserve a slot, then POST config with new cohort → 200. Verify reserved slot deleted, user key deleted.
  - `test_config_cohort_change_preserves_submitted`: Pre-populate submitted slot, then POST config with new cohort → 200. Verify submitted slot data still in storage. Verify user key for submitted slot IS deleted (user can reserve in new cohort).
  - `test_config_cohort_validation`: cohort 0 → 400, cohort 1000 → 400, cohort 'abc' → 400.
  - `test_update_config_bounds`: Keep existing (totalGhostSlots 101 → 400, ttlDays 0 → 400, ttlDays 31 → 400).

  **Setup**: Same `createMockStorage`/`createMockState`/`createMockEnv` pattern, but updated to store the new discriminated union slot data format.

---

#### Task 4: Add new DO handlers — verify, submit, lookup (`site/src/lib/reservation-do.ts`)

- **Description**: Add `handleVerify`, `handleSubmit`, `handleLookup` methods and route them in `fetch()`.
- **Acceptance Criteria**:
  - [ ] `fetch()` routes GET `/verify` → `handleVerify`, POST `/submit` → `handleSubmit`, GET `/lookup` → `handleLookup`
  - [ ] `handleVerify`: validates batch ID format, checks slot exists, rejects submitted/expired, matches by login OR userId
  - [ ] `handleSubmit`: validates batch ID format + skillsetId regex (`/^@[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/`, max 200 chars), checks slot exists, rejects already-submitted (409), does NOT check expiry, transitions to submitted state, deletes user index key
  - [ ] `handleLookup`: looks up `user:{githubId}`, returns batchId only for active reserved slots (not submitted, not expired)
  - [ ] `SKILLSET_ID_REGEX` defined as `/^@[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/`
- **Files**:
  ```
  site/src/lib/reservation-do.ts ← EDIT (same file as Task 3 — do both tasks sequentially)
  ```
- **Dependencies**: Task 3 (same file — execute sequentially)
- **Code Examples**: Design doc sections 6.2 contain complete implementations:
  - `handleVerify` (lines 621-674)
  - `handleSubmit` (lines 542-616)
  - `handleLookup` (lines 679-715)

  **IMPORTANT**: Read these from the design doc at `PROCESS_DOCS/design/batch-identity-system.md` section 6.2.
- **Test Cases** (file: `site/src/lib/__tests__/reservation-do.test.ts`):

  **Verify tests:**
  - `test_verify_valid_reservation_by_login`: Reserve slot `5.10.001` with `githubLogin: 'testuser'`. GET `/verify?batchId=5.10.001&login=testuser` → `{ valid: true, batchId: '5.10.001' }`.
  - `test_verify_valid_reservation_by_user_id`: Reserve slot with `userId: '123'`. GET `/verify?batchId=5.10.001&userId=123` → `{ valid: true }`.
  - `test_verify_login_mismatch`: Reserve with login 'alice'. Verify with login 'bob' and no userId → `{ valid: false, reason: 'login_mismatch' }`.
  - `test_verify_not_reserved`: Verify non-existent slot → `{ valid: false, reason: 'not_reserved' }`.
  - `test_verify_already_submitted`: Pre-populate submitted slot. Verify → `{ valid: false, reason: 'already_submitted' }`.
  - `test_verify_expired`: Pre-populate expired reserved slot. Verify → `{ valid: false, reason: 'not_reserved' }`.
  - `test_verify_invalid_batch_id`: GET `/verify?batchId=invalid` → `{ valid: false, reason: 'invalid_batch_id' }`.

  **Submit tests:**
  - `test_submit_valid`: Reserve slot `5.10.001`. POST `/submit` with `{ batchId: '5.10.001', skillsetId: '@user/Skill' }` → 200 with `{ batchId, status: 'submitted', skillsetId }`. Verify storage has submitted data. Verify `user:{userId}` key deleted.
  - `test_submit_not_reserved`: POST `/submit` for non-existent slot → 404 `not_reserved`.
  - `test_submit_already_submitted`: Pre-populate submitted slot. POST `/submit` → 409 `already_submitted`.
  - `test_submit_invalid_batch_id`: POST with `batchId: 'bad'` → 400.
  - `test_submit_invalid_skillset_id`: POST with `skillsetId: 'no-at-sign'` → 400. POST with `skillsetId` longer than 200 chars → 400.
  - `test_submit_after_expiry`: Pre-populate expired reserved slot. POST `/submit` → 200 (submit succeeds — maintainer is authoritative).
  - `test_submit_invalid_json`: POST with non-JSON body → 400 `invalid_body`.

  **Lookup tests:**
  - `test_lookup_active_reservation`: Reserve slot, store user key. GET `/lookup?githubId=123` → `{ batchId: '5.10.001' }`.
  - `test_lookup_no_reservation`: GET `/lookup?githubId=999` → `{ batchId: null }`.
  - `test_lookup_submitted_returns_null`: Pre-populate submitted slot + user key. GET `/lookup?githubId=123` → `{ batchId: null }`.
  - `test_lookup_expired_returns_null`: Pre-populate expired reserved slot + user key. GET `/lookup?githubId=123` → `{ batchId: null }`.
  - `test_lookup_missing_param`: GET `/lookup` (no githubId) → `{ batchId: null }`.

  **Setup**: Same mock infrastructure as Task 3 tests.

---

#### Task 5: Update existing DO tests + run full suite

- **Description**: Ensure all pre-existing tests are migrated from `ghost-N` format to batch ID format and all new tests pass. This is a verification/cleanup pass.
- **Acceptance Criteria**:
  - [ ] Zero references to `ghost-` in `reservation-do.test.ts`
  - [ ] All tests pass: `cd site && npx vitest run src/lib/__tests__/reservation-do.test.ts`
  - [ ] All type tests pass: `cd site && npx vitest run src/types/__tests__/reservation-types.test.ts`
  - [ ] Maintainer tests pass: `cd site && npx vitest run src/lib/__tests__/maintainer.test.ts`
- **Files**: Same test files from Tasks 1-4
- **Dependencies**: Tasks 1-4

---

## Build Agent 2: API Routes

### Overview
Update the existing reservations API route, update the config route to use shared maintainer util and accept cohort, create 3 new API route files (verify, lookup, submit) with rate limiting.

**Files owned:**
- `site/src/pages/api/reservations.ts`
- `site/src/pages/api/reservations/config.ts`
- `site/src/pages/api/reservations/verify.ts` (NEW)
- `site/src/pages/api/reservations/lookup.ts` (NEW)
- `site/src/pages/api/reservations/submit.ts` (NEW)
- `site/src/pages/api/__tests__/reservations.test.ts`
- `site/src/pages/api/__tests__/reservations-config.test.ts`
- `site/src/pages/api/__tests__/reservations-verify.test.ts` (NEW)
- `site/src/pages/api/__tests__/reservations-lookup.test.ts` (NEW)
- `site/src/pages/api/__tests__/reservations-submit.test.ts` (NEW)

**Depends on Agent 1** (types, maintainer.ts, DO handlers).

---

#### Task 1: Update existing reservations route (`site/src/pages/api/reservations.ts`)

- **Description**: Change `SLOT_ID_REGEX` from `ghost-\d+` to batch ID format. Update POST handler to pass `githubLogin` from session to DO.
- **Acceptance Criteria**:
  - [ ] `SLOT_ID_REGEX` changed to `/^\d{1,3}\.\d{1,3}\.\d{3}$/`
  - [ ] POST handler sends `githubLogin: session.login` in the DO request body alongside `slotId` and `userId`
  - [ ] Existing tests updated to use batch ID format (e.g., `'1.10.001'` instead of `'ghost-1'`)
  - [ ] All tests pass
- **Files**:
  ```
  site/src/pages/api/reservations.ts                ← EDIT
  site/src/pages/api/__tests__/reservations.test.ts ← EDIT
  ```
- **Dependencies**: Agent 1 (types)
- **Code Example** — POST handler change:
  ```typescript
  const doRequest = new Request('https://do/reserve', {
    method: 'POST',
    body: JSON.stringify({
      slotId,
      userId: session.userId,
      githubLogin: session.login,
    }),
  });
  ```
  Regex change:
  ```typescript
  const SLOT_ID_REGEX = /^\d{1,3}\.\d{1,3}\.\d{3}$/;
  ```
- **Test Cases** (file: `site/src/pages/api/__tests__/reservations.test.ts`):
  Update ALL existing tests to use batch ID format:
  - `test_post_valid_reserve`: Use `slotId: '1.10.001'`. Verify DO stub receives body with `githubLogin: 'test'` (from session mock `{ userId: '123', login: 'test', avatar: '' }`).
  - `test_post_invalid_slot_id`: Use `slotId: 'ghost-1'` (old format) → should now return 400. Also test `slotId: 'invalid'` → 400.
  - `test_post_missing_slot_id`: Unchanged behavior (still 400).
  - `test_get_unauthenticated`: Unchanged, but stub response body may include `cohort`.
  - `test_get_authenticated`: Unchanged.
  - `test_delete_*`: All release tests unchanged (use userId from session, no slotId in body).
  - `test_do_error_passthrough`: Use batch ID format in fixture.
  - Rate limit tests: Unchanged.

---

#### Task 2: Update config route (`site/src/pages/api/reservations/config.ts`)

- **Description**: Import `isMaintainer` from `@/lib/maintainer` instead of inline. Add `cohort` field type validation (must be number if present). The DO handles the actual cohort validation logic.
- **Acceptance Criteria**:
  - [ ] Inline `isMaintainer` function removed
  - [ ] `import { isMaintainer } from '@/lib/maintainer'` added
  - [ ] `body.cohort` type validated (must be number if present)
  - [ ] Existing tests pass unchanged (no behavioral change)
- **Files**:
  ```
  site/src/pages/api/reservations/config.ts              ← EDIT
  site/src/pages/api/__tests__/reservations-config.test.ts ← EDIT (add cohort validation test)
  ```
- **Dependencies**: Agent 1 Task 2 (maintainer.ts must exist)
- **Code Example** — add after existing ttlDays validation:
  ```typescript
  if (body.cohort !== undefined && typeof body.cohort !== 'number') {
    return errorResponse('cohort must be a number', 400);
  }
  ```
- **Test Cases** (file: `site/src/pages/api/__tests__/reservations-config.test.ts`):
  - `test_config_cohort_type_validation`: POST with `{ cohort: 'abc' }` → 400 `'cohort must be a number'`
  - `test_config_cohort_valid_passthrough`: POST with `{ cohort: 2, totalGhostSlots: 15 }` → forwarded to DO, response from DO returned. Mock DO stub to return 200.
  - All existing tests must still pass.

---

#### Task 3: Create verify route (`site/src/pages/api/reservations/verify.ts`)

- **Description**: Public endpoint (no auth), rate-limited at 30 req/hour per IP. Validates `batchId` query param format, forwards to DO `/verify`.
- **Acceptance Criteria**:
  - [ ] GET handler exported
  - [ ] Rate limit: 30 req/hour per IP, key format `ratelimit:verify:{ip}:{hour}`, 2-hour TTL
  - [ ] Validates `batchId` param against `BATCH_ID_REGEX` before forwarding
  - [ ] Forwards `batchId`, `login`, `userId` query params to DO `/verify` endpoint
  - [ ] Returns DO response directly (200 with `{ valid, reason? }` or 429)
- **Files**:
  ```
  site/src/pages/api/reservations/verify.ts              ← NEW
  site/src/pages/api/__tests__/reservations-verify.test.ts ← NEW
  ```
- **Dependencies**: Agent 1 (DO verify handler)
- **Code Example**:
  ```typescript
  import type { APIRoute } from 'astro';
  import type { Env } from '@/lib/auth';
  import { jsonResponse, errorResponse } from '@/lib/responses';
  import { getReservationStub } from '@/lib/reservation-do';

  const BATCH_ID_REGEX = /^\d{1,3}\.\d{1,3}\.\d{3}$/;
  const VERIFY_RATE_LIMIT = 30;

  async function isVerifyRateLimited(kv: KVNamespace, ip: string): Promise<boolean> {
    const hour = Math.floor(Date.now() / 3_600_000);
    const key = `ratelimit:verify:${ip}:${hour}`;
    const current = parseInt((await kv.get(key)) ?? '0', 10);
    if (current >= VERIFY_RATE_LIMIT) return true;
    await kv.put(key, String(current + 1), { expirationTtl: 7200 });
    return false;
  }

  export const GET: APIRoute = async ({ request, locals, clientAddress }) => {
    const env = locals.runtime.env as Env;

    if (await isVerifyRateLimited(env.DATA, clientAddress)) {
      return errorResponse('Too many requests', 429, { message: 'Too many requests' });
    }

    const url = new URL(request.url);
    const batchId = url.searchParams.get('batchId');
    const login = url.searchParams.get('login');
    const userId = url.searchParams.get('userId');

    if (!batchId || !BATCH_ID_REGEX.test(batchId)) {
      return jsonResponse({ valid: false, reason: 'invalid_batch_id' });
    }

    const stub = getReservationStub(env);
    const params = new URLSearchParams();
    params.set('batchId', batchId);
    if (login) params.set('login', login);
    if (userId) params.set('userId', userId);

    try {
      const response = await stub.fetch(new Request(`https://do/verify?${params}`));
      const data = await response.json();
      return jsonResponse(data);
    } catch (error) {
      console.error('[Verify] DO fetch failed:', error);
      return errorResponse('Internal server error', 500);
    }
  };
  ```
- **Test Cases** (file: `site/src/pages/api/__tests__/reservations-verify.test.ts`):
  - `test_verify_valid`: Mock DO returns `{ valid: true, batchId: '5.10.001' }`. GET with `batchId=5.10.001&login=testuser` → 200 `{ valid: true }`.
  - `test_verify_invalid_batch_id`: GET with `batchId=bad` → 200 `{ valid: false, reason: 'invalid_batch_id' }` (caught at API layer, not forwarded to DO).
  - `test_verify_missing_batch_id`: GET with no batchId → 200 `{ valid: false, reason: 'invalid_batch_id' }`.
  - `test_verify_rate_limited`: Pre-fill KV with count 30 → 429.
  - `test_verify_forwards_params`: Verify DO stub.fetch called with URL containing `batchId`, `login`, `userId` params.
  - Setup: Use `createAPIContext` pattern with `clientAddress: '127.0.0.1'`. Mock `@/lib/auth` and `@/lib/reservation-do` as in existing API tests.

---

#### Task 4: Create lookup route (`site/src/pages/api/reservations/lookup.ts`)

- **Description**: Public endpoint (no auth), rate-limited at 30 req/hour per IP. Forwards `githubId` to DO `/lookup`.
- **Acceptance Criteria**:
  - [ ] GET handler exported
  - [ ] Rate limit: 30 req/hour per IP, key format `ratelimit:lookup:{ip}:{hour}`, 2-hour TTL
  - [ ] Validates `githubId` is present
  - [ ] Forwards to DO `/lookup` endpoint
  - [ ] Returns `{ batchId: string | null }`
- **Files**:
  ```
  site/src/pages/api/reservations/lookup.ts              ← NEW
  site/src/pages/api/__tests__/reservations-lookup.test.ts ← NEW
  ```
- **Dependencies**: Agent 1 (DO lookup handler)
- **Code Example**: Same pattern as verify.ts but:
  - Rate limit key: `ratelimit:lookup:{ip}:{hour}`
  - Param: `githubId` (required)
  - Forwards to `https://do/lookup?githubId={githubId}`
  - If `githubId` missing, return `{ batchId: null }` directly (don't forward to DO)
- **Test Cases** (file: `site/src/pages/api/__tests__/reservations-lookup.test.ts`):
  - `test_lookup_found`: Mock DO returns `{ batchId: '5.10.001' }`. GET with `githubId=123` → 200 `{ batchId: '5.10.001' }`.
  - `test_lookup_not_found`: Mock DO returns `{ batchId: null }`. GET with `githubId=999` → 200 `{ batchId: null }`.
  - `test_lookup_missing_param`: GET with no githubId → 200 `{ batchId: null }` (not forwarded to DO).
  - `test_lookup_rate_limited`: Pre-fill KV with count 30 → 429.
  - Setup: Same `createAPIContext` pattern.

---

#### Task 5: Create submit route (`site/src/pages/api/reservations/submit.ts`)

- **Description**: Authenticated, maintainer-only endpoint. Forwards to DO `/submit`.
- **Acceptance Criteria**:
  - [ ] POST handler exported
  - [ ] Requires authentication (401 if no session)
  - [ ] Requires maintainer authorization (403 if not maintainer)
  - [ ] Validates request body has `batchId` and `skillsetId`
  - [ ] Forwards to DO `/submit`
  - [ ] Returns DO response (200, 400, 404, or 409)
- **Files**:
  ```
  site/src/pages/api/reservations/submit.ts              ← NEW
  site/src/pages/api/__tests__/reservations-submit.test.ts ← NEW
  ```
- **Dependencies**: Agent 1 (DO submit handler, maintainer.ts)
- **Code Example**:
  ```typescript
  import type { APIRoute } from 'astro';
  import { getSessionFromRequest, type Env } from '@/lib/auth';
  import { jsonResponse, errorResponse } from '@/lib/responses';
  import { getReservationStub } from '@/lib/reservation-do';
  import { isMaintainer } from '@/lib/maintainer';

  export const POST: APIRoute = async ({ request, locals }) => {
    const env = locals.runtime.env as Env;

    const session = await getSessionFromRequest(env, request);
    if (!session) {
      return errorResponse('Authentication required', 401);
    }

    if (!isMaintainer(env, session.userId)) {
      return errorResponse('Forbidden', 403);
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    const stub = getReservationStub(env);
    const doRequest = new Request('https://do/submit', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    try {
      const response = await stub.fetch(doRequest);
      const data = await response.json();
      return jsonResponse(data, { status: response.status });
    } catch (error) {
      console.error('[Submit] DO submit failed:', error);
      return errorResponse('Internal server error', 500);
    }
  };
  ```
- **Test Cases** (file: `site/src/pages/api/__tests__/reservations-submit.test.ts`):
  - `test_submit_unauthenticated`: No session → 401.
  - `test_submit_not_maintainer`: Session with userId not in MAINTAINER_USER_IDS → 403.
  - `test_submit_valid`: Maintainer session, mock DO returns 200 with `{ batchId, status: 'submitted', skillsetId }` → 200.
  - `test_submit_do_404`: Mock DO returns 404 `{ error: 'not_reserved' }` → 404.
  - `test_submit_do_409`: Mock DO returns 409 `{ error: 'already_submitted' }` → 409.
  - `test_submit_invalid_json`: Non-JSON body → 400.
  - Setup: Mock `getSessionFromRequest` and `getReservationStub`. Use `createMockEnv({ MAINTAINER_USER_IDS: '123' })`.

---

## Build Agent 3: Frontend Components

### Overview
Update GhostCard and SkillsetGrid to use batch IDs and handle the submitted state.

**Files owned:**
- `site/src/components/GhostCard.tsx`
- `site/src/components/SkillsetGrid.tsx`
- `site/src/components/__tests__/GhostCard.test.tsx`
- `site/src/components/__tests__/SkillsetGrid.test.tsx`

**Depends on Agent 1** (types).

---

#### Task 1: Update GhostCard props and batch ID display (`site/src/components/GhostCard.tsx`)

- **Description**: Replace `index` and `total` props with `batchId: string`. Add `skillsetId?: string` prop. Display batch ID instead of `{index}/{total}`.
- **Acceptance Criteria**:
  - [ ] Props: remove `index: number`, `total: number`. Add `batchId: string`, `skillsetId?: string`.
  - [ ] `status` type includes `'submitted'`
  - [ ] Bottom-right displays `{batchId}` instead of `{index}/{total}`
  - [ ] Available and reserved states render identically to current (except the batch ID display)
- **Files**:
  ```
  site/src/components/GhostCard.tsx                  ← EDIT
  ```
- **Dependencies**: Agent 1 Task 1 (types)
- **Code Example** — props interface:
  ```typescript
  interface GhostCardProps {
    slotId: string;
    batchId: string;
    status: 'available' | 'reserved' | 'submitted';
    expiresAt?: number;
    skillsetId?: string;
    isOwn: boolean;
    onReserved: (slotId: string, expiresAt: number) => void;
    onCancelled: () => void;
    onConflict: () => void;
  }
  ```
  Replace line 97:
  ```tsx
  // Before
  <span className="font-mono text-xs text-text-tertiary">{index}/{total}</span>
  // After
  <span className="font-mono text-xs text-text-tertiary">{batchId}</span>
  ```

---

#### Task 2: Add submitted state rendering to GhostCard

- **Description**: When `status === 'submitted'`, render a distinct visual state: link to the skillset detail page, show "Submitted" label and skillsetId, keep batch ID bottom-right.
- **Acceptance Criteria**:
  - [ ] When `status === 'submitted'` and `skillsetId` exists: card wraps in `<a>` linking to `/skillset/{namespace}/{name}` (derived from skillsetId `@namespace/Name`)
  - [ ] Placeholder bars replaced with "Submitted" label and `skillsetId` text
  - [ ] Batch ID still displays bottom-right
  - [ ] No "Claim" button or countdown for submitted state
  - [ ] If `skillsetId` is missing (defensive): render "Submitted — pending rebuild" without link
  - [ ] Border style: `border-green-500/30` (to differentiate from reserved orange)
- **Files**:
  ```
  site/src/components/GhostCard.tsx ← EDIT (same file as Task 1)
  ```
- **Dependencies**: Task 1
- **Code Example** — submitted state rendering:
  ```tsx
  if (status === 'submitted') {
    // Derive link from skillsetId (e.g., "@user/SkillName" → "/skillset/user/SkillName")
    const href = skillsetId
      ? `/skillset/${skillsetId.replace('@', '').replace('/', '/')}`
      : undefined;

    const content = (
      <article className="group border-b border-dashed py-6 border-green-500/30">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2 mb-2">
          <span className="text-text-secondary font-mono text-sm">
            {skillsetId ?? 'Submitted — pending rebuild'}
          </span>
          <span className="font-mono text-xs text-text-tertiary">{batchId}</span>
        </div>
        <div className="mb-3">
          <span className="text-xs font-mono text-green-600">Submitted</span>
        </div>
      </article>
    );

    return href ? <a href={href}>{content}</a> : content;
  }
  ```

---

#### Task 3: Update SkillsetGrid to pass batch IDs and handle submitted slots

- **Description**: Build a `Map<skillsetId, batchId>` from submitted slots. For submitted slots that match a real skillset, render the real card with batch ID badge (skip ghost card). For unmatched submitted slots, render ghost card in submitted state. Pass `batchId` to GhostCard instead of `index`/`total`.
- **Acceptance Criteria**:
  - [ ] `ReservationState` usage includes `cohort` field (from updated types)
  - [ ] Ghost cards receive `batchId={slotId}` prop instead of `index`/`total`
  - [ ] Submitted slots with matching `skillsetId` in `skillsets` array: render real skillset card with `<span className="font-mono text-xs text-text-tertiary">{batchId}</span>` appended
  - [ ] Submitted slots without matching skillset: render GhostCard in submitted state
  - [ ] Real skillset cards show batch ID from `SearchIndexEntry.batch_id` (static data) if available, falling back to the reservation cross-reference map
  - [ ] Available and reserved ghost cards render as before (just with `batchId` instead of index/total)
- **Files**:
  ```
  site/src/components/SkillsetGrid.tsx ← EDIT
  ```
- **Dependencies**: Agent 1 Task 1 (types), Task 1-2 of this agent (GhostCard props)
- **Code Example** — build cross-reference map and filter:
  ```typescript
  // Build submitted slot cross-reference: skillsetId → batchId
  const submittedMap = new Map<string, string>();
  if (reservations) {
    for (const [slotId, slot] of Object.entries(reservations.slots)) {
      if (slot.status === 'submitted' && slot.skillsetId) {
        submittedMap.set(slot.skillsetId, slotId);
      }
    }
  }

  // Filter ghost slots: exclude submitted slots that have a matching real skillset
  const ghostSlots = reservations
    ? Object.entries(reservations.slots).filter(([_, slot]) => {
        if (slot.status === 'submitted' && slot.skillsetId) {
          // Only show as ghost card if no matching real skillset exists
          return !skillsets.some(s => s.id === slot.skillsetId);
        }
        return true; // available and reserved always show as ghost cards
      })
    : [];
  ```
  For real skillset cards, append batch ID badge:
  ```tsx
  {/* After existing tags */}
  {(() => {
    const batchId = skillset.batch_id ?? submittedMap.get(skillset.id);
    return batchId ? (
      <span className="font-mono text-xs text-text-tertiary">{batchId}</span>
    ) : null;
  })()}
  ```
  For ghost cards, pass batchId prop:
  ```tsx
  <GhostCard
    key={slotId}
    slotId={slotId}
    batchId={slotId}
    status={slot.status}
    expiresAt={slot.expiresAt}
    skillsetId={slot.skillsetId}
    isOwn={reservations.userSlot === slotId}
    onReserved={...}
    onCancelled={...}
    onConflict={...}
  />
  ```

---

#### Task 4: Update component tests

- **Description**: Update GhostCard and SkillsetGrid tests for batch ID format and submitted state.
- **Acceptance Criteria**:
  - [ ] All GhostCard tests use `batchId` prop instead of `index`/`total`
  - [ ] New test for submitted state rendering
  - [ ] SkillsetGrid tests mock reservations with batch ID format
  - [ ] Tests verify batch ID display instead of index/total display
  - [ ] All tests pass: `cd site && npx vitest run src/components/__tests__/`
- **Files**:
  ```
  site/src/components/__tests__/GhostCard.test.tsx    ← EDIT
  site/src/components/__tests__/SkillsetGrid.test.tsx ← EDIT
  ```
- **Dependencies**: Tasks 1-3
- **Test Cases** (file: `site/src/components/__tests__/GhostCard.test.tsx`):
  - `test_renders_available_with_batch_id`: Render with `batchId="3.10.001"` → displays "3.10.001" instead of old "N/M" format.
  - `test_renders_reserved_with_batch_id`: Render reserved state → displays batch ID and countdown.
  - `test_renders_submitted_with_link`: Render `status="submitted"` with `skillsetId="@user/Skill"` → card is a link to `/skillset/user/Skill`, shows "Submitted" label.
  - `test_renders_submitted_no_skillset_id`: Render submitted without skillsetId → shows "Submitted — pending rebuild" without link.
  - Remove old tests referencing `index`/`total` props.

  (file: `site/src/components/__tests__/SkillsetGrid.test.tsx`):
  - `test_ghost_cards_show_batch_id`: Mock reservations with batch ID slots → verify batch ID text rendered.
  - `test_submitted_slot_with_matching_skillset`: Mock reservation with submitted slot whose skillsetId matches a skillset in the array → real card rendered with batch ID badge, no ghost card.
  - `test_submitted_slot_without_matching_skillset`: Mock reservation with submitted slot, no matching skillset → ghost card in submitted state rendered.

---

## Build Agent 4: CLI + Schema + CI

### Overview
Update the CLI init command with `gh` auth + reservation lookup + batch_id scaffolding. Add `batch_id` to JSON Schema. Add CI verification step.

**Files owned:**
- `cli/src/commands/init.ts`
- `cli/src/commands/__tests__/init.test.ts`
- `schema/skillset.schema.json`
- `.github/workflows/validate-submission.yml`

**No file conflicts with other agents.** Depends on Agent 2 (verify and lookup API endpoints must exist for runtime, but the CLI and CI code is self-contained).

---

#### Task 1: Add `batch_id` to JSON Schema (`schema/skillset.schema.json`)

- **Description**: Add `batch_id` to the schema's `properties` object. NOT required (optional for backward compatibility with Valence).
- **Acceptance Criteria**:
  - [ ] `batch_id` property added with `type: "string"`, `pattern: "^\\d{1,3}\\.\\d{1,3}\\.\\d{3}$"`, `description`
  - [ ] `batch_id` NOT in the `required` array
  - [ ] Existing skillsets (without batch_id) still validate
  - [ ] A skillset with `batch_id: "5.11.001"` validates
  - [ ] A skillset with `batch_id: "invalid"` fails validation
- **Files**:
  ```
  schema/skillset.schema.json ← EDIT
  ```
- **Dependencies**: None
- **Code Example** — add after `schema_version` property (or anywhere in `properties`):
  ```json
  "batch_id": {
    "type": "string",
    "pattern": "^\\d{1,3}\\.\\d{1,3}\\.\\d{3}$",
    "description": "Registry batch ID assigned from reservation (format: position.batch_size.cohort)"
  }
  ```
  Place it after `"schema_version"` in the `properties` object for logical ordering (identity fields together).

---

#### Task 2: Update CLI init command (`cli/src/commands/init.ts`)

- **Description**: Add `gh` CLI authentication check, GitHub user identity lookup, reservation lookup via `/api/reservations/lookup`, and `batch_id` injection into `SKILLSET_YAML_TEMPLATE`. Auto-fill author handle from `gh` login.
- **Acceptance Criteria**:
  - [ ] Before any prompts: check `gh auth status` (exits with error message if not authenticated)
  - [ ] Get GitHub user info via `execSync('gh api user', { encoding: 'utf-8' })`
  - [ ] Look up reservation via `fetch('https://skillsets.cc/api/reservations/lookup?githubId={id}')`
  - [ ] If no active reservation: exit with "No active reservation found" message
  - [ ] If reservation found: display batch ID, continue with existing prompt flow
  - [ ] Author handle auto-filled from `gh` login (user can still edit)
  - [ ] `SKILLSET_YAML_TEMPLATE` includes `batch_id: "{{BATCH_ID}}"` line after `schema_version`
  - [ ] Template substitution replaces `{{BATCH_ID}}` with actual batch ID
  - [ ] `execSync` imported from `child_process`
- **Files**:
  ```
  cli/src/commands/init.ts ← EDIT
  ```
- **Dependencies**: None (API endpoint is runtime dependency, not build dependency)
- **Code Example** — new init flow (insert before existing prompts):
  ```typescript
  import { execSync } from 'child_process';

  // ... existing imports ...

  export async function init(options: InitOptions): Promise<void> {
    console.log(chalk.blue('\n📦 Initialize a new skillset submission\n'));

    // 1. Verify gh CLI is available and authenticated
    try {
      execSync('gh auth status', { stdio: 'pipe' });
    } catch {
      console.error(chalk.red('Error: gh CLI not authenticated.'));
      console.error('Install: https://cli.github.com');
      console.error('Then run: gh auth login');
      process.exit(1);
    }

    // 2. Get GitHub user info (verified identity)
    const userJson = execSync('gh api user', { encoding: 'utf-8' });
    const { login, id } = JSON.parse(userJson);

    // 3. Look up reservation
    const res = await fetch(
      `https://skillsets.cc/api/reservations/lookup?githubId=${encodeURIComponent(String(id))}`
    );
    const lookupData = await res.json() as { batchId: string | null };

    if (!lookupData.batchId) {
      console.error(chalk.red('No active reservation found.'));
      console.error('Visit https://skillsets.cc to claim a slot first.');
      process.exit(1);
    }

    const batchId = lookupData.batchId;
    console.log(chalk.green(`\nReservation found: ${batchId}`));

    const cwd = process.cwd();
    // ... existing overwrite check ...

    // 4. Existing prompts, but auto-fill author handle
    const authorHandle = await input({
      message: 'GitHub handle (e.g., @username):',
      default: `@${login}`,  // ← auto-filled from gh
      validate: (value) => {
        if (!/^@[A-Za-z0-9_-]+$/.test(value)) {
          return 'Handle must start with @ followed by alphanumeric characters';
        }
        return true;
      },
    });

    // ... rest of existing prompts (name, description, etc.) ...

    // 5. Template substitution — add batch_id
    const skillsetYaml = SKILLSET_YAML_TEMPLATE
      .replace('{{BATCH_ID}}', batchId)    // ← NEW
      .replace('{{NAME}}', name)
      // ... rest unchanged ...
  }
  ```
  Updated template (add `batch_id` line after `schema_version`):
  ```typescript
  const SKILLSET_YAML_TEMPLATE = `schema_version: "1.0"
  batch_id: "{{BATCH_ID}}"

  # Identity
  name: "{{NAME}}"
  // ... rest unchanged
  `;
  ```

---

#### Task 3: Update CLI init tests (`cli/src/commands/__tests__/init.test.ts`)

- **Description**: Mock `execSync` for `gh auth status` and `gh api user`. Mock `fetch` for `/api/reservations/lookup`. Update assertions for batch_id in output.
- **Acceptance Criteria**:
  - [ ] Existing tests updated to mock `gh` CLI calls
  - [ ] New test: `gh auth status` fails → process exits with error message
  - [ ] New test: no reservation found → process exits with "No active reservation"
  - [ ] New test: reservation found → batch_id appears in generated skillset.yaml
  - [ ] New test: author handle auto-filled from `gh` login
  - [ ] All tests pass: `cd cli && npx vitest run src/commands/__tests__/init.test.ts`
- **Files**:
  ```
  cli/src/commands/__tests__/init.test.ts ← EDIT
  ```
- **Dependencies**: Task 2
- **Test Cases**:
  - `test_gh_auth_failure`: Mock `execSync('gh auth status')` to throw. Expect `process.exit(1)` called and error message includes 'gh CLI not authenticated'.
  - `test_no_reservation`: Mock `gh auth status` success, `gh api user` returns `{ login: 'testuser', id: 12345 }`, `fetch` returns `{ batchId: null }`. Expect `process.exit(1)` and message includes 'No active reservation'.
  - `test_reservation_found_batch_id_in_yaml`: Mock successful `gh` calls + `fetch` returns `{ batchId: '5.11.001' }`. Run through prompts. Verify generated `skillset.yaml` contains `batch_id: "5.11.001"`.
  - `test_author_handle_auto_filled`: Mock `gh api user` returns `{ login: 'testuser', id: 12345 }`. Verify the author handle prompt has `default: '@testuser'`.
  - Setup: Mock `child_process.execSync` via `vi.mock`. Mock global `fetch` via `vi.fn`. Mock `@inquirer/prompts` as existing tests do.

---

#### Task 4: Add CI reservation verification step (`.github/workflows/validate-submission.yml`)

- **Description**: Add a "Verify batch ID reservation" step after the "Verify author matches GitHub handle" step. Uses `curl` + `jq` to call the `/api/reservations/verify` endpoint.
- **Acceptance Criteria**:
  - [ ] New step named "Verify batch ID reservation"
  - [ ] Runs only when `steps.changed.outputs.dirs != ''`
  - [ ] For each changed dir: extracts `batch_id` from `skillset.yaml` via `yq eval '.batch_id'`
  - [ ] If `batch_id` is null or empty: `::error` and `EXIT_CODE=1`
  - [ ] Calls `curl -sf --max-time 10 --retry 2 "https://skillsets.cc/api/reservations/verify?batchId=$BATCH_ID&login=$PR_AUTHOR&userId=$PR_AUTHOR_ID"`
  - [ ] On curl failure (skillsets.cc down): `::warning` and `continue` (non-blocking)
  - [ ] On `valid: false`: `::error` with reason, `EXIT_CODE=1`
  - [ ] On `valid: true`: success message
  - [ ] `jq` used to parse JSON response (already available on ubuntu-latest)
- **Files**:
  ```
  .github/workflows/validate-submission.yml ← EDIT
  ```
- **Dependencies**: None (endpoint is runtime dependency)
- **Code Example**: The design doc (section 6.9, lines 858-902) contains the exact YAML step to add. Insert it between the "Verify author matches GitHub handle" step and the "Summary" step.

  **IMPORTANT**: Read the exact step from the design doc at `PROCESS_DOCS/design/batch-identity-system.md` section 6.9. Copy it verbatim — the `curl` flags, `jq` parsing, error handling, and warning-on-failure behavior are all specified precisely.

---

## Testing Strategy

**Framework**: Vitest for both site and CLI modules.

**Structure**:
- Site: `site/src/[module]/__tests__/*.test.ts` (colocated with source)
- CLI: `cli/src/commands/__tests__/*.test.ts`

**Execution**:
```bash
# Agent 1 tests
cd site && npx vitest run src/lib/__tests__/reservation-do.test.ts
cd site && npx vitest run src/types/__tests__/reservation-types.test.ts
cd site && npx vitest run src/lib/__tests__/maintainer.test.ts

# Agent 2 tests
cd site && npx vitest run src/pages/api/__tests__/reservations.test.ts
cd site && npx vitest run src/pages/api/__tests__/reservations-config.test.ts
cd site && npx vitest run src/pages/api/__tests__/reservations-verify.test.ts
cd site && npx vitest run src/pages/api/__tests__/reservations-lookup.test.ts
cd site && npx vitest run src/pages/api/__tests__/reservations-submit.test.ts

# Agent 3 tests
cd site && npx vitest run src/components/__tests__/GhostCard.test.tsx
cd site && npx vitest run src/components/__tests__/SkillsetGrid.test.tsx

# Agent 4 tests
cd cli && npx vitest run src/commands/__tests__/init.test.ts

# Full suite
cd site && npx vitest run
cd cli && npx vitest run
```

**Coverage targets**: All new code paths covered. Each test case named and specified above.

---

## Risk Mitigation

| # | Risk | Probability | Impact | Mitigation | Fallback | Detection |
|---|------|-------------|--------|------------|----------|-----------|
| 1 | DO storage.delete batch limit exceeded during cohort transition | Low (max 100 slots × 2 keys = 200 keys) | Medium — silent data loss | Chunk deletes to 128 keys per batch (specified in design) | Manual storage cleanup via wrangler | CI test `test_config_cohort_change_wipes_reserved` verifies chunked delete |
| 2 | Expired slot data deleted before maintainer calls /submit | Medium — maintainer may be slow | High — slot becomes unsubmittable | handleGetStatus does NOT delete expired entries; handleSubmit does NOT check expiry | Maintainer can re-reserve and re-submit | Test `test_submit_after_expiry` verifies this path |
| 3 | `gh` CLI not installed on user's machine | Medium — developer tool, not universal | Low — CLI init fails with clear message | Check `gh auth status` first, provide install URL | User can manually create skillset.yaml with batch_id | Error message directs to https://cli.github.com |
| 4 | skillsets.cc unreachable during CI verification | Low — Cloudflare uptime is high | Medium — PRs blocked | `curl --max-time 10 --retry 2`, on failure emit `::warning` and skip (not block) | Manual maintainer override | CI step logs warning annotation |
| 5 | Type breakage in existing components consuming GhostSlot/ReservationState | Medium — many consumers | High — build fails | Agent 1 updates types first, all other agents depend on it | Run `npx tsc --noEmit` after type changes to catch early | TypeScript compilation errors |

---

## Success Criteria

### Functional Requirements
- [ ] Batch IDs (`{pos}.{size}.{cohort}`) replace `ghost-N` in all DO storage, API responses, and UI display
- [ ] Available → Reserved → Submitted state machine works end-to-end
- [ ] `/api/reservations/verify` correctly validates batch ID + login/userId for CI
- [ ] `/api/reservations/lookup` returns active reservation for CLI init
- [ ] `/api/reservations/submit` transitions slot to terminal submitted state (maintainer-only)
- [ ] Cohort changes wipe reserved slots, preserve submitted slots
- [ ] Batch size is immutable within a cohort
- [ ] CLI init requires `gh` auth, looks up reservation, scaffolds `batch_id` in YAML
- [ ] CI verifies `batch_id` + PR author match before allowing merge
- [ ] GhostCard displays batch ID and renders submitted state
- [ ] SkillsetGrid cross-references submitted slots with real skillset cards

### Non-Functional Requirements
- [ ] All site tests pass: `cd site && npx vitest run`
- [ ] All CLI tests pass: `cd cli && npx vitest run`
- [ ] TypeScript compiles cleanly: `cd site && npx tsc --noEmit`
- [ ] No references to `ghost-` remain in production code (only in git history)
- [ ] Rate limiting on new endpoints: 30 req/hour per IP

### Agent Dependency Order
```
Agent 1 (DO + Types + Maintainer)  ← MUST complete first
    ↓
Agent 2 (API Routes)               ← depends on Agent 1
Agent 3 (Frontend Components)      ← depends on Agent 1
Agent 4 (CLI + Schema + CI)        ← independent of Agents 2/3
```

Agents 2, 3, and 4 can run in parallel after Agent 1 completes.

---

## Implementation Notes

### Critical: Lazy expiry change
The current DO eagerly deletes expired entries in `handleGetStatus`. The new implementation does NOT delete them — it treats them as `available` in the response but preserves storage for `/submit`. This is a behavioral change that affects test expectations. All tests that checked `_store.has('slot:...')` is `false` after expiry must be updated to check it's `true`.

### Critical: Discriminated union in SlotData
The current `SlotData` is `{ userId, expiresAt }`. The new type is `ReservedSlotData | SubmittedSlotData` with a `status` discriminant. All existing storage mock data in tests must include `status: 'reserved'` and `githubLogin`.

### Config.ts edit scope
Agent 1 Task 2 edits `config.ts` to import from maintainer.ts. Agent 2 Task 2 also edits `config.ts` to add cohort validation. These must be coordinated — Agent 1 makes the import change, Agent 2 adds the validation logic. No conflict since they touch different parts of the file.

### GhostCard submitted link derivation
`skillsetId` format is `@namespace/Name`. To derive the URL: strip `@`, split on `/` → `/skillset/{namespace}/{name}`. Example: `@supercollectible/Valence` → `/skillset/supercollectible/Valence`.

### Helpful commands
```bash
# Run single test file
cd site && npx vitest run src/lib/__tests__/reservation-do.test.ts

# Type check
cd site && npx tsc --noEmit

# Run all site tests
cd site && npm test

# Run all CLI tests
cd cli && npm test
```
