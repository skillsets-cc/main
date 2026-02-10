# Evaluation Criteria

Rubric for qualitative skillset review. Each primitive type has specific requirements.

---

## Skills (SKILL.md)

Skills and slash commands are now unified. File at `.claude/skills/[name]/SKILL.md` creates `/name`.

### Frontmatter Requirements

| Field | Required | Notes |
|-------|----------|-------|
| `name` | Yes | Becomes the `/slash-command`, lowercase with hyphens |
| `description` | Yes | **Critical for discoverability** - Claude uses this to decide when to load |
| `version` | No | Semver for tracking |
| `allowed-tools` | No | Restricts tool access (e.g., `Read, Write, Bash(git:*)`) |
| `model` | No | `sonnet`, `opus`, or `haiku` |
| `disable-model-invocation` | No | `true` = only user can invoke (for side-effect commands) |
| `user-invocable` | No | `false` = only Claude can invoke (background knowledge) |

### Description Quality

**GOOD:** Includes trigger phrases ("Use when reviewing PRs, checking vulnerabilities...")
**POOR:** Vague ("Helps with code review")

---

## Agents (AGENT.md)

### Frontmatter Requirements

| Field | Required | Notes |
|-------|----------|-------|
| `name` | Yes | Agent identifier |
| `description` | Yes | **Must include `<example>` blocks** for reliable triggering |
| `model` | No | `inherit`, `sonnet`, `opus`, `haiku` |
| `color` | No | UI color hint |
| `tools` | No | Array of allowed tools |

### System Prompt (Body)

- Clear role definition ("You are...")
- Core responsibilities numbered
- Process/workflow steps
- Expected output format

---

## Hooks (hooks.json)

### Event Types

| Event | When | Use For |
|-------|------|---------|
| `PreToolUse` | Before tool executes | Validation, security checks |
| `PostToolUse` | After tool completes | Feedback, logging |
| `Stop` | Task completion | Quality gates, notifications |
| `SessionStart` | Session begins | Context loading, env setup |

### Quality Checks

- Matchers are specific (avoid `.*` unless intentional)
- Timeouts are reasonable
- Prompts are concise and actionable

---

## MCP Servers (.mcp.json)

### Quality Checks

- Uses `${CLAUDE_PLUGIN_ROOT}` for paths
- Environment variables use `${VAR}` syntax
- Sensitive values reference env vars, not hardcoded

---

## CLAUDE.md

### Critical Constraints

- **Under 300 lines** (ideally <60)
- LLMs follow ~150-200 instructions; Claude Code system prompt uses ~50

### Required Content (WHAT, WHY, HOW)

- **WHAT**: Tech stack, project structure, codebase map
- **WHY**: Project purpose, component functions
- **HOW**: Dev workflows, tools, testing, verification

### What to Avoid

- Task-specific instructions
- Code style rules (use linters + hooks)
- Code snippets (use `file:line` pointers)
- Hardcoded dates/versions

---

## Verdict Rules

- **APPROVED**: All primitives meet requirements, minor issues only
- **NEEDS REVISION**: Missing required fields, poor descriptions, oversized files

Priority:
1. Missing/poor descriptions (affects discoverability)
2. Oversized CLAUDE.md (degrades all instructions)
3. Missing agent examples (unreliable triggering)
