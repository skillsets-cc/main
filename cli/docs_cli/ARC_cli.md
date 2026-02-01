# CLI Module

## Purpose
Command-line tool for discovering, installing, and contributing verified Claude Code skillsets. Provides both consumer workflow (search, install, verify) and contributor workflow (init, audit, submit).

## Architecture
```
cli/src/
├── index.ts              # Entry point, Commander.js setup
├── commands/
│   ├── list.ts           # Browse all skillsets
│   ├── search.ts         # Fuzzy search with Fuse.js
│   ├── install.ts        # degit-based installation
│   ├── verify.ts         # SHA-256 verification
│   ├── init.ts           # Scaffold new skillset
│   ├── audit.ts          # Validate before submission
│   ├── submit.ts         # PR submission via gh CLI
│   └── __tests__/        # Command tests
├── lib/
│   ├── api.ts            # CDN index fetching
│   ├── checksum.ts       # SHA-256 utilities
│   ├── filesystem.ts     # File operations
│   ├── errors.ts         # Error handling
│   ├── constants.ts      # Configuration
│   └── __tests__/        # Library tests
└── types/
    ├── index.ts          # TypeScript interfaces
    └── degit.d.ts        # degit type declarations
```

## Files

### Entry Point
| File | Purpose | Documentation |
|------|---------|---------------|
| `index.ts` | CLI entry, Commander.js command definitions | [Docs](./index.md) |

### Commands
| File | Purpose | Documentation |
|------|---------|---------------|
| `commands/list.ts` | Browse all available skillsets | [Docs](./commands/list.md) |
| `commands/search.ts` | Fuzzy search against CDN index | [Docs](./commands/search.md) |
| `commands/install.ts` | Install skillset via degit | [Docs](./commands/install.md) |
| `commands/verify.ts` | Verify checksums post-install | [Docs](./commands/verify.md) |
| `commands/init.ts` | Scaffold skillset submission | [Docs](./commands/init.md) |
| `commands/audit.ts` | Validate and generate report | [Docs](./commands/audit.md) |
| `commands/submit.ts` | Open PR via gh CLI | [Docs](./commands/submit.md) |

### Libraries
| File | Purpose | Documentation |
|------|---------|---------------|
| `lib/api.ts` | CDN search index fetching | [Docs](./lib/api.md) |
| `lib/checksum.ts` | SHA-256 computation/verification | [Docs](./lib/checksum.md) |
| `lib/filesystem.ts` | Conflict detection, backups | [Docs](./lib/filesystem.md) |
| `lib/errors.ts` | Centralized error handling | [Docs](./lib/errors.md) |
| `lib/constants.ts` | Configuration constants | [Docs](./lib/constants.md) |

### Types
| File | Purpose | Documentation |
|------|---------|---------------|
| `types/index.ts` | SearchIndex, Skillset interfaces | [Docs](./types/index.md) |

## Dependencies
- **External**: commander, fuse.js, degit, chalk, ora, js-yaml, @inquirer/prompts
- **Internal**: None (standalone module)
- **Services**: CDN (search-index.json), GitHub API (via gh CLI)

## Data Flow
```
Consumer Flow:
list/search → api.ts → CDN index → Fuse.js → Terminal output
install → degit → Extract content/ → checksum.ts → Verify

Contributor Flow:
init → Interactive prompts → Generate scaffold
audit → Validate manifest + files → Check registry (update detection) → Generate AUDIT_REPORT.md
submit → Check registry (update detection) → Validate version bump → gh CLI → Fork → Branch → PR
```

## Key Patterns
- **CDN-First**: Search index fetched from CDN, not GitHub API (avoids rate limits)
- **1-Hour Cache**: Local caching in api.ts reduces network requests
- **degit Extraction**: Subfolder extraction without .git folder
- **Checksum Verification**: SHA-256 integrity validation against registry
- **Conflict Detection**: Prevents accidental file overwrites during install

## Configuration
| Constant | Value | Purpose |
|----------|-------|---------|
| `CDN_BASE_URL` | `https://skillsets.cc` | CDN host |
| `SEARCH_INDEX_URL` | `${CDN_BASE_URL}/search-index.json` | Index endpoint |
| `REGISTRY_REPO` | `skillsets-cc/main` | GitHub repo |
| `CACHE_TTL_MS` | `3600000` (1 hour) | Index cache duration |
| `DEFAULT_SEARCH_LIMIT` | `10` | Default search results |

## Testing
```bash
npm test                              # All tests
npm test -- --coverage               # With coverage
npm test -- src/commands/__tests__/  # Command tests only
```

## Related Documentation
- [CLI Style Guide](../../.claude/resources/cli_styleguide.md)
- [CLAUDE.md](../../CLAUDE.md)
