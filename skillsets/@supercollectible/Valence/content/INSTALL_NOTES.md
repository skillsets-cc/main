# Valence

Welcome! Valence is a spec-driven Claude Code skillset with adversarial review, QA agents, and orchestrated builds.

A lot of tooling in this space optimizes for how little you have to do. Valence optimizes for the quality of what gets built, and how well you understand the system. That's a deliberate design decision, not a gap. Agency over automation.

**What the team does:** gruntwork and signal. It handles mechanical execution — implementation, testing, documentation, cleanup. And it surfaces structured data for your decisions: grounding research against real docs, adversarial critiques from models with different blind spots, claim-by-claim validation verdicts, QA findings by severity. It produces proposals and reports, not decisions.

**What stays with you:**

- **Vision and direction.** The architecture, the UX, the product shape — yours. The team works from your intent, not its own.
- **System comprehension.** Valence surfaces what you need to understand the structure, when you need it. Not a black box. You always know why.
- **Git.** Commits, branches, rollbacks — your responsibility.
- **Complexity routing.** When to `/solve` vs `/build`, when to loop back to `/arch` vs patch in place, when to skip the workflow entirely and just ask Claude — that's judgment, not automation. The primitives are modular for a reason.
- **Decision gates.** Every gate produces a proposal, not a final answer. `/arm` produces a brief for sign-off. `/ar` surfaces critiques for triage. `/breakdown` produces a plan you approve before a single build agent starts.
- **Style guides.** The frontend and backend style guides are living documents. Update them as your stack evolves — the QA agents and build agent treat them as source of truth.
- **Supervision.** Agent teams are experimental. Expect small failures — missed messages, stalled tasks. Expect occasional bigger ones. Watch the team while it works.

**On interruption:** In `/arch`, `/solve`, and `/bugfest`, the lead is reasoning actively. If you see it going wrong — stop it. Contradicting mid-stream is cheaper than correcting a finished design doc.

You're in charge. 

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

Valence_ext runs external models for `/ar` and `/pmatch`. Uses the official MCP SDK (5M+ weekly downloads, Anthropic org) and zod (87M+ weekly downloads). The filesystem and context7 packages are pre-installed for local npx resolution. No lifecycle scripts. Run `cd Valence_ext && npm install` before first use.

### Claude Code Extensions

| Extension | Type | Source | Status |
|-----------|------|--------|--------|
| security-review | native | Claude Code built-in | Available by default |
| code-simplifier | plugin | `claude plugin install code-simplifier` | Install separately |

The `/denoise` skill uses the official Anthropic code-simplifier plugin for post-build cleanup. The `/security-review` skill is built into Claude Code.
