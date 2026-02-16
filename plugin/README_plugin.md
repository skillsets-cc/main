# Skillset Plugin

## Purpose
Claude Code orchestrator plugin for skillsets.cc. Provides native `/skillset:browse`, `/skillset:install`, and `/skillset:contribute` skills that wrap the CLI and manage interactive workflows Claude can't delegate to a non-TTY shell.

## Architecture
```
plugin/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest (name, version, author)
├── skills/
│   ├── browse/
│   │   └── SKILL.md             # /skillset:browse — discovery via list, search, view
│   ├── install/
│   │   └── SKILL.md             # /skillset:install — pre-flight consent + install + QUICKSTART walkthrough
│   └── contribute/
│       └── SKILL.md             # /skillset:contribute — full submission flow (init → audit → submit)
└── docs_plugin/
    └── ARC_plugin.md            # Architecture reference

.claude-plugin/
└── marketplace.json             # Marketplace manifest (lists this plugin for discovery)
```

## Files

| File | Purpose | Documentation |
|------|---------|---------------|
| — | Architecture, data flow, key patterns | [ARC_plugin.md](./docs_plugin/ARC_plugin.md) |

### Manifests
| File | Purpose |
|------|---------|
| `.claude-plugin/plugin.json` | Plugin identity: name `skillset`, version, author, repository |
| `../.claude-plugin/marketplace.json` | Marketplace catalog: lists the plugin with source `./plugin` |

### Skills
| File | Purpose |
|------|---------|
| `skills/browse/SKILL.md` | Discovery: `list`, `search`, `view` commands with all flags. Can invoke `/skillset:install` directly. |
| `skills/install/SKILL.md` | Installation: pre-flight consent for MCP/deps via `view`, then `install --accept-mcp --accept-deps`, then QUICKSTART walkthrough. |
| `skills/contribute/SKILL.md` | Submission: 5-phase flow — `init` (user), content review (Claude), `audit` (Claude), `/audit-skill` (Claude), `submit` (user). |

## Related Documentation
- [CLI Reference](../cli/README.md) — Commands the plugin wraps
- [CLI Style Guide](../.claude/resources/cli_styleguide.md)
