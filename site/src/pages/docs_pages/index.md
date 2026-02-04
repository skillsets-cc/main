# index.astro

## Purpose
Static homepage displaying a dictionary-style definition of "skillset" with centered typography and a link to the browse page. Minimal, typography-focused design with no dynamic content.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| Page component | Astro page | Static homepage (prerendered) |

## Dependencies
- **Internal**:
  - `@layouts/BaseLayout.astro` (base HTML structure, navigation)
- **External**: None

## Integration Points
- **Used by**: Site visitors navigating to `/`
- **Consumes**: None (static content)
- **Emits**: No events

## Key Logic

### Content Structure
- **Word**: "Skillset" in large serif font (7xl/9xl)
- **Pronunciation**: `/ˈskɪlˌsɛt/` in monospace with "noun" label
- **Definition**: Single-sentence explanation of skillsets in the Claude Code ecosystem
- **Action**: Link to `/browse` page

### Visual Design
- Full-screen centered layout with vertical centering
- Orange accent bar on definition block (4px left border)
- Large typography with serif headings and responsive font sizes
- Stone-50 background (consistent with site theme)

### Static Rendering
- `export const prerender = true` - generated at build time
- No client-side JavaScript
- No API calls or dynamic data
- Fast page load and CDN-friendly
