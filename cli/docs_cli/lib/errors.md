# errors.ts

## Purpose
Centralized error handling utilities for CLI commands — safe message extraction from unknown thrown values and fatal error display with process exit.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `getErrorMessage` | function | Safely extract a string message from any thrown value (`unknown` → `string`) |
| `handleError` | function | Print error in red and exit process with code 1 (`unknown` → `never`) |

## Dependencies
- Internal: None
- External: `chalk`

## Integration Points
- Used by: `index.ts` (all command catch blocks), `lib/validate-deps`, `lib/validate-mcp`
- Emits/Consumes: None
