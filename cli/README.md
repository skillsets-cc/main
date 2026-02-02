# Skillsets CLI

Command-line tool for discovering, installing, and contributing verified Claude Code skillsets.

## Quick Start

```bash
# Browse available skillsets
npx skillsets list

# Sort by popularity
npx skillsets list --sort downloads

# Search by keyword
npx skillsets search "sdlc"

# Install a skillset
npx skillsets install @supercollectible/The_Skillset
```

## Commands

| Command | Purpose |
|---------|---------|
| `list` | Browse all skillsets with live star/download counts |
| `search <query>` | Fuzzy search by name, description, or tags |
| `install <id>` | Install skillset to current directory |
| `verify` | Verify installed skillset checksums |
| `init` | Scaffold a new skillset for contribution |
| `audit` | Validate skillset before submission |
| `submit` | Open PR to registry (requires `gh` CLI) |

## Options

### list
- `-l, --limit <n>` - Limit number of results
- `-s, --sort <field>` - Sort by: `name`, `stars`, `downloads`
- `--json` - Output as JSON

### search
- `-t, --tags <tags...>` - Filter by tags
- `-l, --limit <n>` - Limit results (default: 10)

### install
- `-f, --force` - Overwrite existing files
- `-b, --backup` - Backup existing files before install

## Live Stats

The CLI fetches live star and download counts from the API, so you always see current numbers (not stale build-time data).

## Development

```bash
npm install    # Install dependencies
npm run build  # Build TypeScript
npm test       # Run tests (43 tests)
```

## Documentation

- [CLI Style Guide](../.claude/resources/cli_styleguide.md) - Development patterns
- [CLAUDE.md](../CLAUDE.md) - Project overview
