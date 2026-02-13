# global.css

## Purpose
Defines global CSS styles and Tailwind customizations for the entire site. Sets up the foundational typography system (Crimson Pro serif + JetBrains Mono), custom scrollbar styling, and reusable utility classes.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `.scrollbar-hide` | utility class | Hides scrollbar while maintaining scrollability |

## Dependencies
- External: Tailwind CSS (`@tailwind` directives)
- Internal: Tailwind theme tokens (`colors.bg.paper`, `colors.border.ink`, etc.) defined in `tailwind.config.js`

## Integration Points
- Imported by: `site/src/layouts/BaseLayout.astro` (global scope)
- Theme references: All theme colors must be defined in `site/tailwind.config.js`

## Key Logic

### Typography System
- **Base font size**: 18px (bumped from Tailwind's 16px default to compensate for Crimson Pro's smaller x-height)
- **Body font**: Crimson Pro serif at 18px base
- **Monospace scaling**: JetBrains Mono has a larger x-height, so it's scaled down to 0.95em to visually match Crimson Pro
- **Scrollbar gutter**: `stable` prevents layout shift when scrollbar appears/disappears

### Custom Scrollbar (WebKit only)
- 14px width/height (visible but not intrusive)
- Thumb uses `border.strong` color with `bg.paper` 3px border for inset appearance
- Hover state darkens thumb to `text.tertiary`
- Track has `border.ink` left border for visual separation
