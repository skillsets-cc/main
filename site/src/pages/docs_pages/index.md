# index.astro

## Purpose
Static homepage displaying an introduction to skillsets with integrated browse functionality. Features explanatory paragraphs, CLI installation instructions, and an embedded skillset grid for immediate browsing.

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
- **Consumes**: Skillset data via `getSkillsets()`
- **Emits**: No events

## Key Logic

### Content Structure
- **Intro Section**: 5 paragraphs explaining:
  - What a skillset is (integrated Claude Code workflow)
  - What skillsets.cc is (community registry)
  - Submission requirements (production-verified, author-maintained)
  - CLI installation command
  - Call-to-action for contributors (Cohort 001)
- **Registry Header**: Sticky section with "Registry" label and disclaimer
- **Skillset Grid**: Interactive component with search, filtering, and sorting

### Data Loading
- Calls `getSkillsets()` at build time to load all skillsets
- Passes skillsets to `SkillsetGrid` component

### Visual Design
- Max-width container (7xl) with responsive padding
- Large serif typography (lg/xl) for intro text
- Orange accent links for /about and /contribute
- Sticky registry header with orange bottom border
- Embedded SkillsetGrid with `client:load` for interactivity

### Static Rendering
- `export const prerender = true` - generated at build time with data
- SkillsetGrid hydrates on client for interactive features
- Fast initial page load with static HTML
