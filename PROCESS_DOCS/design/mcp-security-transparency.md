# Design: MCP Security Transparency

**Brief:** [PROCESS_DOCS/briefs/mcp-security-transparency.md](../briefs/mcp-security-transparency.md)
**Status:** Draft
**Date:** 2026-02-05

## Executive Summary

Make MCP server presence visible at every stage of the skillset lifecycle (audit, submission, browse, install) by writing structured MCP metadata to `skillset.yaml`, flowing it through the search index pipeline, and validating manifest completeness via the `audit` command (CI calls it as a thin gate). Covers all three MCP configuration patterns: Claude Code native (`.mcp.json`, `.claude/settings.json`) and Docker-hosted (container images running MCP servers internally).

## Scope

- **Includes**: JSON Schema update, validation module (`validate-mcp.ts`), audit integration, CLI install warning with `--accept-mcp`, search index pipeline, site browse/detail MCP display, `init` degit fetch, The_Skillset manifest migration, CI workflow update, CRITERIA.md expansion, SKILL.md update
- **Excludes**: Security model page (future), runtime MCP monitoring, MCP server sandboxing
- **Dependencies**: `js-yaml`, `degit`, `@inquirer/prompts` (all already in CLI deps) — no new dependencies required

## Rationale

| Decision | Rationale | Alternative | Why Rejected |
|----------|-----------|-------------|--------------|
| Manifest as single source of truth | All downstream consumers (CLI, site, CI) read from one place via the search index pipeline | Parse `.mcp.json` at runtime | Violates build-time index architecture; CLI would need network access to raw GitHub files |
| `audit` command owns all structural + MCP validation | Single validation engine in TypeScript, testable with vitest; CI just calls `npx skillsets audit`; `submit` gates on audit passing | Separate bash logic in CI | Duplicates validation, untestable bash, contributor gets no local feedback before PR |
| Nested schema for Docker MCP | Container is the trust boundary; inner servers only run if container starts | Flat list with source field | Loses the containment relationship |
| `mcp_reputation` as required free-text with `minLength: 20` | Transparency is the point — omitting reputation data defeats the feature; free-text because LLM research is inherently unstructured | Optional field | Contributors can strip reputation post-audit and pass CI; `minLength` prevents trivial values |
| Separate `--accept-mcp` flag | MCP consent must not be bypassed by `--force` or `--yes`; non-TTY exits with error | Reuse existing flags | Defeats the friction mechanism in automated pipelines |
| Docker CI validates bidirectionally via config files | Docker MCP servers are declared in config YAML files (e.g., `content/docker/litellm/config.yaml`) with `mcp_servers` key; CI scans these the same way it scans `.mcp.json` | Scan compose files for MCP servers | Compose files define infrastructure (images, ports, volumes), not MCP declarations; config files are the source of truth |
| `sse` removed from transport enum | MCP spec (2025-03-26) deprecated HTTP+SSE in favor of Streamable HTTP; `"http"` represents Streamable HTTP | Keep `sse` for backward compat | Legitimizes deprecated transport in new submissions |
| `init` fetches audit-skill via degit | Contributors always get latest criteria without CLI release | Embedded string literals (current) | Current approach requires updating TypeScript source + publishing CLI for every criteria change |
| Schema stays at version `"1.0"` | `mcp_servers` is additive and optional; forward-first constraint | Bump to `"1.1"` | No consumer needs to distinguish pre/post MCP schemas; unnecessary complexity |
| WebSearch/WebFetch mandatory in audit | Contributors have network access if they can run `npx skillsets init` | Best-effort with fallback | Inconsistent audit quality; "Not researched" entries undermine transparency goals |

## Schema

### `mcp_servers` field in `skillset.yaml`

Added as an optional property to the existing schema. Root-level `"additionalProperties": false` requires explicit declaration in `properties`.

