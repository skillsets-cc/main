# BaseLayout.astro

## Purpose
Base HTML layout providing consistent page structure, navigation sidebar, fonts, and global styles. Used by all pages to maintain uniform design and navigation across the site.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| BaseLayout | Astro layout | Wrapper layout with sidebar nav, fonts, and HTML structure |
| Props | interface | title (required), description (optional) |

## Dependencies
- **Internal**:
  - `@/styles/global.css` (Tailwind CSS, global styles)
- **External**:
  - Google Fonts (Crimson Pro, Inter, JetBrains Mono)

## Integration Points
- **Used by**:
  - All pages (index, browse, about, contribute, cli, skillset detail, 404)
- **Consumes**: None (static layout)
- **Emits**: No events

## Key Logic

### HTML Head
- Meta tags: charset, viewport, description
- Dynamic title and description from props
- Preconnects to Google Fonts for performance
- Loads three fonts: Crimson Pro (serif), Inter (sans), JetBrains Mono (monospace)

### Layout Structure
- Flexbox layout: sidebar (fixed width 64 on desktop) + main content (flex-grow)
- Sidebar: sticky on desktop, full-width on mobile
- Selection styling: orange highlight with ink text

### Sidebar Navigation
- **Logo**: "Skillsets.cc" + tagline "EST. 2026 • PUBLIC DOMAIN"
- **Index Menu**: Links to Browse, CLI, Contribute, About
- **Social Links**: GitHub, Reddit, X, Email (icons only)
- Sticky positioning on desktop (md:sticky md:top-0)
- Border-right separator (border-border-ink)

### Navigation Links
- Hover effect: orange color + underline
- Monospace uppercase section headers
- Serif font for main navigation items

### Footer Social Icons
- SVG icons for GitHub, Reddit, X, Email
- Centered layout with gap-6 spacing
- Hover effect: orange color transition
- External links open in new tab (target="_blank", rel="noopener noreferrer")

### Font Stack
- **Serif**: Crimson Pro (headings, body text)
- **Sans**: Inter (UI elements, unused currently)
- **Mono**: JetBrains Mono (code, metadata, labels)
