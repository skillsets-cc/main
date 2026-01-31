# Skillsets CLI

Command-line tool for discovering and installing verified Claude Code skillsets from [skillsets.cc](https://skillsets.cc).

## Installation

```bash
npx skillsets <command>
```

Or install globally:

```bash
npm install -g skillsets
```

## Usage

### Search for Skillsets

```bash
# Basic search
npx skillsets search "sdlc"

# Filter by tags
npx skillsets search "workflow" --tags planning testing

# Limit results
npx skillsets search "agent" --limit 5
```

### Install a Skillset

```bash
# Install to current directory
npx skillsets install @supercollectible/The_Skillset

# Overwrite existing files
npx skillsets install @supercollectible/The_Skillset --force

# Backup existing files first
npx skillsets install @supercollectible/The_Skillset --backup
```

### Verify Installation

```bash
# Verify current directory
npx skillsets verify

# Verify specific directory
npx skillsets verify --dir /path/to/project
```

## How It Works

1. **Search**: Fetches a CDN-hosted search index (updated on registry changes)
2. **Install**: Uses degit to extract skillset content from GitHub (no .git folder)
3. **Verify**: Computes SHA-256 checksums and compares against registry

## Architecture

- **Zero runtime GitHub API calls**: All discovery via build-time CDN index
- **1-hour local cache**: Reduces network requests for search
- **Conflict detection**: Prevents accidental overwrites
- **Checksum verification**: Ensures file integrity after installation

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
npm run dev -- search "test"

# Type check
npm run typecheck

# Run tests
npm test
```

## File Structure

```
cli/
├── src/
│   ├── commands/
│   │   ├── search.ts        # Fuzzy search with Fuse.js
│   │   ├── install.ts       # degit-based installation
│   │   └── verify.ts        # SHA-256 checksum verification
│   ├── lib/
│   │   ├── api.ts           # CDN index fetching
│   │   ├── checksum.ts      # SHA-256 utilities
│   │   ├── filesystem.ts    # File operations
│   │   ├── errors.ts        # Error handling
│   │   └── constants.ts     # Configuration constants
│   ├── types/
│   │   └── index.ts         # TypeScript types
│   └── index.ts             # CLI entry point
└── package.json
```

## License

MIT
