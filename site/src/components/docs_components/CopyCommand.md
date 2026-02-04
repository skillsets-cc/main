# CopyCommand.tsx

## Purpose
Displays an install command in a code block with a copy-to-clipboard button. Shows temporary success feedback ("Copied!") when clicked. Includes disclaimer about OSS security responsibility and link to CLI documentation.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `CopyCommand` (default) | component | React component with code block and copy button |
| `CopyCommandProps` | interface | Props: command string to display and copy |

## Dependencies
- **Internal**: None
- **External**:
  - `react` (useState)
  - Navigator Clipboard API (navigator.clipboard.writeText)

## Integration Points
- **Used by**:
  - `pages/skillset/[namespace]/[name].astro` (display install command on skillset detail page)
- **Consumes**: No external services
- **Emits**: No events

## Key Logic

### Clipboard API
- Uses `navigator.clipboard.writeText()` (modern browsers)
- No fallback for older browsers (silent failure with console error)
- Async operation with error handling

### Copy Feedback
- Button text: "Copy" → "✓ Copied!" → "Copy" (after 2s)
- Uses `setTimeout` to reset state
- No animation (instant text change)

### UI Layout
- **Section**: Border, light background, padding
- **Header**: "INSTALL" in uppercase, monospace, bordered bottom
- **Code Block**: White background, border, pre/code elements
- **Copy Button**: Orange text, right-aligned, hover underline
- **Footer Links**: Link to /cli page, security disclaimer in italic serif

### Security Disclaimer
"Submissions are reviewed on a best-effort basis with no security guarantees. You are the final quality gate, as with any OSS."
