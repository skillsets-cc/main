# cli.astro

## Purpose
Static CLI documentation page with comprehensive command reference, examples, and usage instructions for the `npx skillsets` tool. Covers discovery, installation, and contribution workflows.

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

### Content Sections

1. **Quick Start**: Common command summary
   - `list`: Browse all skillsets
   - `search`: Find by keyword
   - `view`: Read README in terminal
   - `install`: Install to current directory

2. **Discovery Commands**:
   - `list`: Browse with sort/limit/JSON output options
   - `search`: Fuzzy search with tag filtering
   - `view`: Display README in terminal before installing

3. **Installation Commands**:
   - `install`: Install with checksum verification
   - Flags: `--force` (overwrite), `--backup` (backup first)

4. **Contribution Commands**:
   - `init`: Scaffold new skillset submission
   - `audit`: Validate structure and generate report
   - `submit`: Open PR via GitHub CLI

5. **Footer**: Link to CLI source on GitHub

### Visual Design
- Border sections with stone-50 backgrounds for code blocks
- Monospace for commands, serif for descriptions
- Orange highlights for command names
- Responsive layout with overflow handling

### Static Rendering
- `export const prerender = true` - generated at build time
- No client-side JavaScript
- Fast page load and CDN-friendly
