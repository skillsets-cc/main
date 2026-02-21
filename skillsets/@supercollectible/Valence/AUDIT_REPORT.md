# Audit Report

**Generated:** 2026-02-21T17:54:35.812Z
**Skillset:** Valence v3.0.13
**Author:** @supercollectible
**Type:** Update (3.0.12 → 3.0.13)

---

## Validation Summary

| Check | Status | Details |
|-------|--------|---------|
| Manifest Validation | ✓ PASS | All fields valid |
| Required Files | ✓ PASS | All present |
| Content Structure | ✓ PASS | Found: .claude/, CLAUDE.md |
| File Size Check | ✓ PASS | No files >1MB |
| Binary Detection | ⚠ WARNING | 1 binary file(s) |
| Secret Detection | ⚠ WARNING | 2 potential secret(s) |
| README Links | ✓ PASS | All links valid |
| Version Check | ✓ PASS | Update: 3.0.12 → 3.0.13 |
| MCP Servers | ⚠ WARNING | Pending qualitative review |
| Runtime Dependencies | ⚠ WARNING | Pending qualitative review |

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



**Total Files:** 96
**Total Size:** 585.4 KB

### 5. Binary File Detection

Binary files should be justified in your PR description.

**Binary Files Detected:**
- Valence_ext/providers/index.mjs

### 6. Secret Pattern Detection

Review each match below — false positives are common. Real secrets must be removed before submitting.

**Potential Secrets Found:**
- .claude/resources/workers_styleguide.md:469 (Generic Secret Assignment)
- content/.claude/resources/workers_styleguide.md:469 (Generic Secret Assignment)

### 7. README Link Check

All links use valid GitHub URLs.



### 8. MCP Server Validation

MCP servers detected in content. The `/audit-skill` will populate `skillset.yaml` and CI will re-validate.

- MCP server 'filesystem' found in content but not declared in skillset.yaml mcp_servers
- MCP server 'context7' found in content but not declared in skillset.yaml mcp_servers

### 9. Runtime Dependencies

Runtime dependencies detected in content. The `/audit-skill` will populate `skillset.yaml` and CI will re-validate.

- Dependency file 'Valence_ext/package.json' (npm) found in content but not declared in skillset.yaml runtime_dependencies

---

## File Inventory

| File | Size |
|------|------|
| .claude/agents/ar-glm5.md | 1.0 KB |
| .claude/agents/ar-k.md | 1.1 KB |
| .claude/agents/ar-o.md | 3.5 KB |
| .claude/agents/build.md | 6.0 KB |
| .claude/agents/pm-k.md | 1.1 KB |
| .claude/agents/pm-s.md | 2.1 KB |
| .claude/agents/qa-b.md | 8.0 KB |
| .claude/agents/qa-cli.md | 9.4 KB |
| .claude/agents/qa-docs.md | 5.0 KB |
| .claude/agents/qa-f.md | 8.1 KB |
| .claude/resources/ARC_doc_template.md | 2.7 KB |
| .claude/resources/README_module_template.md | 1021 B |
| .claude/resources/backend_styleguide.md | 7.3 KB |
| .claude/resources/claude-execution-template.md | 7.1 KB |
| .claude/resources/cli_styleguide.md | 17.3 KB |
| .claude/resources/file_doc_template.md | 1.5 KB |
| .claude/resources/frontend_styleguide.md | 25.3 KB |
| .claude/resources/workers_styleguide.md | 16.7 KB |
| .claude/skills/ar/SKILL.md | 6.7 KB |
| .claude/skills/arm/SKILL.md | 3.9 KB |
| .claude/skills/audit-skill/CRITERIA.md | 11.4 KB |
| .claude/skills/audit-skill/SKILL.md | 10.6 KB |
| .claude/skills/build/SKILL.md | 5.6 KB |
| .claude/skills/denoise/SKILL.md | 1.1 KB |
| .claude/skills/design/SKILL.md | 5.3 KB |
| .claude/skills/plan/SKILL.md | 6.8 KB |
| .claude/skills/pmatch/SKILL.md | 5.2 KB |
| .claude/skills/qb/SKILL.md | 1.4 KB |
| .claude/skills/qd/SKILL.md | 958 B |
| .claude/skills/qf/SKILL.md | 1015 B |
| CLAUDE.md | 19.3 KB |
| PROOF.md | 600 B |
| QUICKSTART.md | 5.6 KB |
| README.md | 25.0 KB |
| Valence_ext/.env | 494 B |
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
| content/.claude/agents/ar-glm5.md | 1.0 KB |
| content/.claude/agents/ar-k.md | 1.1 KB |
| content/.claude/agents/ar-o.md | 3.5 KB |
| content/.claude/agents/build.md | 6.0 KB |
| content/.claude/agents/pm-k.md | 1.1 KB |
| content/.claude/agents/pm-s.md | 2.1 KB |
| content/.claude/agents/qa-b.md | 8.0 KB |
| content/.claude/agents/qa-cli.md | 9.4 KB |
| content/.claude/agents/qa-docs.md | 5.0 KB |
| content/.claude/agents/qa-f.md | 8.1 KB |
| content/.claude/resources/ARC_doc_template.md | 2.7 KB |
| content/.claude/resources/README_module_template.md | 1021 B |
| content/.claude/resources/backend_styleguide.md | 7.3 KB |
| content/.claude/resources/claude-execution-template.md | 7.1 KB |
| content/.claude/resources/cli_styleguide.md | 17.3 KB |
| content/.claude/resources/file_doc_template.md | 1.5 KB |
| content/.claude/resources/frontend_styleguide.md | 25.3 KB |
| content/.claude/resources/workers_styleguide.md | 16.7 KB |
| content/.claude/skills/ar/SKILL.md | 6.7 KB |
| content/.claude/skills/arm/SKILL.md | 3.9 KB |
| content/.claude/skills/build/SKILL.md | 5.6 KB |
| content/.claude/skills/denoise/SKILL.md | 1.1 KB |
| content/.claude/skills/design/SKILL.md | 5.3 KB |
| content/.claude/skills/plan/SKILL.md | 6.8 KB |
| content/.claude/skills/pmatch/SKILL.md | 5.2 KB |
| content/.claude/skills/qb/SKILL.md | 1.4 KB |
| content/.claude/skills/qd/SKILL.md | 958 B |
| content/.claude/skills/qf/SKILL.md | 1015 B |
| content/CLAUDE.md | 19.3 KB |
| content/QUICKSTART.md | 5.6 KB |
| content/README.md | 25.0 KB |
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
| skillset.yaml | 1.5 KB |

