# about.astro

## Purpose
Static informational page explaining the purpose and philosophy of skillsets.cc. Describes the problem (atomic skills vs. integrated workflows) and the solution (production-verified skillset collections).

## Public API
| Export | Type | Description |
|--------|------|-------------|
| Page component | Astro page | About page (prerendered) |

## Dependencies
- **Internal**: `@layouts/BaseLayout.astro`
- **External**: None

## Integration Points
- **Used by**: Site visitors navigating to `/about`
- **Consumes**: None (static content)
- **Emits**: No events

## Key Logic
- Static markdown-style content with sections
- Explains problem: atomic skills conflict in production
- Explains solution: verified, integrated skillset workflows
- Prerendered at build time for fast loading
