# privacy.astro

## Purpose
Privacy policy page at `/privacy`. Discloses data collection, cookie usage, retention, and user rights under GDPR. Includes an interactive data controls section (export / delete) rendered as a client-side island for authenticated users.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| (default page) | Astro SSR route | Served at `/privacy` |

## Dependencies
- **Internal**:
  - `@layouts/BaseLayout.astro` (page shell, sidebar nav)
  - `@/components/DataControls.tsx` (GDPR data export/delete island)
- **External**: None

## Integration Points
- **Route**: `/privacy` — linked from sidebar nav in `BaseLayout.astro`
- **Consumes**: `DataControls` island (`client:load`) for authenticated data actions

## Key Logic
Mostly static HTML content. The `<DataControls client:load />` island hydrates on the client and shows or hides itself based on auth state — the page does not need to handle auth server-side. No `export const prerender = true`; renders on-demand as part of the SSR worker.

The page covers several GDPR-mandated disclosures added in the security hardening pass:
- **IP hashing**: Download rate-limit data stored as SHA-256 hash, not raw IP. Disclosed under GDPR Art. 6(1)(f) legitimate interest.
- **Retention schedule**: IP rate-limit data (3 months), daily action counters (25 hours), download nonces (10 minutes).
- **Suspension flags**: Retained post-account-deletion under GDPR Art. 17(3) to prevent abuse cycling; contain only user ID + boolean.
- **GDPR rights**: Data portability via `DataControls` (JSON export per Art. 20); right to lodge complaint with supervisory authority.
