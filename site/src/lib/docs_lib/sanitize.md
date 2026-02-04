# sanitize.ts

## Purpose
Provides XSS protection for user-contributed markdown content (skillset READMEs) by sanitizing HTML using a whitelist-based filter. Strips dangerous tags and attributes while preserving safe markdown-generated HTML formatting.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `sanitizeHtml` | function | Sanitize HTML string using whitelist filter, return safe HTML |
| `sanitizeUrl` | function | Validate URL protocol, reject non-http(s) schemes (javascript:, data:, etc.) |

## Dependencies
- **Internal**: None (standalone library)
- **External**:
  - `xss` (js-xss library for HTML sanitization)

## Integration Points
- **Used by**:
  - `pages/skillset/[namespace]/[name].astro` (sanitize README content before rendering)
- **Consumes**: No external services
- **Emits**: No events

## Key Logic

### Whitelist Strategy
- **Headers**: h1-h6 (no attributes)
- **Text**: p, br, hr, blockquote, em, strong, del
- **Lists**: ul, ol, li
- **Links**: a (href, title, target, rel attributes only)
- **Images**: img (src, alt, title attributes only)
- **Code**: code, pre (class attribute for syntax highlighting)
- **Tables**: table, thead, tbody, tr, th, td
- **Containers**: div, span (class attribute only)

### Tag Stripping
- `stripIgnoreTag: true` - removes unwhitelisted tags, keeps content
- `stripIgnoreTagBody: ['script', 'style', 'noscript']` - removes dangerous tags AND their content

### XSS Protection
- Filters `javascript:` URLs in HTML via xss library
- Removes inline event handlers (onclick, onerror, etc.)
- Strips malicious attributes from whitelisted tags
- Prevents `<script>`, `<style>`, `<iframe>` injection

### URL Protocol Validation
The `sanitizeUrl` function provides an additional layer of protection for URLs:
- Parses URL using native `URL` constructor
- Only allows `http:` and `https:` protocols
- Rejects dangerous schemes: `javascript:`, `data:`, `vbscript:`, `file:`, etc.
- Returns `#` (safe hash link) for invalid URLs or malicious protocols
- Handles malformed URLs gracefully (returns `#` on parse error)
