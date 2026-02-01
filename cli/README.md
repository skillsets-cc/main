# Skillsets CLI

Command-line tool for discovering, installing, and contributing verified Claude Code skillsets.

## Quick Start

```bash
# Browse available skillsets
npx skillsets list

# Search by keyword
npx skillsets search "sdlc"

# Install a skillset
npx skillsets install @supercollectible/The_Skillset
```

## Commands

| Command | Purpose |
|---------|---------|
| `list` | Browse all available skillsets |
| `search <query>` | Fuzzy search by name, description, or tags |
| `install <id>` | Install skillset to current directory |
| `verify` | Verify installed skillset checksums |
| `init` | Scaffold a new skillset for contribution |
| `audit` | Validate skillset before submission |
| `submit` | Open PR to registry (requires `gh` CLI) |

## Development

```bash
npm install    # Install dependencies
npm run build  # Build TypeScript
npm test       # Run tests (43 tests)
```

## Documentation

- [CLI Style Guide](../.claude/resources/cli_styleguide.md) - Development patterns
- [CLAUDE.md](../CLAUDE.md) - Project overview