```yaml
# Claude Code native (stdio)
mcp_servers:
  - name: "context7"
    type: "stdio"
    command: "npx"
    args: ["-y", "@upstash/context7-mcp"]
    mcp_reputation: "npm: @upstash/context7-mcp, 50k weekly downloads, maintained by Upstash"
    researched_at: "2026-02-04"

  # Claude Code native (Streamable HTTP)
  - name: "remote-api"
    type: "http"
    url: "https://api.example.com/mcp"
    mcp_reputation: "No public package found. Self-hosted endpoint."
    researched_at: "2026-02-04"

  # Docker-hosted
  - name: "litellm-proxy"
    type: "docker"
    image: "ghcr.io/berriai/litellm:main-latest"
    mcp_reputation: "ghcr: berriai/litellm, widely used LLM proxy, active maintenance"
    researched_at: "2026-02-04"
    servers:
      - name: "context7"
        command: "npx"
        args: ["-y", "@upstash/context7-mcp"]
        mcp_reputation: "npm: @upstash/context7-mcp, 50k weekly downloads, maintained by Upstash"
        researched_at: "2026-02-04"
      - name: "filesystem"
        command: "npx"
        args: ["-y", "@modelcontextprotocol/server-filesystem", "/project:ro"]
        mcp_reputation: "npm: @modelcontextprotocol/server-filesystem, official Anthropic MCP server"
        researched_at: "2026-02-04"
```

### JSON Schema addition to `schema/skillset.schema.json`

```json
"mcp_servers": {
  "type": "array",
  "maxItems": 20,
  "items": {
    "type": "object",
    "required": ["name", "type", "mcp_reputation", "researched_at"],
    "properties": {
      "name": { "type": "string" },
      "type": { "enum": ["stdio", "http", "docker"] },
      "command": { "type": "string" },
      "args": {
        "type": "array",
        "items": { "type": "string" }
      },
      "url": { "type": "string", "pattern": "^https?://" },
      "image": { "type": "string" },
      "servers": {
        "type": "array",
        "maxItems": 10,
        "items": {
          "type": "object",
          "required": ["name", "command", "mcp_reputation", "researched_at"],
          "properties": {
            "name": { "type": "string" },
            "command": { "type": "string" },
            "args": {
              "type": "array",
              "items": { "type": "string" }
            },
            "mcp_reputation": { "type": "string", "minLength": 20 },
            "researched_at": { "type": "string", "format": "date" }
          },
          "unevaluatedProperties": false
        }
      },
      "mcp_reputation": { "type": "string", "minLength": 20 },
      "researched_at": { "type": "string", "format": "date" }
    },
    "unevaluatedProperties": false,
    "allOf": [
      {
        "if": { "properties": { "type": { "const": "stdio" } }, "required": ["type"] },
        "then": { "required": ["command"] }
      },
      {
        "if": { "properties": { "type": { "const": "http" } }, "required": ["type"] },
        "then": { "required": ["url"] }
      },
      {
        "if": { "properties": { "type": { "const": "docker" } }, "required": ["type"] },
        "then": { "required": ["image", "servers"] }
      }
    ]
  }
}
```

**Schema notes:**
- `unevaluatedProperties: false` on both item and inner `servers` item levels. The existing schema uses `additionalProperties: false` on simple objects (author, verification, compatibility), but the MCP items schema uses `allOf`/`if`/`then` composition — `additionalProperties` only sees properties in its own subschema and would break if a `then` block ever introduced new properties. `unevaluatedProperties` is the Draft 2020-12 keyword designed for this; it resolves properties across subschemas. CI already runs ajv with `--spec=draft2020`.
- `maxItems: 20` on `mcp_servers`, `maxItems: 10` on inner `servers` — consistent with other bounded arrays in the schema (tags: 10, production_links: 5).
- `mcp_reputation` and `researched_at` are required on every server entry. If no reputation data exists, contributors must write explicitly (e.g., "No public package found. Self-hosted endpoint."). The `minLength: 20` prevents trivial values.
- `required: ["type"]` in each `if` block follows the canonical JSON Schema conditional pattern. Without it, `if` conditions succeed vacuously when the discriminant property is absent. The top-level `required: ["name", "type", ...]` makes this belt-and-suspenders, but it prevents fragility if the schema is refactored.
- `sse` removed from the type enum. The MCP specification (2025-03-26) deprecated HTTP+SSE in favor of Streamable HTTP. `"http"` represents Streamable HTTP (the current standard). Existing SSE servers should migrate; CRITERIA.md should flag SSE usage during audit.

## Architecture

### Data Flow

