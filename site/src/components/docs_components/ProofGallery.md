# ProofGallery

## Purpose
Displays verification proofs for a skillset including production URLs, audit report status, and schema validation. Uses a vertical timeline layout with orange accent bars and links to external evidence.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `ProofGallery` (default) | component | Astro component rendering verification proofs section |
| `Props` | interface | Props: productionLinks array, hasAuditReport boolean, skillsetId string |
| `ProductionLink` | interface | Shape: { url: string, label?: string } |

## Dependencies
- **Internal**: None
- **External**: None

## Integration Points
- **Used by**:
  - `pages/skillset/[namespace]/[name].astro` (display verification section on detail page)
- **Consumes**: Skillset verification metadata from YAML
- **Emits**: No events (static component)

## Key Logic

### Production Links
- Accepts array of production URLs with optional labels
- Falls back to extracting base domain from URL if no label provided
- Each link opens in new tab (`target="_blank"`, `rel="noopener noreferrer"`)
- Displays as vertical list of orange links

### Audit Report Link
- Conditionally rendered if `hasAuditReport === true`
- Constructs GitHub URL to view AUDIT_REPORT.md in mono-repo
- URL encoding: `@` in namespace → `%40` (e.g., `@user/name` → `%40user/name`)
- Links to main branch on GitHub

### Schema Validation
- Always displayed (static, not conditional)
- Indicates that skillset passed JSON Schema validation
- No link or additional details

### Visual Layout
- Timeline-style with vertical orange bars (w-1, min-h-[40px], bg-orange-500)
- Three sections: Production Verified, Audit Complete (conditional), Schema Valid
- Each section has: title (serif, bold), description (serif, secondary text), link(s) (mono, orange)
- Consistent spacing with gap-4 and space-y-4

### Domain Extraction
- `getBaseDomain(url)`: parses URL and returns hostname
- Error handling: returns original string if URL parsing fails
- Used as fallback display text when `link.label` is undefined
