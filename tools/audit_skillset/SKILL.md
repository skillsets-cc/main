---
name: skillset-audit
model: opus
description: Qualitative review of skillset primitives and workflow artifact verification. Run in the reference repo where the skillset was used in production.
---

# Skillset Qualitative Audit

Run in the **reference repo** (where the skillset was used), not the skillset folder.

## Input

User provides `[AUDIT_REPORT.md]` from Tier 1 (`npx skillsets audit`).

## Process

1. Verify `AUDIT_REPORT.md` shows "READY FOR SUBMISSION"
2. Read skillset README to extract claimed workflow
3. Evaluate primitives in `content/` against [CRITERIA.md](CRITERIA.md):
   - Skills (`**/SKILL.md`), Agents (`**/AGENT.md`), Hooks (`**/hooks.json`), MCP (`**/.mcp.json`), CLAUDE.md
4. Search **this repo** for workflow artifacts (design docs, execution plans, reviews, etc.)
5. Append findings to `AUDIT_REPORT.md`

## Output

```markdown
---

## Qualitative Review

**Reviewed by:** Claude (Opus)
**Date:** [ISO timestamp]
**Reference repo:** [path]

### Primitives

| Type | Count | Issues |
|------|-------|--------|
| Skills | N | [brief] |
| Agents | N | [brief] |
| Hooks | N | [brief] |
| MCP | N | [brief] |
| CLAUDE.md | Y/N | [brief] |

### Workflow Verification

**Claimed:** [workflow from README]

| Step | Artifact | Found |
|------|----------|-------|
| ... | ... | [path or "missing"] |

### Verdict

**[APPROVED / NEEDS REVISION]**

[If revision needed: prioritized fixes]
```
