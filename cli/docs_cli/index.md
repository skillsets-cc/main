# index.ts

## Purpose
CLI entry point. Registers all commands with Commander.js and wraps every async action in unified error handling via the `run()` helper.

## Public API
| Export | Type | Description |
|--------|------|-------------|
| `run` | function | Wraps an async command handler with `handleError` on rejection |

## Dependencies
- Internal: `commands/search`, `commands/list`, `commands/view`, `commands/install`, `commands/init`, `commands/audit`, `commands/submit`, `lib/errors`
- External: `commander`

## Integration Points
- Used by: Shell (`npx skillsets` / `npm exec skillsets`)
- Calls: All command handlers

## Key Logic

### Commands registered

| Command | Handler | Arguments | Options |
|---------|---------|-----------|---------|
| `list` | `list()` | — | `--limit`, `--sort`, `--json` |
| `search` | `search()` | `<query>` | `--tags`, `--limit` |
| `view` | `view()` | `<skillsetId>` | — |
| `install` | `install()` | `<skillsetId>` | `--force`, `--backup`, `--accept-mcp`, `--accept-deps` |
| `init` | `init()` | — | `--yes`, `--name`, `--description`, `--handle`, `--author-url`, `--production-url`, `--tags` |
| `audit` | `audit()` | — | `--check` |
| `submit` | `submit()` | — | — |

### Error handling
All command actions are wrapped with `run()`, which calls `.catch(handleError)`. This ensures consistent error output regardless of which command fails.
