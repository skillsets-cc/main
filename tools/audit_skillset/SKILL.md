---
name: skillset-audit
description: Qualitative review of skillset content against Claude Code best practices. Evaluates all primitives (skills, agents, hooks, MCP, CLAUDE.md) for proper frontmatter, descriptions, and structure. Appends analysis to AUDIT_REPORT.md.
---

# Skillset Qualitative Audit

## Task

1. Verify `AUDIT_REPORT.md` shows "READY FOR SUBMISSION"
2. Identify all primitives in `content/`:
   - Skills: `**/SKILL.md`
   - Agents: `**/AGENT.md` or `**/*.agent.md`
   - Hooks: `**/hooks.json`
   - MCP: `**/.mcp.json` or `**/mcp.json`
   - CLAUDE.md: `CLAUDE.md` or `.claude/settings.json`
3. Evaluate each against [CRITERIA.md](CRITERIA.md)
4. Append findings to `AUDIT_REPORT.md`

## Per-Primitive Evaluation

### Skills
- Frontmatter has `name` and `description`
- Description includes trigger phrases ("Use when...")
- Body under 500 lines
- `allowed-tools` if restricting access
- `disable-model-invocation` for side-effect commands

### Agents
- Description has `<example>` blocks
- System prompt has role, responsibilities, process, output format
- `tools` array if restricting access

### Hooks
- Valid JSON structure
- Matchers are specific (not just `.*`)
- Reasonable timeouts
- Prompts are actionable

### MCP
- Uses `${CLAUDE_PLUGIN_ROOT}` for paths
- Env vars use `${VAR}` syntax
- No hardcoded secrets

### CLAUDE.md
- Under 300 lines (check line count)
- Has WHAT/WHY/HOW sections
- Uses `file:line` pointers, not code snippets
- Progressive disclosure for large content

## Output

Append to `AUDIT_REPORT.md`:

```markdown
---

## Qualitative Review

**Reviewed by:** Claude (Opus)
**Date:** [ISO timestamp]

### Primitives Found

| Type | Count | Files |
|------|-------|-------|
| Skills | N | [list] |
| Agents | N | [list] |
| Hooks | N | [list] |
| MCP | N | [list] |
| CLAUDE.md | Y/N | [path] |

### Issues

[List each issue with file:line and specific fix needed]

### Verdict

**[APPROVED / NEEDS REVISION]**

[If needs revision: prioritized list of must-fix items]
```
