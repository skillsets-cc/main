# Skillset Audit Skill

Tier 2 qualitative review for skillsets.cc submissions. Evaluates all Claude Code primitives against best practices.

## What It Evaluates

| Primitive | Files | Key Requirements |
|-----------|-------|------------------|
| Skills | `**/SKILL.md` | Frontmatter with `name` + `description`, trigger phrases, body <500 lines |
| Agents | `**/AGENT.md`, `**/*.agent.md` | `<example>` blocks in description, clear system prompt |
| Hooks | `**/hooks.json` | Specific matchers, reasonable timeouts, actionable prompts |
| MCP | `**/.mcp.json`, `**/mcp.json` | `${CLAUDE_PLUGIN_ROOT}` paths, env vars not hardcoded |
| CLAUDE.md | `CLAUDE.md`, `.claude/settings.json` | <300 lines, WHAT/WHY/HOW sections, no code snippets |

## Audit Flow

```
npx skillsets audit    →  Tier 1: Structural validation (programmatic)
/skillset-audit        →  Tier 2: Qualitative review (Opus)
                           └── Appends findings to AUDIT_REPORT.md
```

## Files

```
tools/audit_skillset/
├── SKILL.md      # Opus instructions for qualitative review
├── CRITERIA.md   # Per-primitive evaluation rubric
└── README.md     # This file
```

Installed to `.claude/skills/skillset-audit/` by `npx skillsets init`.
