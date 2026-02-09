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
│   │   ├── view.ts
│   │   ├── install.ts
│   │   ├── init.ts
│   │   ├── audit.ts
│   │   └── submit.ts
│   ├── lib/               # Shared utilities
│   │   ├── api.ts
│   │   ├── checksum.ts
│   │   ├── constants.ts
│   │   ├── errors.ts
│   │   ├── filesystem.ts
│   │   ├── validate-mcp.ts
│   │   └── versions.ts
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
| `view.ts` | View a skillset README before installing | [Docs](./docs_cli/commands/view.md) |
| `install.ts` | Install skillset via degit + MCP warning + verify checksums | [Docs](./docs_cli/commands/install.md) |
| `init.ts` | Scaffold new skillset for contribution | [Docs](./docs_cli/commands/init.md) |
| `audit.ts` | Validate skillset + MCP servers before submission | [Docs](./docs_cli/commands/audit.md) |
| `submit.ts` | Open PR to registry | [Docs](./docs_cli/commands/submit.md) |

### Lib
| File | Purpose | Documentation |
|------|---------|---------------|
| `api.ts` | API client for skillsets.cc | [Docs](./docs_cli/lib/api.md) |
| `checksum.ts` | SHA-256 verification | [Docs](./docs_cli/lib/checksum.md) |
| `constants.ts` | Shared constants | [Docs](./docs_cli/lib/constants.md) |
| `errors.ts` | Error types | [Docs](./docs_cli/lib/errors.md) |
| `filesystem.ts` | File utilities | [Docs](./docs_cli/lib/filesystem.md) |
| `versions.ts` | Semver comparison | [Docs](./docs_cli/lib/versions.md) |
| `validate-mcp.ts` | MCP server bidirectional validation | [Docs](./docs_cli/lib/validate-mcp.md) |

### Types
| File | Purpose | Documentation |
|------|---------|---------------|
| `index.ts` | SearchIndex, Skillset interfaces | [Docs](./docs_cli/types/index.md) |
| `degit.d.ts` | TypeScript declarations for degit package | [Docs](./docs_cli/types/degit.d.md) |

## Related Documentation
- [CLI Style Guide](../.claude/resources/cli_styleguide.md)
