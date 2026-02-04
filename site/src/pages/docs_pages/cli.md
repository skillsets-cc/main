# cli.astro

## Purpose
Static CLI documentation page with command reference, examples, and usage instructions for the `npx skillsets` tool.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| Page component | Astro page | CLI reference (prerendered) |

## Dependencies
- **Internal**: `@layouts/BaseLayout.astro`
- **External**: None

## Integration Points
- **Used by**: Users learning CLI commands
- **Consumes**: None (static content)
- **Emits**: No events

## Key Logic
- Quick start section with common commands
- Detailed command reference (list, search, install)
- Code examples with syntax highlighting
- Prerendered static content
