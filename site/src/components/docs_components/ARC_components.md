# Components Architecture

## Overview
React and Astro components for the skillsets.cc frontend. Includes interactive React islands (filtering, stars, ghost entries) and static Astro components (galleries, proof badges). Components follow Astro's islands architecture pattern—static HTML by default with selective client-side hydration.

## Directory Structure
```
components/
├── docs_components/           # Component documentation
│   ├── ARC_components.md
│   ├── AuthStatus.md
│   ├── CopyCommand.md
│   ├── DownloadCount.md
│   ├── GhostCard.md
│   ├── MediaGallery.md
│   ├── ProofGallery.md
│   ├── SkillsetGrid.md
│   ├── StarButton.md
│   ├── TagFilter.md
│   └── useCountdown.md
├── __tests__/                 # Component tests
│   ├── fixtures.ts
│   ├── AuthStatus.test.tsx
│   ├── CopyCommand.test.tsx
│   ├── DownloadCount.test.tsx
│   ├── GhostCard.test.tsx
│   ├── SkillsetGrid.test.tsx
│   ├── StarButton.test.tsx
│   ├── TagFilter.test.tsx
│   └── useCountdown.test.ts
├── AuthStatus.tsx             # Login/logout link with auth state
├── CopyCommand.tsx            # Install command with copy button
├── DownloadCount.tsx          # Display download count (fetches from API)
├── GhostCard.tsx              # Ghost entry slot card (available/reserved/submitted)
├── MediaGallery.astro         # Image gallery for cold start spend
├── ProofGallery.astro         # Verification proof badges (sticky bar)
├── SkillsetGrid.tsx           # Orchestrates filtering + grid + ghost entries
├── StarButton.tsx             # Interactive star toggle
├── TagFilter.tsx              # Tag-based filtering (fixed bottom bar)
└── useCountdown.ts            # Countdown timer hook for reservations
```

## Components

| Component | Type | Purpose | Hydration |
|-----------|------|---------|-----------|
| **AuthStatus** | React | Login/logout link | client:load |
| **CopyCommand** | React | Install command with clipboard copy | client:load |
| **DownloadCount** | React | Fetches and displays download count | client:load |
| **GhostCard** | React | Ghost entry slot with claim/cancel actions | client:load |
| **MediaGallery** | Astro | Image gallery for skillset media | Static |
| **ProofGallery** | Astro | Verification proof badges (sticky) | Static |
| **SkillsetGrid** | React | Orchestrates filtering, grid, ghost entries | client:load |
| **StarButton** | React | Star/unstar toggle with auth check | client:load |
| **TagFilter** | React | Tag filtering (fixed bottom bar, portal) | client:load |
| **useCountdown** | Hook | Countdown timer for reservations | N/A |

## Data Flow

### Filter Flow
```
User clicks tag in TagFilter (fixed bottom bar)
  ↓
TagFilter filters skillsets array → results
  ↓
Calls onResultsChange(results)
  ↓
SkillsetGrid updates tagResults state
  ↓
Render filtered grid articles
```

### Star Flow
```
User clicks StarButton
  ↓
Check authentication (redirect to /login if needed)
  ↓
POST /api/star (with rate limiting)
  ↓
Update local state (starred, count)
  ↓
UI update reflects server response
```

### Download/Star Count Fetching
```
SkillsetGrid mounts
  ↓
GET /api/stats/counts (fetch all star counts in single batch)
  ↓
Update liveStars record
  ↓
Individual DownloadCount components mount
  ↓
GET /api/downloads?skillsetId=X (fetch download count)
  ↓
Display count (fallback to initialCount on error)
```

### Ghost Entry Flow
```
SkillsetGrid mounts
  ↓
GET /api/reservations (fetch slot state with credentials)
  ↓
Build submittedMap (skillsetId → batchId cross-reference)
  ↓
Render real skillsets (show batch ID if in submittedMap)
  ↓
Render GhostCard for available/reserved/submitted slots
  ↓
User clicks "Claim" on GhostCard
  ↓
POST /api/reservations (reserve slot, 401 → redirect to login)
  ↓
onReserved callback → optimistic update to reservations state
  ↓
User clicks "Cancel" on own reservation
  ↓
DELETE /api/reservations → onCancelled → update state
```

## Integration Points

### Internal Dependencies
- `@/types` (SearchIndexEntry, ReservationState interfaces)
- `@/lib/sanitize` (sanitizeUrl for user-supplied URLs)

### External Dependencies
- `react` (hooks: useState, useEffect, useMemo, createPortal)

### API Endpoints
- `GET /api/me` (fetch auth state in AuthStatus)
- `GET /api/star?skillsetId={id}` (fetch star state)
- `POST /api/star` (toggle star)
- `GET /api/stats/counts` (fetch all star counts for grid)
- `GET /api/downloads?skillsetId=X` (fetch individual download count)
- `GET /api/reservations` (fetch reservation state)
- `POST /api/reservations` (claim slot)
- `DELETE /api/reservations` (cancel reservation)

### Used By
- Navigation/sidebar (AuthStatus for login/logout links)
- `pages/browse.astro`, `pages/index.astro` (SkillsetGrid)
- `pages/skillset/[namespace]/[name].astro` (StarButton, DownloadCount, CopyCommand, ProofGallery, MediaGallery)

## Design Patterns

### Islands Architecture
- Static HTML by default (fast initial load)
- React components hydrated with `client:load`
- Minimal JavaScript (only for interactivity)
- Astro components render server-side (MediaGallery, ProofGallery)

### State Management
- Local component state (useState)
- No global state management (Redux, Zustand)
- Props drilling for parent-child communication
- Optimistic UI updates for ghost entry actions (reserve/cancel)

### Performance
- Memoization with `useMemo` for expensive computations (tag list, filtered results)
- Single API call in SkillsetGrid fetches all star counts (batch operation)
- No virtualization (assumes small dataset < 100 skillsets + ghost entries)
- Portal rendering for TagFilter (fixed bottom bar)

### Portal Pattern (TagFilter)
- Uses `createPortal(bar, document.body)` to render at document root
- Fixed positioning without layout constraints from parent
- Waits for client mount before rendering (SSR compatibility)

### Styling
- Tailwind CSS utility classes
- Consistent design tokens: accent (orange), surface-paper (bg), border-border-ink, status-success (green)
- Responsive: mobile-first with `md:` breakpoints
- No custom CSS (except global styles)
- Glassmorphism: `bg-surface-white/90 backdrop-blur-sm` for TagFilter bar
