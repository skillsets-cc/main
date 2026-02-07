# skillset/[namespace]/[name].astro

## Purpose
Dynamic skillset detail page displaying full information about a specific skillset including README content, verification proofs, metadata, and interactive star/download counts. Fetches README from GitHub at request time.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| Page component | Astro page | Skillset detail page (SSR) |

## Dependencies
- **Internal**:
  - `@layouts/BaseLayout.astro` (base layout)
  - `@components/StarButton`, `DownloadCount`, `CopyCommand`, `ProofGallery` (interactive components)
  - `@/lib/data` (getSkillsetById)
  - `@/lib/sanitize` (sanitizeHtml for XSS protection)
- **External**:
  - `marked` (markdown to HTML conversion)
  - `marked-gfm-heading-id` (GitHub-flavored heading IDs)

## Integration Points
- **Used by**: Site visitors navigating to `/skillset/{namespace}/{name}`
- **Consumes**:
  - `search-index.json` (skillset metadata via getSkillsetById)
  - GitHub raw content API (fetch README.md at runtime)
- **Emits**: No events

## Key Logic

### URL Parameters
- `namespace`: Author namespace (e.g., "@supercollectible")
- `name`: Skillset name (e.g., "Valence")
- Combined as `skillsetId` for lookups

### Data Loading
1. Extract namespace and name from URL params
2. Look up skillset in search index via `getSkillsetById()`
3. If not found, redirect to `/404`
4. Fetch README.md from GitHub raw content URL at runtime
5. Parse markdown to HTML with marked + GFM heading IDs
6. Sanitize HTML to prevent XSS attacks
7. Strip first H1 from README (page already shows title)

### Fallback Strategy
- README fetch success: display parsed/sanitized markdown
- README fetch failure: display skillset description as markdown

### Status Indicator
- Maps status to color: active (green), deprecated (yellow), archived (gray)
- Displayed as colored dot with status text

### Components
- **StarButton**: Interactive star toggle with live count
- **DownloadCount**: Live download count from API
- **CopyCommand**: Install command with copy button
- **ProofGallery**: Verification section with production links and audit report
- **MCP Section**: Displayed when skillset has `mcp_servers`. Shows native (Claude Code managed) and Docker hosted servers with reputation info, researched_at dates, and runtime caveat warning

### Security
- XSS protection via `sanitizeHtml()` on user-contributed README content
- Whitelist-based HTML filtering (see lib/sanitize.ts)

### SSR vs Static
- Not prerendered (no `export const prerender = true`)
- Rendered on-demand per request (SSR)
- Allows runtime README fetching from GitHub
- Can be cached by Cloudflare Workers
