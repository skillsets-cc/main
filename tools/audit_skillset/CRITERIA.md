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

**GOOD:**
```yaml
description: Validates code changes for security issues. Use when reviewing PRs, checking for vulnerabilities, or before committing sensitive code.
```

**POOR:**
```yaml
description: Helps with code review
```

### Body Content

- Under 500 lines (split to reference files if larger)
- Assumes Claude is capable
- Appropriate freedom level for the task

---

## Agents (AGENT.md)

Agents are autonomous with specialized system prompts.

### Frontmatter Requirements

| Field | Required | Notes |
|-------|----------|-------|
| `name` | Yes | Agent identifier |
| `description` | Yes | **Must include `<example>` blocks** for reliable triggering |
| `model` | No | `inherit`, `sonnet`, `opus`, `haiku` |
| `color` | No | UI color hint |
| `tools` | No | Array of allowed tools |

### Description with Examples

**GOOD:**
```yaml
description: Use this agent when reviewing pull requests. Examples:

<example>
Context: User has a PR ready for review
user: "Review PR #42 for security issues"
assistant: "I'll use the security-reviewer agent."
<commentary>
PR review request triggers the agent.
</commentary>
</example>
```

**POOR:**
```yaml
description: Reviews code
```

### System Prompt (Body)

- Clear role definition ("You are...")
- Core responsibilities numbered
- Process/workflow steps
- Expected output format

---

## Hooks (hooks.json)

Event-driven automation scripts.

### Structure Requirements

```json
{
  "PreToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "prompt|command",
          "prompt": "...",
          "timeout": 30
        }
      ]
    }
  ]
}
```

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
- Commands have proper error handling

---

## MCP Servers (.mcp.json)

Model Context Protocol server configurations.

### Structure Requirements

```json
{
  "server-name": {
    "command": "node|python|path",
    "args": ["${CLAUDE_PLUGIN_ROOT}/server.js"],
    "env": {
      "API_KEY": "${API_KEY}"
    }
  }
}
```

### Quality Checks

- Uses `${CLAUDE_PLUGIN_ROOT}` for paths
- Environment variables use `${VAR}` syntax
- Sensitive values reference env vars, not hardcoded
- Server command exists and is valid

---

## CLAUDE.md

Project-level instructions loaded every session.

### Critical Constraints

- **Under 300 lines** (ideally <60)
- LLMs can follow ~150-200 instructions; Claude Code system prompt uses ~50
- Non-universal content degrades all instructions

### Required Content (WHAT, WHY, HOW)

| Section | Content |
|---------|---------|
| **WHAT** | Tech stack, project structure, codebase map |
| **WHY** | Project purpose, component functions |
| **HOW** | Dev workflows, tools, testing, verification |

### What to Avoid

- Task-specific instructions
- Code style rules (use linters + hooks)
- Database schemas for unrelated tasks
- Hardcoded dates/versions
- Code snippets (use `file:line` pointers)

### Progressive Disclosure

**GOOD:**
```markdown
## Architecture
See [docs/architecture.md](docs/architecture.md) for system design.

## Testing
See [docs/testing.md](docs/testing.md) for test patterns.
```

**POOR:**
```markdown
## Architecture
[500 lines of architecture details inline]
```

---

## Scoring Summary

### Per-Primitive Checks

| Primitive | Key Checks |
|-----------|------------|
| Skills | Frontmatter complete, description has triggers, body concise |
| Agents | Examples in description, clear system prompt |
| Hooks | Valid structure, specific matchers, reasonable timeouts |
| MCP | Valid paths, env vars not hardcoded |
| CLAUDE.md | Under 300 lines, WHAT/WHY/HOW, no code snippets |

### Verdict Rules

- **APPROVED**: All primitives meet requirements, minor issues only
- **NEEDS REVISION**: Missing required fields, poor descriptions, oversized files

Priority for revisions:
1. Missing/poor descriptions (affects discoverability)
2. Oversized CLAUDE.md (degrades all instructions)
3. Missing agent examples (unreliable triggering)
4. Other issues
