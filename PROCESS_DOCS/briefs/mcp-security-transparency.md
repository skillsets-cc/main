# Brief: MCP Security Transparency in Skillsets

## Context

MCPs (Model Context Protocol servers) are the most dangerous primitive a skillset can include. They combine code execution, persistence, and trust amplification:

- `stdio` transport runs arbitrary commands on the user's machine
- `npx -y @pkg` auto-installs and executes unknown npm packages
- `http` transport sends context window contents to remote servers
- `.mcp.json` activates silently every session
- MCP tools are callable by Claude, potentially bypassing safety boundaries
- Packages are pulled at runtime with no pinning or verification

The current audit process has near-zero MCP-specific coverage:

| Layer | Current MCP Coverage |
|-------|---------------------|
| Tier 1 (CLI `audit.ts`) | None. Generic file/secret scanning only. |
| Tier 2 (Opus `/audit-skill`) | Surface hygiene: env var syntax, type field, no hardcoded secrets. ~10 lines in CRITERIA.md. |
| CI validation | None. |
| CLI install flow | None. MCPs land silently. |
| Site browse/detail | None. No MCP visibility. |

## Decision

**Transparency, not security theater.** We're a registry, not a security authority. The approach mirrors standard OSS practice (npm, PyPI, VS Code extensions): surface the risk, don't pretend to eliminate it.

Skillsets are directly associated with the contributor's GitHub account. Contributor identity and reputation are the primary trust mechanism. We add informed consent and honest reporting, not security guarantees.

### What we will do

1. **Make MCP presence visible** at every stage: audit, submission, browse, install
2. **Require opt-in at install time** with a clear warning and link to review the code on GitHub
3. **Have Opus research MCP reputation** during audit (web lookups on packages) and write findings into the manifest
4. **Validate manifest declarations match reality** via CI
5. **Use standard disclaimer language** - registry validates structure and identity, not runtime safety

### What we will not do

- Claim to verify MCP servers are safe
- Build elaborate automated scanning that gives false confidence
- Create a dedicated `/audit-mcp` skill that produces a "SECURE" verdict
- Maintain an allowlist of "trusted" packages (transfers liability to us)

## Implementation Plan

### 1. Expand CRITERIA.md - MCP evaluation criteria

Expand the MCP section in `tools/audit-skill/CRITERIA.md` (and its copy in The_Skillset content) from surface hygiene to attacker-perspective evaluation:

