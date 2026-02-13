# CopyCommand.tsx

## Purpose
Displays a command in a code block with a copy-to-clipboard button. Supports two layouts: standalone inline code block or full section with heading and optional disclaimer. Shows temporary success feedback ("Copied!") when clicked.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `CopyCommand` (default) | component | React component with code block and copy button. Props: `command` (string), `heading?` (string), `disclaimer?` (string) |

## Dependencies
- **Internal**: None
- **External**:
  - `react` (`useState`)
  - Navigator Clipboard API (`navigator.clipboard.writeText`)

## Integration Points
- **Used by**: Skillset detail pages and CLI documentation
- **Consumes**: No external services
- **Emits**: No events

## Key Logic

### Conditional Rendering
- **Inline mode** (no `heading`): Renders only the code block with copy button
- **Section mode** (with `heading`): Wraps code block in a bordered section with header, footer link to `/cli`, and optional disclaimer

### Clipboard API
- Uses `navigator.clipboard.writeText()` (modern browsers)
- No fallback for older browsers (silent failure with console error)
- Async operation with error handling

### Copy Feedback
- Button text: "Copy" → "✓ Copied!" → "Copy" (after 2s)
- Uses `setTimeout` to reset state
- No animation (instant text change)

### UI Layout
- **Section mode**: Stone-50 background, border, padding; uppercase mono heading with border-bottom; white code block; footer with CLI link and optional disclaimer
- **Inline mode**: White code block with border only
