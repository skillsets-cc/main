# Evaluation Criteria

Rubric for Tier 2 qualitative review. Run in the **reference repo** where the skillset was used.

**Important**: A skillset is an interoperable set of primitives covering multi-phase processes across context windows. Not all skillsets use all primitive types - evaluate what's present against the criteria below.

---

## Skills (`.claude/skills/<name>/SKILL.md`)

**Frontmatter Fields**

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `name` | No | string | Display name (defaults to directory name) |
| `description` | Recommended | string | Must include trigger phrases ("Use when...") for auto-invocation |
| `argument-hint` | No | string | Shown in autocomplete, e.g., `[filename]` |
| `disable-model-invocation` | No | boolean | `true` = manual `/name` only (for side-effects) |
| `user-invocable` | No | boolean | `false` = background knowledge only, hidden from `/` menu |
| `allowed-tools` | No | string | Comma-separated tools without permission prompts |
| `model` | No | string | `sonnet`, `opus`, `haiku` |
| `context` | No | string | `fork` to run in isolated subagent |
| `agent` | No | string | Subagent type when `context: fork` |

**Body Requirements**

- Under 500 lines (split to reference files if larger)
- Reference supporting files with markdown links: `[examples.md](examples.md)`
- String substitutions: `$ARGUMENTS`, `$ARGUMENTS[N]`, `$N`, `${CLAUDE_SESSION_ID}`
- Dynamic context: `` !`command` `` for shell preprocessing

**Red Flags**

