# Evaluation Criteria

Rubric for Tier 2 qualitative review. Run in the **reference repo** where the skillset was used.

---

## Skills (`**/SKILL.md`)

| Field | Required | Notes |
|-------|----------|-------|
| `name` | Yes | Becomes `/slash-command` |
| `description` | Yes | Must include trigger phrases ("Use when...") |
| `model` | No | `sonnet`, `opus`, `haiku` |
| `allowed-tools` | No | Restricts tool access |

Body under 500 lines. Split to reference files if larger.

---

## Agents (`**/AGENT.md`)

| Field | Required | Notes |
|-------|----------|-------|
| `name` | Yes | Agent identifier |
| `description` | Yes | Must include `<example>` blocks |
| `model` | No | `inherit`, `sonnet`, `opus`, `haiku` |
| `tools` | No | Array of allowed tools |

System prompt needs: role definition, responsibilities, process steps, output format.

---

## Hooks (`**/hooks.json`)

```json
{
  "PreToolUse|PostToolUse|Stop|SessionStart": [
    { "matcher": "Write|Edit", "hooks": [{ "type": "prompt|command", "prompt": "...", "timeout": 30 }] }
  ]
}
```

Matchers should be specific (avoid `.*`). Timeouts reasonable. Prompts actionable.

---

## MCP (`**/.mcp.json`)

```json
{
  "server-name": {
    "command": "node|python",
    "args": ["${CLAUDE_PLUGIN_ROOT}/server.js"],
    "env": { "API_KEY": "${API_KEY}" }
  }
}
```

Use `${CLAUDE_PLUGIN_ROOT}` for paths. No hardcoded secrets.

---

## CLAUDE.md

- **Under 300 lines** (ideally <60)
- Sections: WHAT (stack, structure), WHY (purpose), HOW (workflows, testing)
- Use `file:line` pointers, not code snippets
- Progressive disclosure via links to detailed docs

---

## Workflow Verification

Search the **reference repo** for artifacts matching the skillset's claimed workflow:

| Artifact Type | Examples |
|---------------|----------|
| Design | specs, briefs, architecture docs |
| Planning | task breakdowns, execution plans |
| Review | analysis reports, review feedback |

Artifacts must be genuine work, not empty templates.

---

## Verdict

- **APPROVED**: All primitives valid, workflow artifacts present
- **NEEDS REVISION**: Missing fields, poor descriptions, no workflow evidence

Priority: descriptions → CLAUDE.md size → agent examples → workflow artifacts
