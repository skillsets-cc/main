# Valence

Hey, welcome to Valence, a spec-driven Claude Code skillset with adversarial review, QA agents, and orchestrated builds. Built for agency over automation — you own the decisions, agents handle the execution.

The install agent will walk you through adapting the primitives to your stack. Have fun!

## Dependencies

### MCP Servers

| Server | Type | Command | Reputation |
|--------|------|---------|------------|
| context7 | stdio | `npx @upstash/context7-mcp` | 304k+ weekly downloads, MIT, v2.1.2 |
| filesystem | stdio | `npx @modelcontextprotocol/server-filesystem .` | 137k+ weekly downloads, MIT, Anthropic official |

Context7 provides live library documentation lookup during design and review phases. Published by Upstash, actively maintained. The filesystem server gives external models read-only codebase access — toolAllowlist restricts to read operations only. Both are used by Valence_ext for `/ar` and `/pmatch` with external models.

### Runtime Dependencies

| Path | Manager | Packages | Install Scripts |
|------|---------|----------|-----------------|
| Valence_ext/package.json | npm | @modelcontextprotocol/sdk, server-filesystem, context7-mcp, zod | No |

The Valence_ext stack uses the official MCP SDK (5M+ weekly downloads, Anthropic org) and zod (87M+ weekly downloads) for external model agent running. The filesystem and context7 packages are pre-installed for local npx resolution. No lifecycle scripts. Only needed if you use `/ar` or `/pmatch` with external models (Kimi, GLM-5).

### Claude Code Extensions

| Extension | Type | Source | Status |
|-----------|------|--------|--------|
| security-review | native | Claude Code built-in | Available by default |
| code-simplifier | plugin | `claude plugin install code-simplifier` | Install separately |

The `/denoise` skill uses the official Anthropic code-simplifier plugin for post-build cleanup. The `/security-review` skill is built into Claude Code.
