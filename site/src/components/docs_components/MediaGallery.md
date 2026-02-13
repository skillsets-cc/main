# MediaGallery.astro

## Purpose
Astro component that renders a gallery of images with optional labels. Designed for displaying "Cold Start Spend" context usage breakdowns on skillset pages. Only renders if items array is non-empty.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `MediaGallery` | Astro component | Gallery section with image list |

### Props
| Prop | Type | Description |
|------|------|-------------|
| `items` | `MediaItem[]` | Array of images to display |

### MediaItem Interface
| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Image URL (sanitized via `sanitizeUrl`) |
| `alt` | string? | Alt text (defaults to "Context usage breakdown") |
| `label` | string? | Optional caption displayed above image |

## Dependencies
- **Internal**: `@/lib/sanitize` (`sanitizeUrl`)
- **External**: None

## Integration Points
- Used by: Skillset detail pages rendering media galleries
- Consumes: No external services

## Key Logic
- Conditional rendering: Only renders `<section>` if `items.length > 0`
- URL sanitization: All image URLs passed through `sanitizeUrl` (http/https allowlist)
- Lazy loading: Images use `loading="lazy"` attribute
- Privacy: Uses `referrerpolicy="no-referrer"` to prevent referer leakage
- Hardcoded heading: "Cold Start Spend" (specific to skillset context usage)
