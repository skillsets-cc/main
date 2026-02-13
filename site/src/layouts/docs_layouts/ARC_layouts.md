# Layouts Architecture

## Overview
Base HTML layout component providing consistent page structure, navigation, fonts, and global styles for all pages.

## Directory Structure
```
layouts/
├── docs_layouts/
│   ├── ARC_layouts.md          # Module architecture
│   └── BaseLayout.md           # BaseLayout documentation
├── BaseLayout.astro            # Base HTML layout
└── README.md                   # Module index
```

## Component

### BaseLayout.astro
Wrapper layout used by all pages to maintain uniform design and navigation across the site.

**Props:**
- `title` (required): Page title for `<title>` tag
- `description` (optional): Meta description (default: "Verified registry of production-ready Claude Code workflows")

## Structure

### HTML Head
- Meta tags: UTF-8 charset, viewport, description
- Dynamic title from props
- Preconnects to Google Fonts (performance optimization)
- Font imports: Crimson Pro (serif body), JetBrains Mono (monospace)

### Layout Grid
```
┌─────────────────────────────────────┐
│         BaseLayout (flex-row)       │
├───────────┬─────────────────────────┤
│  Sidebar  │     Main Content        │
│  (fixed)  │     (flex-grow)         │
│           │                         │
│  - Logo   │  <slot /> (page content)│
│  - Nav    │                         │
│  - Social │                         │
│           │                         │
└───────────┴─────────────────────────┘
```

### Sidebar Navigation
- **Logo Section**: "Skillsets.cc" + "EST. 2026 • PUBLIC DOMAIN" tagline
- **Index Menu**: Links to Skillsets, CLI, Contribute, About
- **Social Links**: GitHub, Reddit, X, Email (sticky footer)

#### Desktop Behavior
- Fixed width: 16rem (w-64)
- Sticky positioning (sticky top-0)
- Border-right separator
- Scrollable if content overflows (overflow-y-auto)

#### Mobile Behavior
- Slide-out drawer from left (fixed positioning with transform)
- Hidden by default with `-translate-x-full`
- Hamburger toggle button (fixed bottom-left)
- Semi-transparent overlay backdrop
- Close button (X icon) in sidebar header
- Z-index layering: toggle (70) > sidebar (60) > overlay (55)

### Main Content Area
- Receives page content via `<slot />`
- Flexible width (flex-grow)
- White background (bg-white)

## Design Patterns

### Slot-Based Composition
- Pages wrap content in `<BaseLayout>` tags
- Content inserted via Astro `<slot />` mechanism
- Layout provides frame, pages provide content

### Responsive Design
- Mobile: sidebar hidden as slide-out drawer
- Desktop: fixed sidebar, side-by-side layout
- Breakpoint: `md:` (768px)

### Typography
- **Body**: Crimson Pro (applied via `font-sans` class, remapped to Crimson Pro in Tailwind config)
- **Mono**: JetBrains Mono (code, metadata, labels)

### Color Palette
- **Background**: surface-paper (light warm gray), surface-white (content areas)
- **Text**: text-ink (near-black)
- **Accent**: accent (links, highlights), accent-light (subtle emphasis)
- **Borders**: border-ink (black)

### Navigation Styling
- Uppercase section headers (e.g., "INDEX")
- Hover effect: orange color + underline
- Base-size serif links (text-base)
- Monospace headers (font-mono, uppercase, tracking-wider)

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
- Google Fonts API (Crimson Pro, JetBrains Mono)

### Emits
No events (static layout)

## Global Styles

### Selection Styling
```css
selection:bg-accent-highlight selection:text-text-ink
```
- Custom text selection color: orange background with ink text

### Font Stack
```
font-sans → Crimson Pro (body class uses font-sans, remapped in Tailwind config)
font-serif → Crimson Pro (same font, explicit serif variant)
font-mono → JetBrains Mono (code, metadata)
```

## Performance Considerations
- Font preconnect for faster loading
- `display=swap` in Google Fonts URL (prevents FOIT)
- Minimal CSS (Tailwind utilities only)
- Inline JavaScript for sidebar (~20 lines, no external dependencies)

## Accessibility
- Semantic HTML5 structure (aside, main, nav)
- aria-label on social icons (screen reader support)
- Skip navigation could be added (not currently implemented)
