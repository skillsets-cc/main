# contribute.astro

## Purpose
Static page explaining the skillset submission process with step-by-step instructions, verification requirements, and links to audit tools.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| Page component | Astro page | Contribution guide (prerendered) |

## Dependencies
- **Internal**: `@layouts/BaseLayout.astro`
- **External**: None

## Integration Points
- **Used by**: Contributors wanting to submit skillsets
- **Consumes**: None (static content)
- **Emits**: No events

## Key Logic
- Numbered submission process (1-4 steps)
- Requirements: production proof, audit report, skillset.yaml
- Instructions for running audit skill and submitting PR
- Prerendered static content