```
Contributor runs `npx skillsets init`
         │
         ├── Creates structure (skillset.yaml, README.md, PROOF.md, content/)
         └── Fetches audit-skill via degit from tools/audit-skill/
         │
         ▼
Contributor develops skillset in content/
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  /audit-skill (Opus, local in Claude Code)                       │
│                                                                  │
│  1. Scan content/ for MCP sources:                               │
│                                                                  │
│     Claude Code native:                                          │
│     - content/.mcp.json (mcpServers key)                         │
│     - content/.claude/settings.json (mcpServers key)             │
│     - content/.claude/settings.local.json (mcpServers key)       │
│                                                                  │
│     Docker-hosted:                                               │
│     - content/docker/**/config.yaml (mcp_servers key)            │
│                                                                  │
│  2. For each server found:                                       │
│     - WebSearch package name on npm/PyPI/GitHub                  │
│     - WebFetch package page for download counts, maintenance     │
│     - Write mcp_reputation + researched_at                       │
│                                                                  │
│  3. Write mcp_servers array to skillset.yaml                     │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  `npx skillsets audit` (Tier 1 — structural validation)          │
│                                                                  │
│  Single TypeScript validation engine (cli/src/lib/validate-mcp)  │
│  Testable with vitest. Runs locally AND in CI (same code path).  │
│                                                                  │
│  Existing checks: schema, required files, checksums              │
│  New MCP checks:                                                 │
│                                                                  │
│  1. Collect MCP servers from content:                            │
│     - .mcp.json, settings.json, settings.local.json              │
│     - content/docker/**/config.yaml (mcp_servers key)            │
│                                                                  │
│  2. Parse mcp_servers from skillset.yaml                         │
│                                                                  │
│  3. Bidirectional cross-check (name + command/args/url):         │
│     - Content→manifest: every content server declared            │
│     - Manifest→content: every manifest entry exists in content   │
│     - Docker images exist in compose services                    │
│                                                                  │
│  4. Truth table:                                                 │
│     ┌──────────────────────┬──────────────────┬────────┐         │
│     │ Content has MCPs     │ Manifest declares │ Result │         │
│     ├──────────────────────┼──────────────────┼────────┤         │
│     │ Yes                  │ Yes, matches      │ Pass   │         │
│     │ Yes                  │ No                │ Fail   │         │
│     │ No                   │ Yes               │ Fail   │         │
│     │ No                   │ No                │ Pass   │         │
│     └──────────────────────┴──────────────────┴────────┘         │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
`npx skillsets submit` (gates on audit passing)
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  CI (.github/workflows/validate-submission.yml)                  │
│                                                                  │
│  Thin gate — runs `npx skillsets audit` on changed dirs.         │
│  Same validation, no bash reimplementation.                      │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Build Pipeline (site/scripts/build-index.ts)                    │
│                                                                  │
│  - SkillsetYaml interface gains mcp_servers                      │
│  - buildSkillsetEntry() passes mcp_servers to SearchIndexEntry   │
│  - search-index.json carries mcp_servers per skillset            │
└─────────────────────────────────────────────────────────────────┘
         │
         ├──────────────────────────────┐
         ▼                              ▼
┌──────────────────────┐  ┌──────────────────────────────────────┐
│  CLI install          │  │  Site browse/detail                   │
│                       │  │                                       │
│  1. Fetch metadata    │  │  Browse: MCP indicator badge          │
│     from search index │  │  Detail: Server list with types,      │
│                       │  │          commands, reputation,         │
│  2. If mcp_servers:   │  │          "as of [date]" qualifier     │
│     - Stop spinner    │  │                                       │
│     - Print inventory │  │                                       │
│     - Print GitHub    │  └──────────────────────────────────────┘
│       review link     │
│     - Prompt [y/N]    │
│     - N → exit        │
│     - Y → continue    │
│                       │
│  3. degit clone       │
│  4. Verify checksums  │
│  5. Success           │
└──────────────────────┘
```

### CLI Install Flow (detailed)

Warning fires BEFORE degit. Data comes from search index, not from installed files.

```
install(skillsetId, options)
  │
  ├── detectConflicts()
  ├── backup if requested
  │
  ├── fetchSkillsetMetadata(skillsetId)  ◄── search-index.json
  │     │
  │     └── metadata.mcp_servers exists?
  │           │
  │           ├── No  → proceed to degit
  │           │
  │           └── Yes → stop spinner
  │                     print server inventory
  │                     print GitHub review link
  │                     prompt [y/N]
  │                       │
  │                       ├── N → exit (no files written)
  │                       └── Y → proceed to degit
  │
  ├── degit clone
  ├── verifyChecksums()
  └── success
```

`--force` and `--yes` do NOT bypass the MCP prompt. Only `--accept-mcp` does.

**Non-interactive environments:** When `!process.stdin.isTTY` and MCP servers are present and `--accept-mcp` is not passed, exit immediately with error code 1 and message: `"This skillset includes MCP servers. Use --accept-mcp to install in non-interactive environments."` Do not attempt to prompt.

### `init` audit-skill distribution

Replace embedded string literals with degit fetch:

