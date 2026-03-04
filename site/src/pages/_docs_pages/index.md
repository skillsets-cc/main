# index.astro

## Purpose
Static homepage introducing skillsets.cc. Features a full-viewport hero with explanatory copy and a plugin marketplace UI mockup, followed by a snap-scrolled registry section with the interactive skillset grid.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| Page component | Astro page | Homepage (prerendered) |

## Dependencies
- **Internal**:
  - `@layouts/BaseLayout.astro` (base HTML structure, navigation)
  - `@components/SkillsetGrid` (interactive skillset browsing)
  - `@/lib/data` (`getSkillsets`)
- **External**: None

## Integration Points
- **Used by**: Site visitors navigating to `/`
- **Consumes**: Skillset data via `getSkillsets()` at build time
- **Emits**: No events

## Key Logic

### Layout
Two-section snap-scroll container (`snap-y snap-mandatory`, `h-screen overflow-y-auto`):
1. **Hero section** (`snap-start`, full viewport): explanatory copy + plugin marketplace UI mockup + CTA
2. **Registry section** (`snap-start`, `id="registry"`): sticky header + `SkillsetGrid`

### Hero Content
- Lead paragraph defining what a skillset is
- Supporting copy describing the registry and submission requirements
- Plugin marketplace mockup showing the `/plugin` → Marketplaces → `+ Add Marketplace` flow (not a CLI install command)
- CTA link to `/contribute` (Cohort 001)
- Animated `↓` anchor linking to `#registry`

### Registry Section
- Sticky header with "Registry" label and disclaimer text
- `SkillsetGrid` with `client:load` for interactive search/filter/sort

### Static Rendering
- `export const prerender = true` — generated at build time with skillset data
- `SkillsetGrid` hydrates on client for interactivity
