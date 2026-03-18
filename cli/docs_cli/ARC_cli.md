# CLI Module

## Purpose
Command-line tool for installing and contributing verified Claude Code skillsets. Provides both consumer workflow (install) and contributor workflow (init, audit, submit).

## Architecture
```
cli/src/
├── index.ts              # Entry point, Commander.js setup
├── commands/
│   ├── install.ts        # degit + checksum verification
│   ├── init.ts           # Scaffold new skillset
│   ├── audit.ts          # Validate before submission
│   ├── audit-report.ts   # Audit report generation
│   ├── submit.ts         # PR submission via gh CLI
│   └── tests_commands/   # Command tests
├── lib/
│   ├── api.ts            # CDN index fetching
│   ├── checksum.ts       # SHA-256 utilities
│   ├── filesystem.ts     # File operations
│   ├── errors.ts         # Error handling
│   ├── constants.ts      # Configuration
│   ├── templates.ts      # Scaffold templates
│   ├── validate-deps.ts  # Runtime dependency validation
│   ├── validate-mcp.ts   # MCP server validation
│   ├── versions.ts       # Semver comparison
│   └── tests_lib/        # Library tests
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
| `commands/install.ts` | Install skillset via degit + MCP/deps warnings + verify checksums | [Docs](./commands/install.md) |
| `commands/init.ts` | Scaffold skillset submission with QUICKSTART_<NAME>.md | [Docs](./commands/init.md) |
| `commands/audit.ts` | Validate + MCP check + runtime deps check + generate report | [Docs](./commands/audit.md) |
| `commands/audit-report.ts` | Audit report types and markdown generation | [Docs](./commands/audit-report.md) |
| `commands/submit.ts` | Open PR via gh CLI | [Docs](./commands/submit.md) |

### Libraries
| File | Purpose | Documentation |
|------|---------|---------------|
| `lib/api.ts` | CDN search index fetching | [Docs](./lib/api.md) |
| `lib/checksum.ts` | SHA-256 computation/verification | [Docs](./lib/checksum.md) |
| `lib/filesystem.ts` | Conflict detection, backups | [Docs](./lib/filesystem.md) |
| `lib/errors.ts` | Centralized error handling | [Docs](./lib/errors.md) |
| `lib/constants.ts` | Configuration constants | [Docs](./lib/constants.md) |
| `lib/templates.ts` | Scaffold templates for init command | [Docs](./lib/templates.md) |
| `lib/validate-deps.ts` | Runtime dependency bidirectional validation | [Docs](./lib/validate-deps.md) |
| `lib/validate-mcp.ts` | MCP server bidirectional validation | [Docs](./lib/validate-mcp.md) |
| `lib/versions.ts` | Semver comparison for updates | [Docs](./lib/versions.md) |

### Types
| File | Purpose | Documentation |
|------|---------|---------------|
| `types/index.ts` | SearchIndex, Skillset interfaces | [Docs](./types/index.md) |
| `types/degit.d.ts` | TypeScript declarations for degit package | [Docs](./types/degit.d.md) |

## Dependencies
- **External**: commander, degit, chalk, ora, js-yaml, @inquirer/prompts
- **Internal**: None (standalone module)
- **Services**: CDN (search-index.json), GitHub API (via gh CLI)

## Data Flow
```
Consumer Flow:
install → api.ts → CDN index → Fetch metadata → MCP warning (if any) → Runtime deps warning (if any) → Request nonce (downloads/start) → degit → Extract content/ → checksum.ts → Verify → Complete download (downloads/complete)

Contributor Flow:
init → Interactive prompts → Generate scaffold (skillset.yaml, README_<NAME>.md, QUICKSTART_<NAME>.md, INSTALL_NOTES_<NAME>.md) → Install audit-skill
audit → Validate manifest + files → MCP validation → Runtime deps validation → Check registry (update detection) → audit-report.ts → Generate AUDIT_REPORT.md
submit → Check registry (update detection) → Validate version bump → gh CLI → Fork → Branch → PR
```

## Key Patterns
- **CDN-First**: Search index fetched from CDN, not GitHub API (avoids rate limits)
- **degit Extraction**: Subfolder extraction without .git folder
- **Checksum Verification**: SHA-256 integrity validation against registry
- **Conflict Detection**: Prevents accidental file overwrites during install
- **Update Detection**: Checks registry to differentiate new submissions vs updates
- **MCP Transparency**: Bidirectional validation of MCP servers between content and manifest; install-time warning with `--accept-mcp` bypass
- **Runtime Deps Transparency**: Bidirectional validation of runtime dependencies between content and manifest; install-time warning with `--accept-deps` bypass

## Configuration
| Constant | Value | Purpose |
|----------|-------|---------|
| `CDN_BASE_URL` | `https://skillsets.cc` | CDN host |
| `SEARCH_INDEX_URL` | `${CDN_BASE_URL}/search-index.json` | Index endpoint |
| `DOWNLOADS_START_URL` | `${CDN_BASE_URL}/api/downloads/start` | Request download nonce |
| `DOWNLOADS_COMPLETE_URL` | `${CDN_BASE_URL}/api/downloads/complete` | Confirm download with nonce |
| `GITHUB_BROWSE_BASE` | `https://github.com/${REGISTRY_REPO}/tree/main/skillsets` | Human-browsable skillset URL |
| `REGISTRY_REPO` | `skillsets-cc/main` | GitHub repo |
| `CACHE_TTL_MS` | `3600000` (1 hour) | Index cache duration |

## Testing
```bash
npm test                                  # All tests
npm test -- --coverage                   # With coverage
npm test -- src/commands/tests_commands/ # Command tests only
npm test -- src/lib/tests_lib/           # Library tests only
```

## Related Documentation
- [CLI Style Guide](../../.claude/resources/cli_styleguide.md)
- [CLAUDE.md](../../CLAUDE.md)
