# Handoff: Implement XSS Sanitization with js-xss

## Context

Security review identified a stored XSS vulnerability in the skillset detail page. README content is fetched from GitHub and rendered via `marked.parse()` + Astro's `set:html` without sanitization.

The previous solution (`isomorphic-dompurify`) was removed because it doesn't work in Cloudflare Workers + KV combo - the Worker environment lacks DOM APIs.

## Decision

Use the `xss` npm package (js-xss) instead. Research confirmed:

- **No `process` dependency** (unlike `sanitize-html`)
- **No DOM dependency** (unlike DOMPurify)
- **Explicit Web Worker support** via `DedicatedWorkerGlobalScope` detection
- **Pure string-based parsing** - no browser APIs
- **`cssfilter` dependency** also has no problematic dependencies

Source verification:
- https://github.com/leizongmin/js-xss - Pure JS, Web Worker compatible
- Issue #124 resolved in v1.0.1 - Web Worker support confirmed
- Package source inspected: no `process`, `window`, or `document` requirements

## Implementation Plan

1. Install the package:
   ```bash
   cd site && npm install xss
   ```

2. Create `site/src/lib/sanitize.ts`:
   ```typescript
   import xss, { FilterXSS } from 'xss';

   // Whitelist for markdown-generated HTML
   const filter = new FilterXSS({
     whiteList: {
       h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
       p: [], br: [], hr: [],
       ul: [], ol: [], li: [],
       a: ['href', 'title', 'target', 'rel'],
       img: ['src', 'alt', 'title'],
       code: ['class'], pre: ['class'],
       blockquote: [], em: [], strong: [], del: [],
       table: [], thead: [], tbody: [], tr: [], th: [], td: [],
       div: ['class'], span: ['class'],
     },
     stripIgnoreTag: true,
     stripIgnoreTagBody: ['script', 'style', 'noscript'],
   });

   export function sanitizeHtml(html: string): string {
     return filter.process(html);
   }
   ```

3. Update `site/src/pages/skillset/[namespace]/[name].astro` to use it:
   ```typescript
   import { sanitizeHtml } from '@/lib/sanitize';
   // ...
   readmeHtml = sanitizeHtml(await marked.parse(readmeContent));
   ```

4. Add tests in `site/src/lib/__tests__/sanitize.test.ts`

## Risk Assessment

The XSS vulnerability has limited blast radius:
- Only affects the attacker's own skillset page (can't modify others' pages)
- Content must pass PR review to get into the repo
- HttpOnly cookies prevent direct session theft
- Main risk is credential phishing via fake auth modals or modified install commands

## Files to Modify

- `site/package.json` - add `xss` dependency
- `site/src/lib/sanitize.ts` - create new sanitization module
- `site/src/pages/skillset/[namespace]/[name].astro` - integrate sanitization
- `site/src/lib/__tests__/sanitize.test.ts` - add tests

## Last Commit

```
1d3f4d1 Refactor API responses, add test coverage, remove broken sanitization
```

This commit removed the broken `isomorphic-dompurify` implementation and noted that XSS mitigation would be re-added using a Workers-compatible library.
