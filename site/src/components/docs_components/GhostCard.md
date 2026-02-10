# GhostCard.tsx

## Purpose
React component for rendering individual ghost entry slot cards. Displays slot status (available, reserved, submitted) with appropriate UI states and actions (Claim, Cancel, link to skillset). Uses countdown timer for reserved slots.

## Public API

| Export | Type | Description |
|--------|------|-------------|
| `GhostCard` | React component | Ghost entry slot card with status-dependent UI |

### Props (GhostCardProps)
| Prop | Type | Description |
|------|------|-------------|
| `slotId` | string | Internal slot ID for API calls |
| `batchId` | string | Display batch ID (e.g., "5.10.001") |
| `status` | 'available' \| 'reserved' \| 'submitted' | Slot state |
| `expiresAt` | number? | Unix timestamp for reservation expiry |
| `skillsetId` | string? | Skillset ID for submitted slots (e.g., "@user/SkillName") |
| `isOwn` | boolean | Whether current user owns this reservation |
| `onReserved` | function | Callback on successful reservation: `(slotId, expiresAt) => void` |
| `onCancelled` | function | Callback on successful cancellation: `() => void` |
| `onConflict` | function | Callback on 409 conflict (slot taken or user has reservation): `() => void` |

## Dependencies

- **Internal**:
  - `./useCountdown.js` (React hook for countdown timer)
- **External**: `react` (useState, ReactElement)

## Integration Points

- **Used by**: Astro pages rendering ghost entry grids (e.g., `/browse`, `/contribute`)
- **Calls**:
  - `POST /api/reservations` (claim slot)
  - `DELETE /api/reservations` (cancel reservation)

## Key Logic

### Status-Based Rendering

**Submitted slots**:
- Green dashed border (`border-green-500/30`)
- Displays skillset ID or "Submitted — pending rebuild"
- Links to skillset page if skillsetId present
- Batch ID shown in tertiary text
- No actions available (terminal state)

**Reserved slots**:
- Orange dashed border (`border-orange-500/30`)
- Shows countdown timer via `useCountdown` hook
- If `isOwn === true`: Shows "Cancel" button
- If `isOwn === false`: No actions (other user's reservation)
- Placeholder bars for skillset name/description (ghost visual)

**Available slots**:
- Default gray dashed border (`border-border-ink`)
- Placeholder bars for skillset name/description (ghost visual)
- "Claim" button to reserve slot

### Reserve Flow
1. User clicks "Claim" on available slot
2. POST to `/api/reservations` with `{ slotId }`
3. On 401: Redirect to `/login?returnTo=/` (auth required)
4. On 409: Call `onConflict()` (slot taken or user has reservation)
5. On 201: Call `onReserved(slotId, expiresAt)` (success)

### Cancel Flow
1. User clicks "Cancel" on own reserved slot
2. DELETE to `/api/reservations` (userId from session)
3. On success: Call `onCancelled()`

### Loading State
All actions disable buttons and show loading state during API calls.
