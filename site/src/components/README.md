# Components Module

## Purpose
React and Astro components for the skillsets.cc frontend UI. Implements interactive islands (filtering, stars, ghost entries, auth status) and static presentation components (galleries, proof badges). Follows Astro's islands architecture for minimal JavaScript and fast page loads.

## Architecture
```
components/
├── docs_components/           # Component documentation
│   ├── ARC_components.md      # Architecture overview
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
├── DownloadCount.tsx          # Download count display
├── GhostCard.tsx              # Ghost entry slot card (claim/cancel)
├── MediaGallery.astro         # Image gallery for skillset media
├── ProofGallery.astro         # Verification proof badges (sticky bar)
├── SkillsetGrid.tsx           # Grid coordinator (filtering + ghost entries)
├── StarButton.tsx             # Star toggle with auth
├── TagFilter.tsx              # Tag filtering (fixed bottom bar)
└── useCountdown.ts            # Countdown timer hook
```

## Files

| File | Purpose | Documentation |
|------|---------|---------------|
| — | Architecture overview | [ARC_components.md](./docs_components/ARC_components.md) |
| `AuthStatus.tsx` | Login/logout action link with auth state check | [Docs](./docs_components/AuthStatus.md) |
| `CopyCommand.tsx` | Install command code block with clipboard copy | [Docs](./docs_components/CopyCommand.md) |
| `DownloadCount.tsx` | Download count badge (fetches from API) | [Docs](./docs_components/DownloadCount.md) |
| `GhostCard.tsx` | Ghost entry slot card with claim/cancel actions | [Docs](./docs_components/GhostCard.md) |
| `MediaGallery.astro` | Image gallery for cold start spend visualization | [Docs](./docs_components/MediaGallery.md) |
| `ProofGallery.astro` | Sticky verification proof badge bar | [Docs](./docs_components/ProofGallery.md) |
| `SkillsetGrid.tsx` | Grid orchestrator (filtering, ghost entries, live stats) | [Docs](./docs_components/SkillsetGrid.md) |
| `StarButton.tsx` | Star/unstar toggle with auth check | [Docs](./docs_components/StarButton.md) |
| `TagFilter.tsx` | Tag filtering UI (fixed bottom bar, portal) | [Docs](./docs_components/TagFilter.md) |
| `useCountdown.ts` | React hook for reservation countdown timers | [Docs](./docs_components/useCountdown.md) |