- Missing `description` (Claude can't auto-invoke)
- Over 500 lines without reference files
- `disable-model-invocation: true` without clear rationale

---

## Agents (`.claude/agents/<name>.md`)

**Frontmatter Fields**

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `name` | Yes | string | Unique identifier (lowercase, hyphens) |
| `description` | Yes | string | When Claude should delegate; include "Use when..." |
| `tools` | No | array | Tools agent can use (inherits all if omitted) |
| `disallowedTools` | No | array | Tools to deny from inherited list |
| `model` | No | string | `sonnet`, `opus`, `haiku`, `inherit` (default) |
| `permissionMode` | No | string | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |
| `skills` | No | array | Skills to preload (full content injected) |
| `hooks` | No | object | Lifecycle hooks scoped to this agent |

**Body Requirements**

System prompt should include:
- Role definition (who the agent is)
- Responsibilities (what it does)
- Process steps (how it works)
- Output format (what it produces)

**Red Flags**

- Missing `name` or `description`
- `bypassPermissions` without justification
- Overly broad tool access
- No clear process or output format

---

## Hooks (`.claude/settings.json` or `.claude/settings.local.json`)

**Format**

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "regex_pattern",
        "hooks": [
          { "type": "command|prompt|agent", "command": "...", "timeout": 30 }
        ]
      }
    ]
  }
}
```

**Events**

| Event | Fires When | Matcher |
|-------|------------|---------|
| `SessionStart` | Session begins/resumes | `startup`, `resume`, `compact` |
| `PreToolUse` | Before tool executes (can block) | Tool name |
| `PostToolUse` | After tool succeeds | Tool name |
| `Stop` | Claude finishes responding | (none) |

**Exit Codes**

- `0` = proceed (stdout added to context)
- `2` = block action (stderr becomes feedback)
- `1`, `3+` = proceed (stderr logged in verbose only)

**Red Flags**

- Overly broad matchers (`.*`)
- Missing or unreasonable timeouts
- Hooks that block without clear feedback
- `exit 0` on validation failure (should be `exit 2`)

---

## MCP Servers (`.mcp.json`, `.claude/settings.json`, Docker configs)

### Configuration Sources

Scan all files under `content/` (skip `node_modules/`):
- **JSON files** (`.json`): Look for `mcpServers` key (Claude Code native format — `.mcp.json`, `.claude/settings.json`, `external-agents.json`, etc.)
- **YAML files** (`.yaml`, `.yml`): Look for `mcp_servers` key (Docker-hosted format — config files, compose files, etc.)

Any file matching these patterns is a configuration source. Do not hardcode specific paths.

### Per-Server Evaluation

For each MCP server found, evaluate:

1. **Purpose justification**: Does the README explain why this server is needed?
2. **Transport risk assessment**:
   - `stdio` = local execution (lower risk but runs arbitrary code)
   - `http` = remote data transmission via Streamable HTTP (data leaves the machine)
   - SSE transport is deprecated (MCP spec 2025-03-26); flag if found
3. **Package reputation** (use WebSearch + WebFetch — mandatory):
   - npm/PyPI: download counts, last publish date, maintainer identity
   - GitHub: stars, open issues, last commit date
   - Container images: registry, publisher, pull counts
4. **Version pinning**: Flag unpinned `npx -y` as a warning; recommend pinned versions (e.g., `@upstash/context7-mcp@1.0.0`)
5. **Least privilege**: read-only vs read-write access, scoped paths vs broad access
6. **Alternative analysis**: Could a local tool or built-in capability replace a remote MCP server?

### Docker-Specific Evaluation

For each Docker-hosted MCP setup:

1. **Container image reputation** (same web lookup as packages)
2. **Inner MCP servers**: What servers run inside the container? List each with same per-server evaluation
3. **Port exposure**: What ports are exposed? Are they necessary?
4. **Volume mounts**: What directories are mounted? Are they read-only where possible?
5. **README documentation**: Must document the Docker setup and what it runs

### Environment Variables

- `${VAR}` = expand from environment
- `${VAR:-default}` = expand with fallback
- Sensitive values MUST reference env vars, not hardcoded values

### Red Flags

- Hardcoded secrets (use `${VAR}` instead)
- Missing `type` field
- `stdio` servers without clear command path
- Unnecessary remote servers for local tasks
- Unpinned package versions in production
- Overly broad filesystem access (e.g., `/` instead of scoped path)

### Runtime Caveat (must include in audit report)

MCP packages are fetched at runtime and may have changed since audit. `researched_at` captures when the lookup was performed, not ongoing validity.

---

## Runtime Dependencies

Skillsets may include dependency files that trigger package installation or code execution. The install command consent-gates these based on manifest declarations.

### Detection

Scan all files under `content/` (skip `node_modules/`, `.git/`) for known dependency patterns:

| File | Manager | Risk |
|------|---------|------|
| `package.json` | npm | Lifecycle scripts (`preinstall`, `postinstall`, etc.) execute arbitrary code |
| `requirements.txt` | pip | `setup.py` can execute arbitrary code during install |
| `pyproject.toml` | pip | Build system hooks can execute code |
| `Cargo.toml` | cargo | `build.rs` scripts execute at compile time |
| `go.mod` | go | Lower risk — no install-time code execution |
| `Gemfile` | bundler | Extensions can execute code |
| Shell scripts in `.claude/scripts/` | shell | Direct code execution |

Any unrecognized file that appears to configure, install, or run something should also be evaluated.

### Per-Dependency Evaluation

For each dependency file found, evaluate:

1. **Package reputation** (use WebSearch + WebFetch — mandatory for npm/pip/cargo):
   - npm/PyPI: download counts, last publish date, maintainer identity
   - GitHub: stars, open issues, last commit date
   - Crates.io: download counts, last update
2. **Lifecycle/install scripts**: Flag `preinstall`, `install`, `postinstall`, `prepare`, `build.rs`, `setup.py` as supply chain risk. Describe what the scripts do.
3. **What does this dependency do?**: Assess what the dependency configures, installs, modifies, or runs. This goes into the `evaluation` field.
4. **Version pinning**: Flag unpinned versions as a warning; recommend exact or range-pinned versions
5. **Security configuration**: If the skillset includes `external-agents.json` with `mcpServers`, verify:
   - `toolAllowlist` is present for filesystem servers
   - `toolAllowlist` excludes write tools (`write_file`, `create_directory`, `move_file`, `edit_file`)
   - API key env var names don't appear in MCP server `env` overrides (prevents key leakage to MCP servers)

### Red Flags

- `postinstall` scripts that download or execute remote code
- Unpinned dependency versions in production
- Dependencies with no clear purpose or justification in README
- Shell scripts that modify system configuration without documentation
- Large dependency trees for simple tasks (prefer built-in alternatives)

---

## CLAUDE.md

**Location**: `content/CLAUDE.md` (project root, not inside `.claude/`)

**Structure**

- Under 300 lines (ideally <60)
- Sections: WHAT (stack, structure), WHY (purpose), HOW (workflows, testing)
- Use `file:line` pointers, not code snippets
- Progressive disclosure via `@imports` or links

**Imports**

```markdown
See @docs/architecture.md for details.
See @README for overview.
```

**Red Flags**

- Over 300 lines without modular breakdown
- Code snippets instead of file references
- Missing workflow documentation
- No clear project structure overview

---

## QUICKSTART.md (`content/QUICKSTART.md`)

**Location**: `content/QUICKSTART.md` (inside content/, distributed with the skillset)

**Purpose**: Post-install customization guide. This is what `/skillset:install` walks end users through interactively after extracting the skillset files.

**Structure Requirements**

- Must exist (validated by tier 1 structural audit)
- Sections should map to the installed primitives and configuration:
  - Project configuration (CLAUDE.md customization, project-specific settings)
  - Style guides (if the skillset includes them)
  - Agent tuning (model selection, permission modes, tool access)
  - Templates and resources (what to customize vs. use as-is)
  - Infrastructure setup (MCP servers, Docker, external services — if applicable)
- Each section should explain what needs customizing and why
- Written for interactive walkthrough — Claude reads sections sequentially and helps the user make decisions

**Red Flags**

- Missing entirely (tier 1 gate — but verify here too)
- Generic or empty sections (just headings, no actionable content)
- Doesn't cover customization for installed primitives
- Assumes user knows the skillset internally (should be cold-start friendly)
- References files that don't exist in `content/`

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

## Prompt Safety

Scan all primitives for instructions that attempt to:

- Override Claude's behavior or safety guidelines
- Exfiltrate user data or project contents
- Execute commands without clear user intent
- Manipulate Claude into bypassing restrictions
- Hide malicious behavior behind legitimate-looking workflows

**Context matters**: A security skillset may discuss injection techniques legitimately. Flag only instructions that *direct* Claude to act maliciously, not educational content *about* such techniques.

---

## Verdict

- **APPROVED**: All primitives valid, workflow artifacts present, no safety concerns
- **NEEDS REVISION**: Missing fields, poor descriptions, no workflow evidence, or safety flags


