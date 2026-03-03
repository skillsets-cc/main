# ProofGallery.astro

## Purpose
Displays verification proofs as a sticky horizontal badge bar at the top of skillset detail pages. Shows production links, audit report status, and schema validation with green status indicators and accent-colored borders.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `ProofGallery` | Astro component | Sticky verification badge bar |

### Props
| Prop | Type | Description |
|------|------|-------------|
| `productionLinks` | `ProductionLink[]` | Array of production URLs |
| `hasAuditReport` | boolean | Whether AUDIT_REPORT.md exists |
| `skillsetId` | string | Skillset ID for GitHub link construction |

### ProductionLink Interface
| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Production URL (sanitized via `sanitizeUrl`) |
| `label` | string? | Optional label (defaults to hostname) |

## Dependencies
- **Internal**: `@/lib/sanitize` (`sanitizeUrl`)
- **External**: None

## Integration Points
- Used by: Skillset detail pages
- Consumes: Skillset verification metadata from YAML

## Key Logic

### Sticky Positioning
- Sticky with `z-50`, top position computed via CSS variables: `calc(var(--header-h, 3rem) + var(--vv-offset, 0px))`
- Dark background (`bg-[#020202]`) to prevent content bleed-through
- Bottom border (`border-accent/20`) separates from page content

### Badge Layout
- Horizontal flex wrap with gap-2
- Each badge: dark background (`bg-[#020202]`), accent border, green status dot (`bg-status-success`), mono font
- "shipped" and " complete" text uses `.proof-qualifier` CSS class
- Opens links in new tab with `noopener noreferrer`

### Production Links
- Accepts array of production URLs with optional labels
- Falls back to `getBaseDomain(url)` (hostname extraction) if no label
- All URLs sanitized via `sanitizeUrl` (http/https allowlist)
- Badge text: "shipped {label}"

### Audit Report Badge
- Conditionally rendered if `hasAuditReport === true`
- Constructs GitHub URL: `https://github.com/skillsets-cc/main/blob/main/skillsets/{encodedId}/AUDIT_REPORT.md`
- URL encoding: `@` → `%40` in skillsetId
- Badge text: "audit complete"

### Schema Validation Badge
- Always displayed (static span, not a link)
- Badge text: "schema valid"

### Domain Extraction
- `getBaseDomain(url)`: parses URL with `new URL()` and returns hostname
- Error handling: returns original string if parsing fails
