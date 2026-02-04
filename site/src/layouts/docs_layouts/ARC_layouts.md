# Layouts Architecture

## Overview
Base HTML layout component providing consistent page structure, navigation, fonts, and global styles for all pages.

## Directory Structure
```
layouts/
├── docs_layouts/
│   └── BaseLayout.md          # BaseLayout documentation
└── BaseLayout.astro           # Base HTML layout
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
- Font imports: Crimson Pro (serif), Inter (sans), JetBrains Mono (monospace)

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
- **Index Menu**: Links to Browse, CLI, Contribute, About
- **Social Links**: GitHub, Reddit, X, Email (sticky footer)

#### Desktop Behavior
- Fixed width: 16rem (w-64)
- Sticky positioning (sticky top-0)
- Border-right separator
- Scrollable if content overflows (overflow-y-auto)

#### Mobile Behavior
- Full-width (w-full)
- Flows above main content (flex-col)
- Not sticky (normal scroll)

### Main Content Area
- Receives page content via `<slot />`
- Flexible width (flex-grow)
- Stone-50 background (consistent with site theme)

## Design Patterns

### Slot-Based Composition
- Pages wrap content in `<BaseLayout>` tags
- Content inserted via Astro `<slot />` mechanism
- Layout provides frame, pages provide content

### Responsive Design
- Mobile-first: full-width sidebar, stacked layout
- Desktop: fixed sidebar, side-by-side layout
- Breakpoint: `md:` (768px)

### Typography
- **Serif**: Crimson Pro (headings, descriptions)
- **Sans**: Inter (unused currently, reserved for UI)
- **Mono**: JetBrains Mono (code, metadata, labels)

### Color Palette
- **Background**: stone-50 (light warm gray)
- **Text**: text-ink (near-black)
- **Accent**: orange-500 (links, highlights)
- **Borders**: border-ink (black)

### Navigation Styling
- Uppercase section headers (e.g., "INDEX")
- Hover effect: orange color + underline
- Small serif links (text-sm)
- Monospace headers (font-mono, uppercase, tracking-wider)

## Integration Points

### Used By
All pages:
- `pages/index.astro`
- `pages/browse.astro`
- `pages/about.astro`
- `pages/contribute.astro`
- `pages/cli.astro`
- `pages/404.astro`
- `pages/skillset/[namespace]/[name].astro`

### Consumes
- `@/styles/global.css` (Tailwind CSS, custom global styles)
- Google Fonts API (Crimson Pro, Inter, JetBrains Mono)

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
font-sans → Inter (default body text)
font-serif → Crimson Pro (headings, descriptions)
font-mono → JetBrains Mono (code, metadata)
```

## Performance Considerations
- Font preconnect for faster loading
- `display=swap` in Google Fonts URL (prevents FOIT)
- Minimal CSS (Tailwind utilities only)
- No custom JavaScript (static layout)

## Accessibility
- Semantic HTML5 structure (aside, main, nav)
- aria-label on social icons (screen reader support)
- Skip navigation could be added (not currently implemented)
