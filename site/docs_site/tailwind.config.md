# tailwind.config.js

## Overview
**Purpose**: Design system token definitions — colors, typography, spacing, border radii, and prose styling for the `@tailwindcss/typography` plugin.

## Design Tokens

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| `bg-paper` | `#FAFAFA` | Page background (off-white) |
| `bg-main` | `#FFFFFF` | Card/surface background |
| `text-ink` | `#1A1A1A` | Primary text (near-black) |
| `text-secondary` | `#555555` | Body text, descriptions |
| `text-tertiary` | `#777777` | Muted labels, bullets |
| `accent-primary` | `#F97316` | Links, stars, highlights (orange-500) |
| `accent-highlight` | `#FFF3C4` | Subtle highlight yellow |
| `border-ink` | `#E5E7EB` | Structural gray borders |
| `border-strong` | `#1A1A1A` | Emphasized borders |
| `status-success` | `#2e7d32` | Success indicators |
| `status-error` | `#d32f2f` | Error indicators |
| `status-warning` | `#ed6c02` | Warning indicators |

### Typography
| Token | Value | Notes |
|-------|-------|-------|
| `font-serif` | `"Crimson Pro", serif` | Headings and body text |
| `font-sans` | `"Crimson Pro", serif` | Aliased to serif (single typeface) |
| `font-mono` | `"JetBrains Mono", monospace` | Code, metadata, labels, buttons |

### Spacing
| Token | Value |
|-------|-------|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 12px |
| `lg` | 16px |
| `xl` | 20px |

### Border Radius
| Token | Value | Notes |
|-------|-------|-------|
| `none` | 0 | Default — sharp geometric aesthetic |
| `sm` | 2px | Minimal radius |
| `md` | 4px | Subtle rounding |

### Prose (Typography Plugin)
Customizes `@tailwindcss/typography` for the design system:
- Body: `#555555` at `1.125rem` in Crimson Pro
- Headings: `#1A1A1A` at weight 600 in Crimson Pro
- Links: `#F97316` with underline, hover `#EA580C`
- Code: JetBrains Mono at `0.875em`, stone-50 background, ink border
- Pre blocks: No border radius, JetBrains Mono at `0.875rem`

## Integration Points
- **global.css**: Tailwind `@tailwind` directives import these tokens
- **All components**: Use tokens via Tailwind utility classes (`text-ink`, `bg-paper`, etc.)
- **Prose content**: Skillset detail pages use `prose` class with these overrides