```
init(options)
  │
  ├── gather user input (name, description, etc.)
  ├── create structure (skillset.yaml, README.md, PROOF.md, content/)
  │
  └── install audit-skill
        │
        ├── OLD: writeFileSync(AUDIT_SKILL_MD) + writeFileSync(AUDIT_CRITERIA_MD)
        │
        └── NEW: degit('skillsets-cc/main/tools/audit-skill', '.claude/skills/audit-skill')
```

Contributors always get latest criteria. No CLI release needed for criteria changes.

**Production dependency:** `tools/audit-skill/` must survive the sync-to-prod workflow. The current strip list (`sync-to-prod.yml`) removes `.claude/`, `CLAUDE.md`, `docker/`, `PROCESS_DOCS/` but preserves `tools/`. Add a comment in the workflow to document this requirement.

## Implementation Details

### Files to Modify

| File | Change |
|------|--------|
| `schema/skillset.schema.json` | Add `mcp_servers` to properties with conditional requirements |
| `tools/audit-skill/CRITERIA.md` | Expand MCP section: reputation research, transport risk, supply chain flags, Docker scanning |
| `tools/audit-skill/SKILL.md` | Add `WebSearch, WebFetch` to allowed-tools (mandatory) |
| `site/scripts/build-index.ts` | Add `mcp_servers` to `SkillsetYaml` interface and `buildSkillsetEntry()` |
| `site/src/types/index.ts` | Add `mcp_servers` to `SearchIndexEntry` and `Skillset` |
| `cli/src/types/index.ts` | Add `mcp_servers` to `SearchIndexEntry` and `Skillset` |
| `cli/src/commands/install.ts` | Add MCP warning + `[y/N]` prompt before degit |
| `cli/src/commands/init.ts` | Replace embedded audit-skill with degit fetch from `tools/audit-skill/` |
| `cli/src/index.ts` | Add `--accept-mcp` option to install command |
| `cli/src/lib/validate-mcp.ts` | MCP cross-check module (bidirectional name + content matching) |
| `cli/src/commands/audit.ts` | Call `validateMcpServers()` as part of Tier 1 audit |
| `.github/workflows/validate-submission.yml` | Add `npx skillsets audit` step alongside existing checks (defense in depth) |
| `site/src/pages/skillset/[namespace]/[name].astro` | Display MCP server list on detail page |
| `site/src/components/SkillsetGrid.tsx` | Add MCP indicator badge on browse page cards |
| `skillsets/@supercollectible/The_Skillset/skillset.yaml` | Add `mcp_servers` field (litellm-proxy docker + context7 + filesystem inner servers) |
| `.github/workflows/sync-to-prod.yml` | Add comment preserving `tools/` for degit distribution |

### Files to Create

| File | Purpose |
|------|---------|
| `cli/src/lib/__tests__/validate-mcp.test.ts` | Unit tests for MCP cross-check logic (vitest) |
| `cli/src/lib/__tests__/fixtures/mcp-native/` | Fixture: skillset with `.mcp.json` + matching manifest |
| `cli/src/lib/__tests__/fixtures/mcp-docker/` | Fixture: skillset with Docker config + matching manifest |
| `cli/src/lib/__tests__/fixtures/mcp-mismatch/` | Fixture: manifest with wrong command/args (should fail) |
| `cli/src/lib/__tests__/fixtures/mcp-undeclared/` | Fixture: content has MCP but manifest doesn't (should fail) |

### CRITERIA.md Expansion (MCP section)

The current MCP section (lines 115-144) covers surface hygiene only. Expand to:

**Per-server evaluation:**
- Purpose justification: does the README explain why this server is needed?
- Transport risk: stdio (local execution) vs http (remote data transmission via Streamable HTTP)
- Package reputation via WebSearch/WebFetch:
  - npm/PyPI: download counts, last publish date, maintainer
  - GitHub: stars, open issues, last commit
  - Container images: registry, publisher, pull counts
- Version pinning: flag unpinned `npx -y` as a warning; recommend pinned versions
- Least privilege: read-only vs read-write, scoped paths vs broad access
- Alternative analysis: could a local tool replace a remote MCP?

**Docker-specific evaluation:**
- Container image reputation (same web lookup)
- What MCP servers run inside the container
- Port exposure and volume mounts
- README must document the Docker setup and what it runs
- **Convention note:** CI scans `content/docker/**/config.yaml` for the `mcp_servers` key. This is currently based on LiteLLM's config format (the only Docker MCP provider in the registry). Contributors using other Docker MCP providers must declare their servers in the same `mcp_servers` key structure, or document an alternative config path for CI scanning.

