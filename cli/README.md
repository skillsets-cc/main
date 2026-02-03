# Skillsets CLI

## Purpose
Command-line tool for discovering, installing, and contributing verified Claude Code skillsets.

## Architecture
```
cli/
├── src/
│   ├── index.ts           # CLI entry point
│   ├── commands/          # Command implementations
│   │   ├── list.ts
│   │   ├── search.ts
│   │   ├── install.ts
│   │   ├── init.ts
│   │   ├── audit.ts
│   │   └── submit.ts
│   ├── lib/               # Shared utilities
│   │   ├── api.ts
│   │   ├── checksum.ts
│   │   ├── constants.ts
│   │   ├── errors.ts
│   │   └── filesystem.ts
│   └── types/
│       └── index.ts
└── docs_cli/              # Documentation
    ├── ARC_cli.md
    ├── commands/
    └── lib/
```

## Files

| File | Purpose | Documentation |
|------|---------|---------------|
| — | Architecture, data flow, key patterns | [ARC_cli.md](./docs_cli/ARC_cli.md) |

### Commands
| File | Purpose | Documentation |
|------|---------|---------------|
| `list.ts` | Browse all skillsets with live stats | [Docs](./docs_cli/commands/list.md) |
| `search.ts` | Fuzzy search by name, description, tags | [Docs](./docs_cli/commands/search.md) |
| `install.ts` | Install skillset via degit + verify checksums | [Docs](./docs_cli/commands/install.md) |
| `init.ts` | Scaffold new skillset for contribution | [Docs](./docs_cli/commands/init.md) |
| `audit.ts` | Validate skillset before submission | [Docs](./docs_cli/commands/audit.md) |
| `submit.ts` | Open PR to registry | [Docs](./docs_cli/commands/submit.md) |

### Lib
| File | Purpose | Documentation |
|------|---------|---------------|
| `api.ts` | API client for skillsets.cc | [Docs](./docs_cli/lib/api.md) |
| `checksum.ts` | SHA-256 verification | [Docs](./docs_cli/lib/checksum.md) |
| `constants.ts` | Shared constants | [Docs](./docs_cli/lib/constants.md) |
| `errors.ts` | Error types | [Docs](./docs_cli/lib/errors.md) |
| `filesystem.ts` | File utilities | [Docs](./docs_cli/lib/filesystem.md) |

## Related Documentation
- [CLI Style Guide](../.claude/resources/cli_styleguide.md)
