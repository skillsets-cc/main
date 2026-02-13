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
  - `@/components/AuthStatus.tsx` (GitHub OAuth login status)
  - `@/styles/global.css` (Tailwind CSS, global styles)
- **External**:
  - Google Fonts (Crimson Pro, JetBrains Mono)

## Integration Points
- **Used by**:
  - All pages (index, about, contribute, cli, skillset detail, 404)
- **Consumes**:
  - AuthStatus component (client-side GitHub login status)
- **Emits**: No events

## Key Logic

### HTML Head
- Meta tags: charset, viewport, description
- Dynamic title and description from props
- Preconnects to Google Fonts for performance
- Loads two fonts: Crimson Pro (serif body), JetBrains Mono (monospace)

### Layout Structure
- Flexbox layout: sidebar (fixed width 64 on desktop) + main content (flex-grow)
- Sidebar: sticky on desktop, slide-out drawer on mobile with overlay
- Selection styling: orange highlight with ink text
- Main content has `overflow-x-clip` to prevent horizontal scroll on mobile

### Mobile Sidebar Behavior
- **Toggle button**: Fixed bottom-left (z-[70]), hamburger icon
- **Sidebar drawer**: Slides in from left with `-translate-x-full` transform
- **Overlay**: Semi-transparent black backdrop (z-[55]) dismisses sidebar on click
- **Close button**: X icon in top-right of sidebar (visible only on mobile)
- **Z-index stack**: toggle (70) > sidebar (60) > overlay (55)

### Sidebar Navigation
- **Logo**: "Skillsets.cc" + tagline "EST. 2026 • PUBLIC DOMAIN"
- **Index Menu**: Links to Skillsets, CLI, Contribute, About
- **Auth Status**: GitHub login widget (AuthStatus component with `client:load`)
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
- **Body (font-sans)**: Crimson Pro (remapped in Tailwind config; headings, body text)
- **Mono (font-mono)**: JetBrains Mono (code, metadata, labels)

### Interactive Script
Inline JavaScript handles mobile sidebar:
- `openSidebar()`: Removes `-translate-x-full`, shows overlay
- `closeSidebar()`: Adds `-translate-x-full`, hides overlay
- Event listeners: toggle button opens, close button + overlay close
