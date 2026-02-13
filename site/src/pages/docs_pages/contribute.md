# contribute.astro

## Purpose
Static page explaining the skillset submission process with step-by-step instructions, verification requirements, cohort-based slot claiming, and links to audit tools.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| Page component | Astro page | Contribution guide (prerendered) |

## Dependencies
- **Internal**:
  - `@layouts/BaseLayout.astro`
  - `@components/CopyCommand` (interactive copy button for CLI commands)
- **External**: None

## Integration Points
- **Used by**: Contributors wanting to submit skillsets
- **Consumes**: None (static content)
- **Emits**: No events

## Key Logic

### Content Sections

1. **Introduction Box**: Requirements summary
   - Production proof required
   - Clear documentation
   - Structural audit (`npx skillsets audit`)
   - Qualitative review (`/audit-skill`)

2. **Submission Process** (7 numbered steps):
   - **Step 1**: Claim a slot (cohort 001, one-week deadline)
   - **Step 2**: Initialize skillset (`npx skillsets init`)
   - **Step 3**: Develop & document in `content/`
   - **Step 4**: Run structural audit (`npx skillsets audit`)
   - **Step 5**: Run qualitative review (`/audit-skill`)
   - **Step 6**: Submit via CLI (`npx skillsets submit`)
   - **Step 7**: Maintainer review & merge

3. **Hard Constraints Table**: CI validation rules
   - Manifest schema
   - Required files
   - Content structure (both `.claude/` and `CLAUDE.md`)
   - Secrets detection
   - README links (full GitHub URLs)
   - Version bumps
   - MCP consistency (content↔manifest)

4. **Updates Section**: Instructions for updating existing skillsets
   - Version bump requirement
   - Audit detects updates
   - Submit creates "Update @author/name to vX.Y.Z" PR

5. **Footer Link**: Full contributing guide on GitHub

### Interactive Elements
- `CopyCommand` components with `client:load` for CLI command copying
- Responsive layout with overflow handling
- Orange-numbered step circles

### Static Rendering
- `export const prerender = true` - generated at build time
- No API calls or dynamic data
- Fast page load and CDN-friendly
