# Skillset Plugin

## Purpose
Claude Code orchestrator plugin for skillsets.cc. Three skills — `/browse`, `/install`, `/contribute` — that wrap the CLI and manage interactive workflows Claude can't delegate to a non-TTY shell.

## Architecture
```
plugin/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest (name, version, author)
├── skills/
│   ├── browse/
│   │   └── SKILL.md             # /browse — discovery via list, search, view
│   ├── install/
│   │   └── SKILL.md             # /install — verified install + QUICKSTART onboarding
│   └── contribute/
│       └── SKILL.md             # /contribute — 5-phase submission flow
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
| `skills/browse/SKILL.md` | Discovery: `list`, `search`, `view` commands. Can invoke `/install` directly. |
| `skills/install/SKILL.md` | Onboarding: verified install with MCP/dep consent, then interactive QUICKSTART walkthrough. |
| `skills/contribute/SKILL.md` | Submission: 5-phase flow — init, content prep, structural audit, qualitative audit, submit. |

## Related Documentation
- [CLI Reference](../cli/README.md) — Commands the plugin wraps
- [CLI Style Guide](../.claude/resources/cli_styleguide.md)
