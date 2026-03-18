# index.ts

## Purpose
CLI entry point. Registers all commands with Commander.js and wraps every async action in unified error handling via the `run()` helper.

## Public API
No exports. This is the CLI entry point, not an importable module.

Internal helpers:
- `run<T>` — wraps an async command handler with `.catch(handleError)` for unified error reporting

## Dependencies
- Internal: `commands/install`, `commands/init`, `commands/audit`, `commands/submit`, `lib/errors`
- External: `commander`

## Integration Points
- Used by: Shell (`npx skillsets` / `npm exec skillsets`)
- Calls: All command handlers

## Key Logic

### Commands registered

| Command | Handler | Arguments | Options |
|---------|---------|-----------|---------|
| `install` | `install()` | `<skillsetId>` | `--force`, `--backup`, `--accept-mcp`, `--accept-deps` |
| `init` | `init()` | — | `--yes`, `--name`, `--description`, `--handle`, `--author-url`, `--production-url`, `--tags` |
| `audit` | `audit()` | — | `--check` |
| `submit` | `submit()` | — | — |

### Error handling
All command actions are wrapped with `run()`, which calls `.catch(handleError)`. This ensures consistent error output regardless of which command fails.
