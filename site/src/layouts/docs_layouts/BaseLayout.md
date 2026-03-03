# BaseLayout.astro

## Purpose
Base HTML layout providing consistent page structure, expanding icon sidebar, fonts, and global styles. Used by all pages to maintain uniform design and navigation across the site.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| BaseLayout | Astro layout | Wrapper layout with sidebar nav, ambient canvas background, and HTML structure |
| Props | interface | title (required), description (optional) |

## Dependencies
- **Internal**:
  - `@/components/AuthStatus.tsx` (GitHub OAuth login status)
  - `@/styles/global.css` (Tailwind CSS, global styles)
- **External**:
  - Google Fonts (Outfit, JetBrains Mono)
  - `astro:transitions` (ClientRouter for View Transitions API)

## Integration Points
- **Used by**:
  - All pages (index, about, contribute, cli, skillset detail, 404)
- **Consumes**:
  - AuthStatus component (client-side GitHub login status, `client:load`)
- **Emits**: No events

## Key Logic

### HTML Head
- Meta tags: charset, viewport, description
- Dynamic title and description from props
- Preconnects to Google Fonts for performance
- Loads two fonts: Outfit (sans-serif body), JetBrains Mono (monospace)
- `<ClientRouter />` for Astro View Transitions (SPA-like navigation)

### Layout Structure
- Flexbox layout: fixed sidebar (icon-only, expands on hover) + main content (flex-grow)
- Main content: `md:ml-16` left margin to clear collapsed sidebar
- Selection styling: orange highlight with ink text (`selection:bg-accent-highlight`)

### Expanding Sidebar (Desktop)
- **Collapsed**: `w-16` (icon only), nav labels hidden (`md:opacity-0`)
- **Expanded**: `w-64` on group hover (`md:hover:w-64`), labels fade in (`md:group-hover:opacity-100`)
- `overflow-hidden` + `transition-all duration-300` for smooth width animation
- Auth status in footer slot of sidebar (always icon, label fades with hover)

### Mobile Sidebar Behavior
- **Toggle FAB**: Fixed bottom-left (`z-50`), hamburger icon, `md:hidden`
- **Sidebar drawer**: Slides in from left with `-translate-x-full`, `fixed inset-y-0 left-0 z-[60]`
- **Overlay**: `fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]`, dismisses sidebar on click
- **Z-index stack**: sidebar (60) > overlay (55) > toggle (50)

### Sidebar Navigation Links
- 7 nav links: Registry (/), CLI (/cli), Contribute (/contribute), About (/about), GitHub, Reddit, Email
- Each link: icon (w-5 h-5) + label (font-mono text-sm, fades on desktop)
- Hover: `hover:bg-surface-white hover:text-accent`

### Back-to-Top Button
- Fixed bottom-right on mobile, centered between sidebar and viewport edge on desktop (`md:left-16 md:mx-auto`)
- Hidden by default (`opacity-0 pointer-events-none`), appears after scrolling one viewport height
- Uses `requestAnimationFrame` with `ticking` flag for scroll performance
- Smooth scroll: `window.scrollTo({ top: 0, behavior: 'smooth' })`

### Ghost Terminal Canvas Background
- `<canvas id="bg-canvas">` fullscreen, `opacity-30`, positioned behind content (`z-0`)
- Animated hex digit rain (0-9, A-F) in orange accent color at ~20fps
- `transition:persist` on wrapper preserves animation across Astro page transitions
- Width-only resize reinitializes drops; height-only resize (mobile URL bar) preserves state
- `distFromCenter` gradient: columns near edges slightly brighter than center

### Main Content Area
- `relative z-10` on content wrapper, above the canvas background
- Grain overlay: inline SVG noise filter at `opacity-[0.03]` for texture
