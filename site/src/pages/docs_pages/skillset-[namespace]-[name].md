# skillset/[namespace]/[name].astro

## Purpose
Dynamic skillset detail page displaying full information about a specific skillset including README content, verification proofs, metadata, MCP servers, compatibility info, and interactive star/download counts. Fetches README from GitHub at request time.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| Page component | Astro page | Skillset detail page (SSR) |

## Dependencies
- **Internal**:
  - `@layouts/BaseLayout.astro` (base layout)
  - `@components/StarButton`, `DownloadCount`, `CopyCommand` (interactive components)
  - `@components/ProofGallery.astro`, `MediaGallery.astro` (content sections)
  - `@/lib/data` (`getSkillsetById`)
  - `@/lib/sanitize` (`sanitizeHtml`, `sanitizeUrl` for XSS protection)
- **External**:
  - `marked` (markdown to HTML conversion)
  - `marked-gfm-heading-id` (GitHub-flavored heading IDs)

## Integration Points
- **Used by**: Site visitors navigating to `/skillset/{namespace}/{name}`
- **Consumes**:
  - `search-index.json` (skillset metadata via `getSkillsetById`)
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
3. If not found or params missing, redirect to `/404`
4. Sanitize author URL with protocol allowlist
5. Fetch README.md from GitHub raw content URL at runtime
6. Parse markdown to HTML with marked + GFM heading IDs
7. Sanitize HTML to prevent XSS attacks
8. Strip first H1 from README (page already shows title in header)

### Fallback Strategy
- README fetch success: display parsed/sanitized markdown
- README fetch failure (404 or network error): display skillset description as markdown

### Status Indicator
- Maps status to color: `active` (green), `deprecated` (yellow), `archived` (gray)
- Displayed as colored dot with status text in header

### Page Sections

1. **Sticky Header**: Title, author link, star/download counts, version, status
2. **Metadata**: Description, tags
3. **Install Section**: CLI command with copy button and disclaimer
4. **ProofGallery**: Production links and audit report (if available)
5. **README Section**: Rendered markdown content from GitHub
6. **MCP Servers Section** (conditional): Displayed when `skillset.mcp_servers` exists
   - Native MCP servers (stdio/http): command, args/url, reputation, researched_at
   - Docker MCP servers: image, reputation, researched_at, server names
   - Runtime caveat warning
7. **Compatibility Section**: Claude Code version, supported languages
8. **MediaGallery** (conditional): Displayed when `skillset.context_image_url` exists
9. **Footer**: Back link to homepage

### Security
- XSS protection via `sanitizeHtml()` on user-contributed README content
- URL sanitization via `sanitizeUrl()` on author URLs (protocol allowlist)
- Whitelist-based HTML filtering (see `lib/sanitize.ts`)

### Client-Side Rendering
- **Interactive Components**: `StarButton`, `DownloadCount`, `CopyCommand` with `client:load`

### SSR vs Static
- Not prerendered (no `export const prerender = true`)
- Rendered on-demand per request (SSR)
- Allows runtime README fetching from GitHub
- Can be cached by Cloudflare Workers
