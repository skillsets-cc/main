# global.css

## Purpose
Defines global CSS styles and Tailwind customizations for the entire site. Sets up the foundational typography system (Outfit sans-serif + JetBrains Mono), custom scrollbar styling, sticky header/proof gallery condensing transitions, and reusable utility classes.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `.scrollbar-hide` | utility class | Hides scrollbar while maintaining scrollability |
| `.glow-border-hover` | component class | Adds orange glow box-shadow on hover |
| `#sticky-header` | element styles | Sticky header condensing transition (data-stuck attribute) |
| `.proof-pills` | component class | Proof gallery pill condensing with header-stuck state |
| `.proof-qualifier` | component class | Hides proof qualifier text when header is stuck |

## Dependencies
- External: Tailwind CSS (`@tailwind` directives)
- Internal: Tailwind theme tokens (`colors.surface.paper`, `colors.border.ink`, etc.) defined in `tailwind.config.js`

## Integration Points
- Imported by: `site/src/layouts/BaseLayout.astro` (global scope)
- Theme references: All theme colors must be defined in `site/tailwind.config.js`
- `#sticky-header` toggled by IntersectionObserver in `pages/skillset/[namespace]/[name].astro`
- `:root[data-header-stuck]` toggled by same observer for proof gallery condensing

## Key Logic

### Typography System
- **Base font size**: 16px (Tailwind default)
- **Body font**: Outfit sans-serif (`font-family: 'Outfit', sans-serif`)
- **Monospace scaling**: JetBrains Mono scaled to `0.90em` and `font-weight: 500` for visual balance
- **Scrollbar gutter**: `stable` prevents layout shift when scrollbar appears/disappears

### Custom Scrollbar (WebKit only, desktop ≥768px)
- 14px width/height (visible but not intrusive)
- Thumb uses `border.strong` color with `surface.paper` 3px border for inset appearance
- Hover state darkens thumb to `text.tertiary`
- Track has `border.ink` left border for visual separation
- Scrollbar hidden on mobile (`scrollbar-width: none`, `::-webkit-scrollbar { display: none }`)

### Sticky Header Condensing (`#sticky-header`)
- Transitions `padding` and `font-size` over 200ms ease
- `data-stuck="false"`: `padding-top: 1.5rem; padding-bottom: 1rem` (expanded)
- `data-stuck="true"`: `padding-top/bottom: 0.5rem` (condensed); `h1` shrinks to `1.25rem`
- `::after` pseudo-element extends background by 4px below header to cover sub-pixel gap between stacked sticky elements
- `[data-stuck-hide]` children are `display: none` when stuck

### Proof Gallery Condensing (`:root[data-header-stuck="true"]`)
- `.proof-pills`: `gap` reduces to `0.25rem`
- `.proof-pills a, .proof-pills > span`: padding and font-size shrink (transitions 200ms)
- `.proof-qualifier`: hidden via `display: none` when stuck (transitions opacity/width 150ms otherwise)
- `.border-b` inside `#proof-gallery` gets `margin-top: 0.5rem` when stuck

### Glow Border Hover
- `.glow-border-hover`: transitions `box-shadow` and `border-color` over 300ms
- On hover: sets `border-color` to accent and adds `0 0 15px accent-highlight` box-shadow
