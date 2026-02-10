# reservation-do.ts

## Purpose
Implements a Cloudflare Durable Object for managing ghost entry reservations with SQLite-backed storage. This provides serialized access to slot reservations across the distributed Cloudflare Workers infrastructure, ensuring atomic operations and preventing race conditions. Uses a single named instance ("singleton") for global coordination.

## Public API

| Export | Type | Description |
|--------|------|-------------|
| `ReservationCoordinator` | class (extends DurableObject) | Durable Object handling all reservation operations via HTTP-like interface |
| `getReservationStub` | function | Returns singleton DO stub for reservation operations |

## Storage Schema

Durable Object storage uses key prefixes for different data types:
- `slot:{batchId}` → `SlotData` (discriminated union: `ReservedSlotData` or `SubmittedSlotData`)
- `user:{userId}` → `string` (batch ID user has reserved)
- `config` → `Config` (global settings: totalGhostSlots, ttlDays, cohort)

## HTTP Endpoints

The Durable Object exposes these internal endpoints (called via DO stub):

| Method | Path | Purpose | Request | Response |
|--------|------|---------|---------|----------|
| GET | `/status` | Get all slot states + config | Header: `X-User-Id` (optional) | `{ slots, totalGhostSlots, cohort, userSlot }` |
| POST | `/reserve` | Reserve a slot for user | `{ slotId, userId, githubLogin }` | `{ slotId, expiresAt }` |
| DELETE | `/release` | Release user's reservation | `{ userId }` | `{ released: slotId }` |
| POST | `/config` | Update configuration (maintainer) | `{ totalGhostSlots?, ttlDays?, cohort? }` | Updated config object |
| GET | `/verify` | Verify batch ID + identity match (CI) | Query: `batchId`, `login?`, `userId?` | `{ valid: true/false, reason? }` |
| POST | `/submit` | Transition slot to submitted (maintainer) | `{ batchId, skillsetId }` | `{ batchId, status, skillsetId }` |
| GET | `/lookup` | Find user's batch ID by GitHub user ID (CLI) | Query: `githubId` | `{ batchId: string \| null }` |

## Dependencies

- **External**: `cloudflare:workers` (DurableObject runtime)
- **Internal**: `./auth` (Env type for DO binding)

## Integration Points

- **Used by**:
  - `site/src/pages/api/reservations.ts` (status + reserve + release)
  - `site/src/pages/api/reservations/config.ts` (config updates)
  - `site/src/pages/api/reservations/verify.ts` (CI validation)
  - `site/src/pages/api/reservations/submit.ts` (maintainer workflow)
  - `site/src/pages/api/reservations/lookup.ts` (CLI batch ID lookup)
- **Emits/Consumes**: N/A (synchronous DO operations)

## Key Logic

### Batch ID Format
Format: `{position}.{batchSize}.{cohort}` (e.g., `5.10.001`)
- Position: 1-indexed slot number within batch
- BatchSize: Total number of ghost slots in cohort
- Cohort: 3-digit zero-padded cohort identifier

Validation enforces:
- Position must be within 1..batchSize
- BatchSize must match current config
- Cohort must match current config (except for maintainer submit)

### Status Discrimination
Expired reserved slots appear as "available" in `/status` response BUT their storage entries are preserved. This allows maintainers to use `/submit` to transition expired-but-reserved slots to submitted state (authoritative maintainer action).

### Atomic Write Coalescing
The Durable Object runtime coalesces multiple `ctx.storage.put()` or `ctx.storage.delete()` calls within the same request into a single transaction. Reserve and release operations explicitly avoid `await` between related writes to ensure atomicity:
```typescript
// Reserve (atomic)
this.ctx.storage.put(`slot:${slotId}`, newSlotData);
this.ctx.storage.put(`user:${userId}`, slotId);

// Release (atomic)
this.ctx.storage.delete(`slot:${slotId}`);
this.ctx.storage.delete(`user:${userId}`);
```

### Cohort Transitions
When cohort number changes via `/config`:
1. All `user:{userId}` index keys are deleted (frees users for new cohort)
2. Reserved slots from old cohort are deleted
3. Submitted slots are preserved across cohorts (terminal state)
4. Deletion batched to 128 keys per operation (DO storage limit)

### Terminal State
Submitted slots cannot be released or reused. They remain in storage permanently as proof of contribution.