**Runtime caveat (must include in audit report):**
MCP packages are fetched at runtime and may have changed since audit. `researched_at` captures when the lookup was performed, not ongoing validity.

### Audit Validation Module (`cli/src/lib/validate-mcp.ts`)

Single TypeScript module that owns all MCP cross-check logic. Called by `npx skillsets audit` locally and by CI via the same command. Testable with vitest against fixture skillsets.

```typescript
interface McpValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates MCP server declarations between content files and skillset.yaml.
 * Bidirectional: content→manifest and manifest→content.
 * Checks name, command/args (stdio), url (http), and Docker inner servers.
 */
export function validateMcpServers(skillsetDir: string): McpValidationResult;
```

**Audit integration:** The `audit` command calls `validateMcpServers()` as check #9. The result is added to the `AuditResults` interface as `mcpServers: AuditResult`, included in the `allPassed` boolean, rendered as a row in the report summary table (`MCP Servers | status | details`), and detailed in a "9. MCP Server Validation" findings section.

**What it checks:**

1. **Collect from content** — parse `content/.mcp.json`, `content/.claude/settings.json`, `content/.claude/settings.local.json` for native servers; parse `content/docker/**/config.yaml` for Docker servers (by `mcp_servers` key)
2. **Collect from manifest** — parse `mcp_servers` array in `skillset.yaml`
3. **Bidirectional name check** — every content server must be in the manifest, every manifest entry must be in content
4. **Content-level matching** — for each matched server, compare command+args (stdio), url (http), or command+args (Docker inner servers). Mismatch = fail.
5. **Docker image check** — each `type: "docker"` entry's image must exist in a `docker-compose.yaml` service (cross-references infrastructure; config files remain the source of truth for MCP declarations)

**Truth table** (applies to both native and Docker):

| Content has MCPs | Manifest declares | Result |
|-----------------|-------------------|--------|
| Yes | Yes, matches | Pass |
| Yes | No | Fail |
| No | Yes | Fail |
| No | No | Pass |

### CI Integration

CI calls the same `audit` command — no bash reimplementation:

```yaml
- name: Run skillsets audit
  run: |
    for dir in ${{ steps.changed.outputs.dirs }}; do
      cd "$dir"
      npx skillsets@latest audit || EXIT_CODE=1
      cd "$GITHUB_WORKSPACE"
    done
    exit ${EXIT_CODE:-0}
```

This augments (not replaces) existing CI steps. Existing bash checks for schema validation, required files, content structure, secrets scanning, and author verification are preserved — they provide defense in depth. The audit command adds MCP validation as a new step alongside them.

### Search Index Pipeline

`site/scripts/build-index.ts` changes:

```typescript
// Add to SkillsetYaml interface
interface SkillsetYaml {
  // ... existing fields
  mcp_servers?: McpServer[];
}

// Add to SearchIndexEntry
interface SearchIndexEntry {
  // ... existing fields
  mcp_servers?: McpServer[];
}

// Pass through in buildSkillsetEntry()
return {
  // ... existing fields
  mcp_servers: manifest.mcp_servers,
};
```

Type definition (mirrored in both `site/src/types/index.ts` and `cli/src/types/index.ts`):

```typescript
interface McpServerInner {
  name: string;
  command: string;
  args?: string[];
  mcp_reputation: string;
  researched_at: string;
}

interface McpServer {
  name: string;
  type: 'stdio' | 'http' | 'docker';
  command?: string;
  args?: string[];
  url?: string;
  image?: string;
  servers?: McpServerInner[];
  mcp_reputation: string;
  researched_at: string;
}
```

### CLI Install Warning

```
⚠  This skillset includes MCP servers:

  Claude Code managed:
    stdio: context7 (npx -y @upstash/context7-mcp)
      Reputation: npm: @upstash/context7-mcp, 50k weekly downloads (as of 2026-02-04)

  Docker hosted:
    image: ghcr.io/berriai/litellm:main-latest
      Reputation: ghcr: berriai/litellm, widely used LLM proxy (as of 2026-02-04)
      Runs: context7, filesystem

  MCP packages are fetched at runtime and may have changed since audit.

  Review before installing:
    https://github.com/skillsets-cc/main/tree/main/skillsets/@user/name/content

  Install MCP servers? [y/N]
```

## Appendix: Adversarial Review Issues Addressed