---

## Submission Status

**⚠ READY FOR SUBMISSION — warnings require review**

Structural checks passed but warnings were found. Review each warning with the `/skillset:contribute` wizard before submitting.

---

## Next Steps

1. Run `/skillset:contribute` to review warnings with the wizard
2. Confirm or resolve each warning
3. Run: `npx skillsets submit`

---

## Qualitative Review

**Reviewed by:** Claude (Opus)
**Date:** 2026-02-21T18:15:00.000Z
**Reference repo:** /home/nook/Documents/code/skillsets.cc

### Tier 1 Warnings Resolution

| Warning | Verdict |
|---------|---------|
| Binary: `Valence_ext/providers/index.mjs` | False positive — 13-line JavaScript module (provider registry) |
| Secrets: `workers_styleguide.md:469` | False positive — `JWT_SECRET: 'test-secret'` in test fixture example within style guide |
| MCP Servers | Resolved — `mcp_servers` populated in `skillset.yaml` with reputation data (context7, filesystem) |
| Runtime Dependencies | Resolved — `runtime_dependencies` populated in `skillset.yaml` with package evaluation |

### Primitives

| Type | Count | Assessment |
|------|-------|------------|
| Skills | 10 | Valid — all have frontmatter (name, description, argument-hint), under 500 lines, clear phase-tracked processes |
| Agents | 10 | Valid — all have name + description, clear role/process/output. 3 thin proxy agents (ar-k, ar-glm5, pm-k) delegate to external models via Valence_ext runner |
| Hooks | 0 | None present |
| MCP | 2 | Valid — context7 (Upstash, 304k weekly downloads) + filesystem (Anthropic official, 171k weekly). Both stdio, read-only access |
| CLAUDE.md | Yes | 405 lines (over 300 guideline, but modular — links to 8 resource files in .claude/resources/) |
| QUICKSTART.md | Yes | Comprehensive post-install guide. Covers CLAUDE.md customization, style guides, agents, templates, Valence_ext setup, and environment config (Context7 MCP, tmux, agent teams flag) |

**Note on CLAUDE.md length**: At 405 lines, this exceeds the 300-line guideline. However, it uses progressive disclosure — architecture diagrams, schema examples, and contributor flow are linked to separate resource files. The length is justified by the scope of the skillset (10 skills, 10 agents, multi-model infrastructure).

### MCP Server Evaluation

