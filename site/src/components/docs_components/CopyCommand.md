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
  - `react` (`useState`, `useEffect`, `useRef`)
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
- Uses `useRef` to track the timeout ID, preventing duplicate timers on rapid clicks
- Timeout cleared on unmount via `useEffect` cleanup to avoid state updates on unmounted component

### UI Layout
- **Section mode**: `bg-surface-paper` with `border-border-ink`; uppercase mono heading; dark code block (`bg-[#0a0a0a]`); footer with CLI link and optional disclaimer
- **Inline mode**: Dark code block (`bg-[#0a0a0a] border border-accent/20`) only
