# Audit Report

**Generated:** 2026-02-28T14:42:32.693Z
**Skillset:** Valence v3.2.0
**Author:** @supercollectible
**Type:** New submission

---

## Validation Summary

| Check | Status | Details |
|-------|--------|---------|
| Manifest Validation | ✓ PASS | All fields valid |
| Required Files | ✓ PASS | All present |
| Content Structure | ✓ PASS | Found: .claude/, CLAUDE.md |
| File Size Check | ✓ PASS | No files >1MB |
| Binary Detection | ⚠ WARNING | 1 binary file(s) |
| Secret Detection | ✓ PASS | No secrets detected |
| README Links | ✓ PASS | All links valid |
| Version Check | ✓ PASS | New submission |
| MCP Servers | ✓ PASS | MCP servers declarations valid |
| Runtime Dependencies | ✓ PASS | Runtime dependencies declarations valid |
| Install Notes | ✓ PASS | Valid |
| CC Extensions | ✓ PASS | CC extensions declarations valid |

---

## Detailed Findings

### 1. Manifest Validation

All fields validated successfully.

### 2. Required Files

All required files present.

### 3. Content Structure

Valid content structure detected.

### 4. File Size Analysis

No large files detected.



**Total Files:** 113
**Total Size:** 572.0 KB

### 5. Binary File Detection

Binary files should be justified in your PR description.

**Binary Files Detected:**
- Valence_ext/providers/index.mjs

### 6. Secret Pattern Detection

No secrets detected.



### 7. README Link Check

All links use valid GitHub URLs.



### 8. MCP Server Validation

MCP server declarations are consistent between content and manifest.

### 9. Runtime Dependencies

Runtime dependency declarations are consistent between content and manifest.

### 10. Install Notes

Install notes present and valid.

### 11. CC Extensions

CC extension declarations are consistent with manifest.

---

## File Inventory