| Server | Type | Package | Downloads | Pinned | Least Privilege | Risk |
|--------|------|---------|-----------|--------|-----------------|------|
| context7 | stdio | @upstash/context7-mcp | 304k/week | Unpinned (`-y`) | Read-only (resolve-library-id, query-docs) | Low |
| filesystem | stdio | @modelcontextprotocol/server-filesystem | 171k/week | Unpinned (`-y`) | Read-only via toolAllowlist (write tools excluded) | Low |

**Version pinning**: Both use `npx -y` (unpinned). MCP packages are fetched at runtime and may have changed since audit. `researched_at: 2026-02-10` captures when the lookup was performed, not ongoing validity.

**bypassPermissions**: Used by ar-k, ar-glm5, pm-k (3 agents). Justified — these are thin Haiku proxy agents that shell out to `node Valence_ext/external-agent.mjs`. The runner restricts environment variables to an allowlist (`HOME`, `PATH`, `USER`, `NODE_PATH`) and MCP filesystem access to read-only tools.

### Runtime Dependencies

| File | Manager | Packages | Install Scripts | Assessment |
|------|---------|----------|-----------------|------------|
| Valence_ext/package.json | npm | @modelcontextprotocol/sdk (5.6M/wk), server-filesystem (171k/wk), context7-mcp (304k/wk), zod (87.6M/wk) | None | All reputable, official packages. No lifecycle scripts. Optional dependency — only needed for /ar and /pmatch |

### Safety Scan

**Status:** CLEAR

- No prompt injection or manipulation patterns found across 25 primitive files
- Filesystem MCP restricted to read-only via `toolAllowlist` (write_file, create_directory, move_file, edit_file excluded)
- API keys isolated — `KIMI_API_KEY` and `OPENROUTER_API_KEY` not passed to MCP server environments
- External agent runner uses `child_process.spawn` (not shell), hardcoded config paths, no eval/Function/dynamic code execution
- `bypassPermissions` usage narrowly scoped (3 proxy agents only) with documented justification

### Workflow Verification

**Claimed workflow:** /arm → /design → /ar → /plan → /build → /pmatch → /denoise → /qf → /qb → /qd

**Reference repo:** skillsets.cc — `PROCESS_DOCS/` directory with 26 genuine workflow artifacts (680 KB total)

| Step | Expected Artifact | Found |
|------|-------------------|-------|
| /arm (brief) | Requirements crystallization | `PROCESS_DOCS/briefs/` — 5 briefs including PROJECT_BRIEF.md (5.2K), mcp-security-transparency.md (8.2K) |
| /design | First principles design doc | `PROCESS_DOCS/design/` — 8 designs (11-43K each), including batch-identity-system.md, ghost-entries-design.md |
| /ar | Adversarial review report | `PROCESS_DOCS/reviews/` — 5 reviews including skillsets-cc-ar-review.md (3 concurrent reviewers), cli-security-review.md (18 findings) |
| /plan | Execution plan with tasks | `PROCESS_DOCS/execution/` — 8 execution plans (33-59K each) with per-task acceptance criteria and test specifications |
| /build | Implemented code | skillsets.cc site + CLI — live at https://skillsets.cc |
| /pmatch | Alignment validation | Pattern match analysis present in review documents (CLI security review's v1 fixes vs deferred items) |
| /denoise, /qf, /qb, /qd | Quality pipeline | Referenced in execution plans (test strategies, cleanup checks, doc updates) |

**Artifact quality**: All documents are genuine work products with specific technical decisions, real code path references, discovered issues (build agent permissions, XSS sanitization, rate limiting race conditions), and iteration evidence.

### Manifest Changes

Phase 2 updated `skillset.yaml`:
- `mcp_servers` verified (already present, entries match content)
- `runtime_dependencies` schema corrected to match CI validation format (`manager`, `packages`, `has_install_scripts`, `evaluation`, `researched_at`)

CI should re-run `npx skillsets audit --check` to validate the final manifest state.

### Verdict

**APPROVED**

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Tier 1 passed | ✓ AUDIT_REPORT.md shows "READY FOR SUBMISSION" |
| 2 | Safety clear | ✓ No prompt injection, exfiltration, or manipulation |
| 3 | Coherent workflow | ✓ 10 skills + 10 agents form complete SDLC covering brief → design → review → plan → build → validate → QA |
| 4 | Present primitives valid | ✓ All skills have descriptions + processes, all agents have roles + output formats |
| 5 | Workflow proven | ✓ 26 genuine artifacts in reference repo across all claimed phases |

---

**Generated by:** `npx skillsets audit`
**Schema Version:** 1.0
**Report Date:** 2026-02-21T17:54:35.812Z
