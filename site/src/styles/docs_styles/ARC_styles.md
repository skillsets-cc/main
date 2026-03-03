# Styles Architecture

## Overview
The styles module provides global CSS configuration for the site, including Tailwind integration, typography system, custom scrollbars, and reusable utility classes. It establishes the foundational design system that all pages and components inherit.

## Directory Structure
```
styles/
├── global.css              # Global styles, Tailwind layers, typography, scrollbar
├── README.md               # Module index
└── docs_styles/
    ├── ARC_styles.md       # This file
    └── global.css.md       # global.css documentation
```

## Components

| Component | Purpose | Key Exports |
|-----------|---------|-------------|
| `global.css` | Global CSS setup | `.scrollbar-hide` utility, typography base styles |

## Data Flow

1. **Import**: `site/src/layouts/BaseLayout.astro` imports `global.css`
2. **Tailwind processing**: Build-time PostCSS processes `@tailwind` directives
3. **Theme resolution**: Custom classes reference theme tokens from `tailwind.config.js`
4. **Global scope**: All pages inherit base styles (typography, scrollbar)

## Design System

### Typography Hierarchy
- **Base**: 16px (Tailwind default)
- **Body**: Outfit sans-serif (`font-family: 'Outfit', sans-serif`)
- **Mono**: JetBrains Mono at 0.90em / font-weight 500 (scaled for visual balance)

### Color System
All colors reference Tailwind theme tokens (defined in `site/tailwind.config.js`):
- `colors.surface.paper` - Sidebar / scrollbar track background
- `colors.border.ink` - Subtle borders
- `colors.border.strong` - Prominent borders / scrollbar thumb
- `colors.text.tertiary` - Muted text / scrollbar hover
- `colors.accent.DEFAULT` - Orange accent
- `colors.accent.highlight` - Glow highlight

### Style Patterns
- **Stable scrollbar**: `scrollbar-gutter: stable` prevents layout shift
- **Custom scrollbar**: WebKit-only themed scrollbar matching site's color system (desktop only; hidden on mobile)
- **Sticky header condensing**: `#sticky-header` transitions padding/font-size via `data-stuck` attribute
- **Proof gallery condensing**: `.proof-pills` shrinks when `:root[data-header-stuck="true"]`
- **Glow hover**: `.glow-border-hover` adds orange box-shadow on hover

## Integration Points

### Consumed by:
- `site/src/layouts/BaseLayout.astro` (imports global.css)
- All pages (inherit base typography and scrollbar styles)
- Components using `.scrollbar-hide` class

### Depends on:
- `site/tailwind.config.js` (theme token definitions)
- Tailwind CSS (postcss processing)

## Browser Support
- **Custom scrollbar**: WebKit only (Chrome, Safari, Edge) - fallback to default on Firefox
- **`scrollbar-gutter`**: Modern browsers (Chrome 94+, Firefox 97+, Safari 17+)