| # | Issue | Resolution |
|---|-------|------------|
| 1 | `additionalProperties: false` blocks new field | Add to `properties`, keep schema_version at `"1.0"` |
| 2 | Transport enum missing `sse` | ~~Enum: `["stdio", "http", "sse", "docker"]`~~ SSE deprecated in MCP spec (2025-03-26); removed. Enum: `["stdio", "http", "docker"]` |
| 3 | `command`/`url` conditionally required | JSON Schema `if`/`then` per type |
| 4 | `command` + `args` normalization | Mirror `.mcp.json` structure: separate fields |
| 5 | `reputation` naming | Renamed to `mcp_reputation` |
| 6 | Search index pipeline missing | Added `build-index.ts`, both type files to file list |
| 7 | CI matching algorithm unspecified | Match by name (exact string), cross-validate type + command/args or url |
| 8 | Only checks `.mcp.json` | CI scans `.mcp.json`, `.claude/settings.json`, `.claude/settings.local.json` |
| 9 | Four-case truth table not explicit | Truth table in CI validation section (separate tables for native and Docker) |
| 10 | Malformed `.mcp.json` handling | CI uses `jq`; parse failure = step failure |
| 11 | Warning must fire before degit | Explicit: metadata from search index, prompt before clone |
| 12 | `--force`/`--yes` bypass MCP consent | Separate `--accept-mcp` flag |
| 13 | GitHub review URL wrong | Fixed to full path |
| 14 | Nondeterministic audits | WebSearch/WebFetch mandatory; nondeterminism accepted |
| 15 | `init.ts` embeds audit-skill | Replace with degit fetch from `tools/audit-skill/` |
| 16 | The_Skillset copies in file list | Removed; audit-skill is registry infrastructure |
| 17 | Runtime rug-pull risk | CLI warning includes runtime caveat; recommend version pinning |
| 18 | No test fixture | Create mock skillsets with `.mcp.json` and Docker MCP configs |
| 19 | `additionalProperties: false` missing on MCP items schema | Added to both item and inner `servers` item levels. Compatible with `allOf`/`if`/`then` because `then` only adds `required`, not new properties |
| 20 | `if/then` blocks missing `required: ["type"]` | Added `required: ["type"]` to each `if` block per canonical JSON Schema pattern |
| 21 | `mcp_reputation`/`researched_at` optional — can be stripped post-audit | Made required on all server entries with `minLength: 20` on reputation |
| 22 | Docker CI can't detect undeclared MCP from compose files | Docker MCP servers are declared in config YAML files under `content/docker/` (e.g., `config.yaml` with `mcp_servers` key), not in compose files. CI scans these bidirectionally, same as native |
| 23 | CI doesn't scan `.claude/settings.local.json` | Added to CI scan list alongside `.mcp.json` and `settings.json` |
| 24 | Non-interactive env hangs on MCP prompt | Exit with error when `!process.stdin.isTTY` and `--accept-mcp` not passed |
| 25 | `additionalProperties: false` fragile with `allOf`/`if`/`then` composition | Switched to `unevaluatedProperties: false` (Draft 2020-12 keyword); resolves properties across subschemas. ajv already runs `--spec=draft2020` |
| 26 | CI name-only matching allows command/args substitution | Added content-level matching: CI compares command+args (stdio) and url (http) between manifest and content sources, plus command+args for Docker inner servers |
| 27 | Docker config convention undocumented | Noted in CRITERIA.md expansion as LiteLLM-specific convention; other Docker MCP providers must use same `mcp_servers` key structure |
| 28 | The_Skillset will fail new CI checks (no `mcp_servers` in manifest) | Added to files-to-modify: migrate `skillset.yaml` with Docker MCP entries in same PR |
| 29 | Browse page badge mentioned but no implementation target | Added `SkillsetGrid.tsx` to files-to-modify table |
| 30 | GitHub review URL hardcodes `.mcp.json` (breaks for Docker-only skillsets) | Changed to link to skillset's `content/` directory |
| 31 | No `maxItems` on `mcp_servers` array (search index bloat risk) | Added `maxItems: 20` on `mcp_servers`, `maxItems: 10` on inner `servers` |
| 32 | `tools/` survival in sync-to-prod is implicit | Added preservation note + comment task for `sync-to-prod.yml` |
| 33 | Tier 1 audit and CI duplicate validation logic | Consolidated: `audit` command owns all structural + MCP validation in TypeScript (`validate-mcp.ts`), testable with vitest. CI calls `npx skillsets audit`. `submit` gates on audit passing. No bash reimplementation. |
