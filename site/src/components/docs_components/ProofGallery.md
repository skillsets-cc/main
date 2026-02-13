# ProofGallery.astro

## Purpose
Displays verification proofs as a sticky horizontal badge bar at the top of skillset detail pages. Shows production links, audit report status, and schema validation with green status indicators and orange borders.

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
- Sticky at `top-[6.5rem]` with `z-50` (floats above content)
- White background to prevent content overlap
- Bottom border (orange, 2px) separates from page content

### Badge Layout
- Horizontal flex wrap with gap-2
- Each badge: white background, orange border, green status dot, mono font
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
