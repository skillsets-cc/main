# Layouts Architecture

## Overview
Base HTML layout component providing consistent page structure, expanding icon sidebar, ambient canvas background, and global styles for all pages. Handles font loading, View Transitions (ClientRouter), mobile sidebar drawer, and back-to-top behavior.

## Directory Structure
```
layouts/
├── docs_layouts/
│   ├── ARC_layouts.md          # Module architecture
│   └── BaseLayout.md           # BaseLayout documentation
├── BaseLayout.astro            # Base HTML layout
└── README.md                   # Module index
```

## Components

| Component | Purpose | Key Exports |
|-----------|---------|-------------|
| `BaseLayout.astro` | Base HTML wrapper for all pages | Layout with sidebar, canvas background, slot |

## Data Flow

```
Page (e.g. index.astro)
  └── <BaseLayout title="..." description="...">
        ├── HTML head: meta + fonts + ClientRouter
        ├── Sidebar: icon-only, expands on hover
        │   └── AuthStatus (client:load)
        ├── Mobile FABs: sidebar toggle + back-to-top
        ├── Canvas background: animated hex rain (z-0)
        └── <slot /> page content (z-10)
```

## Integration Points

### Used By
All pages:
- `pages/index.astro`
- `pages/about.astro`
- `pages/contribute.astro`
- `pages/cli.astro`
- `pages/404.astro`
- `pages/skillset/[namespace]/[name].astro`

### Consumes
- `@/components/AuthStatus.tsx` (GitHub OAuth login status widget)
- `@/styles/global.css` (Tailwind CSS, custom global styles)
- Google Fonts API (Outfit, JetBrains Mono)
- `astro:transitions` (ClientRouter for View Transitions API)

### Emits
No events (static layout with inline JS for DOM interactions)

## Layout Grid

```
┌──────────────────────────────────────────────┐
│  BaseLayout (flex-row, min-h-screen)         │
├───────────────┬──────────────────────────────┤
│  Sidebar      │   Main Content               │
│  (fixed)      │   (flex-1, md:ml-16)         │
│  w-16 → w-64  │                              │
│               │   [canvas bg, z-0]           │
│  - Nav icons  │   [grain overlay, z-0]       │
│  - Nav labels │                              │
│    (fade in   │   <slot /> (z-10)            │
│    on hover)  │                              │
│  - AuthStatus │                              │
└───────────────┴──────────────────────────────┘
  [mobile FABs: sidebar toggle + back-to-top]
```

## Design Patterns

### Expanding Sidebar
- Desktop: collapsed to `w-16` (icon only), expands to `w-64` on `group-hover`
- Nav labels: `opacity-0 group-hover:opacity-100` with `transition-opacity duration-200`
- Mobile: full-width slide-out drawer triggered by FAB

### View Transitions
`<ClientRouter />` enables Astro's View Transitions API for SPA-like navigation. The canvas background wrapper uses `transition:persist` to survive page transitions without re-initializing the animation.

### Ghost Terminal Background
Animated hex digit rain (`0-9`, `A-F`) drawn on a fullscreen `<canvas>`. Runs at ~20fps via `requestAnimationFrame` with a 50ms gate. Columns near viewport edges are slightly brighter. Persists across route changes via `transition:persist`.

### Responsive Design
- Mobile: sidebar hidden as slide-out drawer, triggered by bottom-left FAB
- Desktop: collapsed icon sidebar, expands on hover
- Breakpoint: `md:` (768px)

### Typography
- **Body**: Outfit (applied via `font-sans`)
- **Mono**: JetBrains Mono (code, metadata, labels)

### Color Palette
- **Background**: `#020202` (near-black)
- **Text**: `text-text-ink`
- **Accent**: `text-accent` (orange, links/hover)
- **Surface**: `surface-paper` (sidebar background)

### Z-index Stack
| Layer | z-index |
|-------|---------|
| Canvas background | 0 |
| Page content | 10 |
| Back-to-top FAB | 40 |
| Mobile toggle FAB | 50 |
| Overlay | 55 |
| Sidebar | 60 |

## Performance Considerations
- Font preconnect for faster loading
- `display=swap` in Google Fonts URL (prevents FOIT)
- Canvas animation throttled to ~20fps
- Inline JavaScript for DOM interactions (~130 lines, no external dependencies)
- `requestAnimationFrame` + `ticking` flag prevents scroll handler thrashing

## Accessibility
- Semantic HTML5 structure (`aside`, `main`, `nav`)
- `aria-label` on interactive buttons (sidebar toggle, back-to-top)
- External links: `target="_blank" rel="noopener noreferrer"`
