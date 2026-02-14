# errors.ts

## Overview
**Purpose**: Centralized error handling for CLI commands

## Dependencies
- External: `chalk`
- Internal: None

## Key Components

### Functions
| Function | Purpose | Inputs → Output |
|----------|---------|-----------------|
| `handleError` | Format and exit on error | `unknown` → `never` |

## Data Flow
```
handleError(error) → Format message → console.error() → process.exit(1)
```

## Integration Points
- Called by: `index.ts` (all command catch blocks)
- Calls: None

## Error Handling
- `Error` instance: Prints `Error: ${message}`
- Other types: Prints raw value with "Unexpected error:"

## Testing
- Test file: `tests_lib/errors.test.ts`
- Key tests: Error instance handling, unknown error handling, process exit
