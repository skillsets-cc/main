# Skillset Audit Skill

Tier 2 qualitative review for skillsets.cc submissions. Runs in the **reference repo** where the skillset was used in production.

## Two-Tier Audit

```
npx skillsets audit              →  Tier 1: Structural validation (CLI)
/skillset-audit [AUDIT_REPORT.md] →  Tier 2: Qualitative review (Opus, in reference repo)
```

## What It Evaluates

| Check | What |
|-------|------|
| Primitives | Skills, Agents, Hooks, MCP, CLAUDE.md against [CRITERIA.md](CRITERIA.md) |
| Workflow | Artifacts in reference repo match workflow claimed in README |

## Files

```
tools/audit_skillset/
├── SKILL.md      # Opus instructions
├── CRITERIA.md   # Evaluation rubric
└── README.md     # This file
```

Installed to `.claude/skills/skillset-audit/` by `npx skillsets init`.
