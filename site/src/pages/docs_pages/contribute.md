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
- Numbered submission process (1-6 steps)
- Requirements: production proof, audit report, skillset.yaml, MCP transparency
- Audit validates manifest schema, required files, content structure, secrets, MCP server declarations
- MCP transparency: if skillset uses MCP servers, they must be declared in manifest with reputation info
- Instructions for running audit skill and submitting PR
- Prerendered static content