- Purpose justification per server (does README explain why it's needed?)
- Transport risk assessment (stdio vs http, local vs remote)
- Package reputation via web lookup (npm downloads, GitHub repo, maintenance status)
- Least privilege assessment (read-only vs read-write, scoped paths vs broad access)
- Alternative analysis (could a local tool replace a remote MCP?)
- Supply chain flags (`npx -y` with unknown packages, unpinned versions)

This is descriptive reporting, not a pass/fail gate. Opus documents what it finds.

### 2. Update SKILL.md - Add web lookup tools

Add `WebSearch` and `WebFetch` to the audit skill's `allowed-tools` so Opus can check npm/PyPI for package existence, download counts, and maintenance status.

**Files:**
- `tools/audit-skill/SKILL.md`
- `skillsets/@supercollectible/The_Skillset/content/.claude/skills/audit-skill/SKILL.md`

### 3. Opus writes MCP metadata to skillset.yaml

During the Tier 2 audit, Opus appends structured MCP findings to `skillset.yaml` under a new optional field. This travels with the submission and becomes the single source of truth for all downstream consumers.

Example manifest addition:
```yaml
mcp_servers:
  - name: "context7"
    type: "stdio"
    command: "npx -y @upstash/context7-mcp"
    reputation: "npm: @upstash/context7-mcp, 50k weekly downloads, maintained by Upstash"
    researched_at: "2026-02-04"
  - name: "custom-api"
    type: "http"
    url: "https://api.example.com/mcp"
    reputation: "No public package found. Self-hosted endpoint."
    researched_at: "2026-02-04"
```

### 4. Update skillset.schema.json

Add optional `mcp_servers` array to the schema:

```json
"mcp_servers": {
  "type": "array",
  "items": {
    "type": "object",
    "required": ["name", "type"],
    "properties": {
      "name": { "type": "string" },
      "type": { "enum": ["stdio", "http"] },
      "command": { "type": "string" },
      "url": { "type": "string", "pattern": "^https?://" },
      "reputation": { "type": "string" },
      "researched_at": { "type": "string", "format": "date" }
    }
  }
}
```

**File:** `schema/skillset.schema.json`

### 5. CI validation - manifest matches .mcp.json

Add a step to `validate-submission.yml` that parses `content/.mcp.json` (if present) and validates that every server declared there has a corresponding entry in `skillset.yaml`'s `mcp_servers` field. Contributors can't omit or misrepresent MCP presence.

Inverse check too: if `skillset.yaml` declares `mcp_servers` but no `.mcp.json` exists, fail.

**File:** `.github/workflows/validate-submission.yml`

### 6. CLI install - warning + confirmation

When `npx skillsets install` reads a manifest with `mcp_servers`, print a warning with the server inventory and a GitHub link to review the `.mcp.json` before it lands on their machine. Default to N (user must explicitly opt in).

```
  This skillset includes MCP servers:
    stdio: context7 (npx -y @upstash/context7-mcp)
    http:  custom-api (https://api.example.com/mcp)

  Review before installing:
    https://github.com/skillsets-cc/main/.../content/.mcp.json

  Continue? [y/N]
```

**File:** `cli/src/commands/install.ts`

### 7. Site - surface MCP presence

Show MCP server presence on browse and detail pages so it's visible before anyone touches the CLI. A simple indicator, not a security assessment.

**Files:**
- Skillset detail page (`site/src/pages/skillset/[namespace]/[name].astro`)
- Browse page components as needed

## Files to Modify

| File | Change |
|------|--------|
| `tools/audit-skill/CRITERIA.md` | Expand MCP evaluation criteria |
| `tools/audit-skill/SKILL.md` | Add WebSearch, WebFetch to allowed-tools |
| `skillsets/@supercollectible/The_Skillset/content/.claude/skills/audit-skill/CRITERIA.md` | Mirror CRITERIA.md changes |
| `skillsets/@supercollectible/The_Skillset/content/.claude/skills/audit-skill/SKILL.md` | Mirror SKILL.md changes |
| `schema/skillset.schema.json` | Add optional mcp_servers field |
| `.github/workflows/validate-submission.yml` | Add MCP manifest/content consistency check |
| `cli/src/commands/install.ts` | Add MCP warning + confirmation prompt |
| `site/src/pages/skillset/[namespace]/[name].astro` | Surface MCP presence |

## Design Rationale

- **Opus writes to manifest**: Single source of truth. No runtime parsing of `.mcp.json` by CLI or site. Metadata flows through the existing pipeline.
- **CI validates honesty**: Opus could hallucinate or contributors could tamper with manifest after audit. CI cross-checks declarations against actual content.
- **No new skills or tiers**: Fits within existing two-tier audit. Avoids implying security assurance we can't deliver.
- **Default-deny install prompt**: User must type `y`. Friction is the feature.
- **Reputation is context, not verdict**: "50k weekly downloads" is a signal. "SAFE" would be a lie.

## Future: Security Model Page

Add a dedicated page on the site (e.g. `/security`) that explains the trust model plainly:

- What the registry validates (structure, contributor identity, CI consistency checks)
- What the registry does not validate (runtime safety, MCP package integrity over time)
- How traceability works (GitHub identity, audit trail, production proof)
- What users should do before installing (review code on GitHub, check MCP configs)
- Standard OSS liability position

Not a legal page buried in a footer. Linked from the install flow warning, the contribute page, and the skillset detail page. Public-facing version of this brief.

## References

- [VibeSec Skill](https://github.com/BehiSecc/VibeSec-Skill/blob/main/SKILL.md) - Attacker-perspective pattern (web app focused, no MCP coverage). Useful as structural inspiration for CRITERIA.md expansion.
- Current audit criteria: `tools/audit-skill/CRITERIA.md:115-144`
- Current CLI audit: `cli/src/commands/audit.ts`