| File | Size |
|------|------|
| .claude/agents/ar-glm5.md | 1.5 KB |
| .claude/agents/ar-k.md | 1.5 KB |
| .claude/agents/ar-o.md | 4.5 KB |
| .claude/agents/build.md | 5.5 KB |
| .claude/agents/pm-k.md | 1.5 KB |
| .claude/agents/pm-s.md | 2.4 KB |
| .claude/agents/qa-b.md | 6.6 KB |
| .claude/agents/qa-docs.md | 5.7 KB |
| .claude/agents/qa-f.md | 6.5 KB |
| .claude/resources/ARC_doc_template.md | 2.7 KB |
| .claude/resources/README_module_template.md | 1021 B |
| .claude/resources/ar_report_template.md | 1.4 KB |
| .claude/resources/arch_spec_template.md | 2.4 KB |
| .claude/resources/backend_styleguide.md | 2.6 KB |
| .claude/resources/brief_template.md | 319 B |
| .claude/resources/claude-execution-template.md | 6.9 KB |
| .claude/resources/file_doc_template.md | 1.5 KB |
| .claude/resources/frontend_styleguide.md | 3.1 KB |
| .claude/resources/ticket_template.md | 954 B |
| .claude/settings.json | 66 B |
| .claude/settings.local.json | 1.8 KB |
| .claude/skills/ar/SKILL.md | 5.3 KB |
| .claude/skills/arch/SKILL.md | 10.7 KB |
| .claude/skills/arm/SKILL.md | 4.3 KB |
| .claude/skills/audit-skill/CRITERIA.md | 11.4 KB |
| .claude/skills/audit-skill/SKILL.md | 14.7 KB |
| .claude/skills/breakdown/SKILL.md | 7.1 KB |
| .claude/skills/bugfest/SKILL.md | 12.2 KB |
| .claude/skills/build/SKILL.md | 7.3 KB |
| .claude/skills/denoise/SKILL.md | 2.0 KB |
| .claude/skills/pmatch/SKILL.md | 5.0 KB |
| .claude/skills/qb/SKILL.md | 2.0 KB |
| .claude/skills/qd/SKILL.md | 2.0 KB |
| .claude/skills/qf/SKILL.md | 2.0 KB |
| .claude/skills/solve/SKILL.md | 8.7 KB |
| .gitignore | 30 B |
| AUDIT_REPORT.md | 12.0 KB |
| CLAUDE.md | 4.6 KB |
| LICENSE | 10.5 KB |
| QUICKSTART.md | 7.2 KB |
| README.md | 35.5 KB |
| Valence_ext/.env.example | 319 B |
| Valence_ext/README.md | 8.0 KB |
| Valence_ext/external-agent.mjs | 7.3 KB |
| Valence_ext/external-agents.json | 1.8 KB |
| Valence_ext/package-lock.json | 62.7 KB |
| Valence_ext/package.json | 231 B |
| Valence_ext/prompts/adversarial-review.md | 5.2 KB |
| Valence_ext/prompts/pattern-match.md | 2.8 KB |
| Valence_ext/providers/index.mjs | 317 B |
| Valence_ext/providers/openai-compat.mjs | 1.7 KB |
| Valence_ext/test/fixtures/kimi-final.json | 454 B |
| Valence_ext/test/fixtures/kimi-tool-call.json | 667 B |
| Valence_ext/test/fixtures/malformed-args.json | 559 B |
| Valence_ext/test/fixtures/openrouter-final.json | 446 B |
| Valence_ext/test/fixtures/openrouter-tool-call.json | 569 B |
| Valence_ext/test/normalization.test.mjs | 7.4 KB |
| content/.claude/agents/ar-glm5.md | 1.5 KB |
| content/.claude/agents/ar-k.md | 1.5 KB |
| content/.claude/agents/ar-o.md | 4.5 KB |
| content/.claude/agents/build.md | 5.5 KB |
| content/.claude/agents/pm-k.md | 1.5 KB |
| content/.claude/agents/pm-s.md | 2.4 KB |
| content/.claude/agents/qa-b.md | 6.6 KB |
| content/.claude/agents/qa-docs.md | 5.7 KB |
| content/.claude/agents/qa-f.md | 6.5 KB |
| content/.claude/resources/ARC_doc_template.md | 2.7 KB |
| content/.claude/resources/README_module_template.md | 1021 B |
| content/.claude/resources/ar_report_template.md | 1.4 KB |
| content/.claude/resources/arch_spec_template.md | 2.4 KB |
| content/.claude/resources/backend_styleguide.md | 2.6 KB |
| content/.claude/resources/brief_template.md | 319 B |
| content/.claude/resources/claude-execution-template.md | 6.9 KB |
| content/.claude/resources/file_doc_template.md | 1.5 KB |
| content/.claude/resources/frontend_styleguide.md | 3.1 KB |
| content/.claude/resources/ticket_template.md | 954 B |
| content/.claude/settings.json | 66 B |
| content/.claude/settings.local.json | 1.8 KB |
| content/.claude/skills/ar/SKILL.md | 5.3 KB |
| content/.claude/skills/arch/SKILL.md | 10.7 KB |
| content/.claude/skills/arm/SKILL.md | 4.3 KB |
| content/.claude/skills/audit-skill/CRITERIA.md | 11.4 KB |
| content/.claude/skills/audit-skill/SKILL.md | 14.7 KB |
| content/.claude/skills/breakdown/SKILL.md | 7.1 KB |
| content/.claude/skills/bugfest/SKILL.md | 12.2 KB |
| content/.claude/skills/build/SKILL.md | 7.3 KB |
| content/.claude/skills/denoise/SKILL.md | 2.0 KB |
| content/.claude/skills/pmatch/SKILL.md | 5.0 KB |
| content/.claude/skills/qb/SKILL.md | 2.0 KB |
| content/.claude/skills/qd/SKILL.md | 2.0 KB |
| content/.claude/skills/qf/SKILL.md | 2.0 KB |
| content/.claude/skills/solve/SKILL.md | 8.7 KB |
| content/CLAUDE.md | 4.6 KB |
| content/INSTALL_NOTES.md | 1.9 KB |
| content/QUICKSTART.md | 7.2 KB |
| content/README.md | 35.5 KB |
| content/Valence_ext/.env.example | 319 B |
| content/Valence_ext/README.md | 8.0 KB |
| content/Valence_ext/external-agent.mjs | 7.3 KB |
| content/Valence_ext/external-agents.json | 1.8 KB |
| content/Valence_ext/package.json | 231 B |
| content/Valence_ext/prompts/adversarial-review.md | 5.2 KB |
| content/Valence_ext/prompts/pattern-match.md | 2.8 KB |
| content/Valence_ext/providers/index.mjs | 317 B |
| content/Valence_ext/providers/openai-compat.mjs | 1.7 KB |
| content/Valence_ext/test/fixtures/kimi-final.json | 454 B |
| content/Valence_ext/test/fixtures/kimi-tool-call.json | 667 B |
| content/Valence_ext/test/fixtures/malformed-args.json | 559 B |
| content/Valence_ext/test/fixtures/openrouter-final.json | 446 B |
| content/Valence_ext/test/fixtures/openrouter-tool-call.json | 569 B |
| content/Valence_ext/test/normalization.test.mjs | 7.4 KB |
| skillset.yaml | 2.7 KB |
| worktrees-and-task-isolation.md | 1.9 KB |

