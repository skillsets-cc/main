# Components Architecture

## Overview
React and Astro components for the skillsets.cc frontend. Includes interactive React islands (search, filtering, stars) and static Astro components (cards, galleries, layouts). Components follow Astro's islands architecture pattern—static HTML by default with selective client-side hydration.

## Directory Structure
```
components/
├── docs_components/           # Component documentation
│   ├── SearchBar.md
│   ├── TagFilter.md
│   ├── DownloadCount.md
│   ├── CopyCommand.md
│   ├── StarButton.md
│   ├── SkillsetGrid.md
│   └── ProofGallery.md
├── __tests__/                 # Component tests
│   ├── fixtures.ts
│   ├── SearchBar.test.tsx
│   ├── TagFilter.test.tsx
│   ├── DownloadCount.test.tsx
│   ├── StarButton.test.tsx
│   ├── CopyCommand.test.tsx
│   └── SkillsetGrid.test.tsx
├── SearchBar.tsx              # Fuzzy search with Fuse.js
├── TagFilter.tsx              # Tag-based filtering
├── DownloadCount.tsx          # Display download count (fetches from API)
├── CopyCommand.tsx            # Install command with copy button
├── StarButton.tsx             # Interactive star toggle
├── SkillsetGrid.tsx           # Orchestrates search + filter + grid display
└── ProofGallery.astro         # Verification proofs display
```

## Components

| Component | Type | Purpose | Hydration |
|-----------|------|---------|-----------|
| **SearchBar** | React | Fuzzy search with Fuse.js | client:load |
| **TagFilter** | React | Tag-based filtering with pill buttons | client:load |
| **SkillsetGrid** | React | Orchestrates search + filter, displays grid | client:load |
| **StarButton** | React | Star/unstar toggle with auth check | client:load |
| **DownloadCount** | React | Fetches and displays download count | client:load |
| **CopyCommand** | React | Install command with clipboard copy | client:load |
| **ProofGallery** | Astro | Verification section with links | Static |

## Data Flow

### Search and Filter Flow
```
User Input
  ↓
SearchBar (Fuse.js fuzzy search) → results
  ↓
TagFilter (array filter) → results
  ↓
SkillsetGrid (intersection: searchResults ∩ tagResults) → finalResults
  ↓
Render grid articles
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
Optimistic UI update
```

### Download Count Flow
```
Component mounts
  ↓
GET /api/stats/counts (fetch all download counts)
  ↓
Extract count for skillsetId
  ↓
Display count (fallback to initialCount on error)
```

## Integration Points

### Internal Dependencies
- `@/types` (SearchIndexEntry, Skillset interfaces)
- `@/lib/data` (getSkillsets for build-time data)

### External Dependencies
- `react` (hooks: useState, useEffect, useMemo)
- `fuse.js` (fuzzy search in SearchBar)

### API Endpoints
- `GET /api/star?skillsetId={id}` (fetch star state)
- `POST /api/star` (toggle star)
- `GET /api/stats/counts` (fetch download counts)

### Used By
- `pages/browse.astro` (SkillsetGrid for browse page)
- `pages/index.astro` (SkillsetGrid for featured skillsets)
- `pages/skillset/[namespace]/[name].astro` (StarButton, DownloadCount, CopyCommand, ProofGallery)

## Design Patterns

### Islands Architecture
- Static HTML by default (fast initial load)
- React components hydrated with `client:load` or `client:visible`
- Minimal JavaScript (only for interactivity)

### State Management
- Local component state (useState)
- No global state management (Redux, Zustand)
- Props drilling for parent-child communication

### Performance
- Memoization with `useMemo` for expensive computations (Fuse.js instance, search results)
- Single API call in SkillsetGrid fetches all star counts (batch operation)
- No virtualization (assumes small dataset < 100 skillsets)

### Styling
- Tailwind CSS utility classes
- Consistent design tokens: orange-500 (accent), stone-50 (bg), border-border-ink
- Responsive: mobile-first with `md:` breakpoints
- No custom CSS (except global styles)
