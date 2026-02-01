# index.ts

## Overview
**Purpose**: CLI entry point defining all commands via Commander.js

## Dependencies
- External: `commander`
- Internal: `commands/*`, `lib/errors`

## Key Components

### Commands
| Command | Handler | Arguments | Options |
|---------|---------|-----------|---------|
| `list` | `list()` | - | `--limit`, `--sort`, `--json` |
| `search` | `search()` | `<query>` | `--tags`, `--limit` |
| `install` | `install()` | `<skillsetId>` | `--force`, `--backup` |
| `verify` | `verify()` | - | `--dir` |
| `init` | `init()` | - | `--yes` |
| `audit` | `audit()` | - | - |
| `submit` | `submit()` | - | - |

## Data Flow
```
npx skillsets <command> [args] [options]
    │
    ▼
Commander.js parses args
    │
    ▼
Calls appropriate handler
    │
    ▼
handleError() on failure
```

## Integration Points
- Called by: Shell (npx/npm)
- Calls: All command handlers

## Error Handling
- All commands wrapped in try/catch
- Errors passed to `handleError()` for consistent output

## Testing
- Test file: N/A (integration tested via command tests)
