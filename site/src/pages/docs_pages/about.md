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
- Static prose content explaining the platform's purpose:
  - Problem: No high-signal channel for production-verified Claude Code workflows
  - Solution: Curated registry of complete, integrated skillsets
  - Submission model: Batched review by small team (quality over scale)
  - Open source: MIT-licensed infrastructure, author-licensed skillsets
  - Co-maintainer invitation for community growth
- Prerendered at build time for fast loading
