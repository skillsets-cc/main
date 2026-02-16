# Plugin Module

## Purpose
Claude Code orchestrator plugin for skillsets.cc. Wraps the `npx skillsets` CLI with interactive workflows that handle non-TTY limitations — consent prompts, multi-step guided flows, and post-install customization.

## Architecture

### Distribution Path
```
.claude-plugin/marketplace.json     ← Marketplace catalog (lives at repo root)
  └─ source: "./plugin"             ← Points to the plugin directory
      └─ plugin/.claude-plugin/plugin.json   ← Plugin manifest
          └─ skills/                 ← Three skills discovered by Claude Code
```

Users add the marketplace, then install the plugin:
```
claude plugin marketplace add skillsets-cc/main
/plugin install skillset@skillsets-cc
```

After installation, skills are available as `/skillset:browse`, `/skillset:install`, `/skillset:contribute`.

### CI/CD
The plugin directory is synced from dev to prod by `sync-to-prod.yml` alongside `site`, `cli`, `schema`, and `tools`. Both `plugin/` and `.claude-plugin/` are in the sync list.

## Data Flow

### Browse
```
User → /skillset:browse [query]
  → npx skillsets list|search|view
  → CDN search-index.json + GitHub raw content
  → Results presented conversationally
  → (optional) invoke /skillset:install directly
```

### Install
```
User → /skillset:install @author/name
  → npx skillsets view (pre-flight: README + audit report)
  → Claude extracts MCP servers / runtime deps from audit report
  → Claude presents findings, asks for consent
  → npx skillsets install --accept-mcp --accept-deps
  → Read QUICKSTART.md
  → Interactive section-by-section walkthrough
```

The pre-flight check solves a non-TTY limitation: the CLI's interactive consent prompts for MCP servers and runtime dependencies can't pass through Claude's Bash tool. Instead, Claude runs `view` (which fetches the audit report), handles consent conversationally, then runs `install` with the `--accept-mcp --accept-deps` flags.

### Contribute
```
User → /skillset:contribute
  → Task 1: User runs npx skillsets init (gh CLI required)
  → Task 2: Claude reviews skillset.yaml, content/, PROOF.md
  → Task 3: Claude runs npx skillsets audit
  → Task 4: Claude runs /audit-skill (via Skill tool)
  → Task 5: User runs npx skillsets submit (gh CLI required)
```

Tasks 1 and 5 are delegated to the user because they require GitHub CLI authentication for slot reservation and PR creation. Tasks 2–4 are run by Claude directly.

## Key Patterns

### Task Management
All three skills use the `TaskCreate`/`TaskUpdate` phase tracking pattern. Tasks are created upfront with verbatim `subject`, `activeForm`, and `description`, then progressed sequentially. This prevents phase skipping and gives the user visibility into progress.

### Non-TTY Consent
The CLI has interactive prompts for MCP server and runtime dependency consent during install. Since Claude's Bash tool is non-TTY, the install skill splits this into two steps: (1) `view` to surface the audit report, (2) Claude handles consent conversationally, (3) `install` with accept flags. This is better UX than the CLI's raw prompts because Claude can explain what each MCP server does.

### Mixed Execution
The contribute skill has a clear split between Claude-run and user-run commands:

| Command | Who runs | Why |
|---------|----------|-----|
| `npx skillsets init` | User | Needs gh CLI auth for slot reservation |
| Content review | Claude | File reads + targeted feedback |
| `npx skillsets audit` | Claude | Non-interactive validation |
| `/audit-skill` | Claude | Invoked via Skill tool |
| `npx skillsets submit` | User | Needs gh CLI auth to fork + PR |

### Skill Chaining
Browse can invoke Install directly via the `Skill` tool — when a user finds a skillset they want, Claude installs it without requiring a separate `/skillset:install` invocation.

## Marketplace Manifest Schema

The marketplace manifest (`.claude-plugin/marketplace.json`) follows the Claude Code marketplace schema:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Marketplace identifier (kebab-case) |
| `owner` | Yes | `{ name, email }` — maintainer info |
| `plugins` | Yes | Array of plugin entries |
| `metadata.description` | No | Brief marketplace description |
| `metadata.version` | No | Marketplace version |

Plugin entries within `plugins` support all fields from the plugin manifest schema (`name`, `source`, `description`, `version`, `author`, `homepage`, `repository`, `license`, `keywords`, `category`).

## Integration Points
- **Upstream**: Claude Code plugin system discovers via marketplace.json
- **Downstream**: Wraps `npx skillsets` CLI commands (list, search, view, install, audit)
- **Peer**: `/audit-skill` in `tools/audit-skill/` (invoked by contribute skill via Skill tool)
- **CI/CD**: `sync-to-prod.yml` syncs plugin + marketplace to production repo

## Validation
```bash
# Validate plugin manifest
claude plugin validate ./plugin

# Validate marketplace manifest
claude plugin validate .
```

## Testing
```bash
# Load plugin locally without installing
claude --plugin-dir ./plugin

# Full marketplace test
/plugin marketplace add .
/plugin install skillset@skillsets-cc
```