---

## Qualitative Review

**Reviewed by:** Claude (Opus)
**Date:** 2026-02-28T14:45:00Z
**Reference repo:** /home/nook/Documents/code/skillsets.cc

### Primitives

| Type | Count | Assessment |
|------|-------|------------|
| Skills | 12 | Valid — all have descriptions, process steps, and are under 500 lines |
| Agents | 9 | Valid — all have name, description, role definition, process steps, and output format |
| Hooks | 0 | N/A |
| MCP | 2 | Valid — context7 (Upstash, 304k+/wk, MIT) and filesystem (Anthropic official, 137k+/wk, MIT) |
| CLAUDE.md | Yes | Valid — 165-line template, under 300-line limit |
| QUICKSTART.md | Yes | Valid — comprehensive post-install guide |
| INSTALL_NOTES.md | Yes | Valid — welcome, quick start, and dependency tables |

### Safety Scan

**Status:** CLEAR

- Filesystem MCP server restricted to read-only via toolAllowlist
- API keys use env var references only — not hardcoded
- Env allowlisting in external-agent.mjs prevents key leakage (lines 61-65)
- No prompt injection, data exfiltration, or manipulation patterns found

**Runtime caveat:** MCP packages are fetched at runtime and may have changed since audit. `researched_at` captures when the lookup was performed, not ongoing validity.

### Workflow Verification

**Claimed workflow:** /arm -> /arch -> /solve -> /ar -> /breakdown -> /build -> /pmatch -> /bugfest -> /denoise, /qf, /qb, /qd

| Step | Expected Artifact | Found |
|------|-------------------|-------|
| /arm (briefs) | PROCESS_DOCS/briefs/ | 6 files (813 lines) |
| /arch (architecture) | PROCESS_DOCS/arch/ | PROCESS_DOCS/design/ — 16 files (5,000+ lines) |
| /solve (solutions) | PROCESS_DOCS/solutions/ | PROCESS_DOCS/design/ — design docs with solution rationale |
| /ar (reviews) | PROCESS_DOCS/reviews/ | 8 files (1,100+ lines) — multi-reviewer reports |
| /breakdown (execution) | PROCESS_DOCS/breakdowns/ | PROCESS_DOCS/execution/ — 11 files + nested dir (13,000+ lines) |
| /build (implementation) | Implemented codebase | Skill exists; implementations in live codebase |
| /pmatch (validation) | Alignment reports | Skill exists with dual-agent protocol |
| /bugfest (bugs) | PROCESS_DOCS/tickets/ | manifest.yaml + 1 resolved ticket |
| Post-build (/denoise, /qf, /qb, /qd) | Cleanup and QA | Skills exist with team orchestration protocols |

### Verdict

**APPROVED**

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Tier 1 passed | AUDIT_REPORT.md shows "READY FOR SUBMISSION" |
| 2 | Safety clear | No prompt injection, exfiltration, or manipulation |
| 3 | Coherent workflow | 12 skills + 9 agents form a complete SDLC |
| 4 | Present primitives valid | All skills and agents meet criteria |
| 5 | Workflow proven | 17,000+ lines of genuine process docs |

---

## Submission Status

**READY FOR SUBMISSION**

---

**Generated by:** `npx skillsets audit` + `/audit-skill` qualitative review
**Schema Version:** 1.0
**Structural Audit Date:** 2026-02-28T14:42:32.693Z
**Qualitative Review Date:** 2026-02-28T14:45:00Z
