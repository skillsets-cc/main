# We all want to learn from you!

Skillsets.cc bets there are brilliant Claude Code power users like you out there, who forged integrated workflows and are ready to share. This is the bleeding edge of orchestration and integration. We call these systems *skillsets* and are building out the high-signal path between you and the rest of the community: a reputation foundry for creators, a low-noise discovery engine for users, and content generator that promotes your work. We only accept complete workflows that have shipped real software, with clear documentation and evidence of production use.

## What is a Skillset?

A skillset is a proven, integrated development workflow built on Claude Code primitives — skills, agents, hooks, MCP servers — often alongside infrastructure configs and support stacks. Anything from complete SDLCs to domain specific workflows, battle-tested and actively maintained.

## Why not a plugin?

Plugins are great for adding capabilities to Claude's core toolkit. Skillsets are that core toolkit. It's the operating environment, not an add-on. It installs to the project root — CLAUDE.md, .claude/, support-stack, and everything the workflow needs — because these files are meant to be owned, edited, and versioned with your codebase. Every version is a diffable commit in the registry, so updates have a real path: /install [Skillset Name] --backup, let Claude diff the two versions, and port your customizations forward.Plugins can't deliver that within its spec, and don't ship with integrity checks. Skillset installs are SHA-256 verified against the registry, and every listing has passed structural validation, qualitative Opus review, and human approval.

## Whats in it for you?

You built a high-dimensional skillset, not a toy — but there's no high-signal channel for it. Publishing through skillsets.cc gives your workflow a home where it doesn't drown in noise, clean versioning, and CC integrated distribution. When someone installs your skillset, Claude reads your QUICKSTART.md and walks them through customization interactively — project config, style guides, agent tuning, infra setup — so they land in a working environment, not a pile of extracted files. Submission happens in bimonthly cohorts of 10. Each gets a merge announcement, a live stream demo and a deep dive post.

### Prerequisites

- The skillsets.cc plugin installed 
```
claude plugin marketplace add skillsets-cc/main
/plugin install skillset@skillsets-cc
```
- GitHub CLI (`gh`) installed and authenticated
- NPM installed
- An existing Claude Code workflow with `.claude/` primitives
- Evidence of production use
- A claimed slot reservation at [skillsets.cc](https://skillsets.cc)
- A dedicated repository containing the skillset - this will be the source of truth for the published version of your skillset going forward.

## Submission Flow

All submissions go through `/contribute` — our CC native submission agent that orchestrates the full submission process within CC.

```
/contribute
```

The flow has five phases. Here's what happens at each step and which CLI commands run under the hood.

### Phase 1: Initialize

The skill collects your skillset details — name, description, GitHub handle, tags, production URL — then runs:

```bash
npx skillsets@latest init --name <name> --description <desc> --handle <handle> --production-url <url> --tags <tags>
```

This scaffolds the submission structure, auto-detects existing skillset and support-stack files in your project root, copies them into `content/` (the distribution folder), and installs the `/audit-skill` for qualitative review later. See [Generated Structure](#generated-structure) for what gets created.

### Phase 2: Prepare Content

Claude helps you populate the submission files:

- **`skillset.yaml`** — version, `compatibility.requirements` (support stack prereqs like docker, node >= 20, etc.), `compatibility.languages`
- **`PROOF.md`** — production evidence (at minimum a link to a live product built with the skillset)
- **`content/README.md`** — user-facing documentation: what the skillset does, what's included, how to use it
- **`content/QUICKSTART.md`** — post-install customization guide that `/install` guides the end user through
- **`Generalization`** — replace project-specific details in CLAUDE.md and other primitives with placeholder blanks while preserving structure and logic

### Phase 3: Structural Audit

The agent runs:

```bash
npx skillsets@latest audit
```

This validates manifest schema, required files, content structure, file sizes, binary detection, secrets scanning, README links, version comparison, and MCP consistency. If issues are found, Claude helps resolve them and re-runs until the report shows "READY FOR SUBMISSION." See [Audit Requirements](#audit-requirements) for the full check list.

### Phase 4: Qualitative Review

The agent invokes `/audit-skill` — a project-level skill installed during Phase 1. You provide the path to a reference repo where the skillset was used in production. The review covers:

- **MCP discovery** — scans `content/` for MCP server declarations, researches each package's reputation online, and writes the `mcp_servers` array to `skillset.yaml`
- **Runtime dependency discovery** — scans `content/` for dependency manifests (`package.json`, `requirements.txt`, etc.), evaluates each package, and writes `runtime_dependencies` to `skillset.yaml`
- **Primitive evaluation** — skills, agents, hooks, MCP configs, and CLAUDE.md assessed against [quality criteria](./tools/audit-skill/CRITERIA.md)
- **Safety scan** — checks for prompt injection, exfiltration, and malicious instructions across all primitives
- **Workflow verification** — searches the reference repo for artifacts (design docs, execution docs, analysis reports) that evidence the claimed workflow

Findings are appended to `AUDIT_REPORT.md`. Claude iterates with you on any issues until the verdict is APPROVED.

### Phase 5: Submit

The agent runs:

```bash
npx skillsets@latest submit
```

This re-validates the submisson, forks the registry, creates a branch, copies your submission, and opens a PR. A maintainer reviews your submission before merge.

### The Details:

## README Link Format

Links in your README.md that point to files within your skillset (e.g., skills, agents, resources) must use full GitHub URLs so they work on skillsets.cc. They will not work before merge:

```markdown
<!-- ✓ Correct -->
[SKILL.md](https://github.com/skillsets-cc/main/blob/main/skillsets/%40username/skillset-name/content/.claude/skills/your-skill/SKILL.md)

<!-- ✗ Incorrect - will 404 on skillsets.cc -->
[SKILL.md](content/.claude/skills/your-skill/SKILL.md)
```

Note: Use `%40` for the `@` symbol in the username.

The tier 1 audit (`npx skillsets audit`) will flag relative links that should use this format.

## Production Proof

Your `PROOF.md` must demonstrate real-world usage with any combination of the following:

- Link to live deployed application or public repository
- Metrics (test coverage, deployments, code shipped)
- Links to videos, writeups, or case studies (external links, not embedded)

See [@supercollectible/Valence/PROOF.md](./skillsets/@supercollectible/Valence/PROOF.md) for an example.

## Updating a Skillset

Bump the version in `skillset.yaml`, then run `/contribute` again — it picks up the existing structure and walks through the same five phases. The structural audit will show the version delta (e.g., `Update: 1.0.0 → 1.1.0`).

## Deprecating a Skillset

Update `status` in `skillset.yaml`:
- `"deprecated"` - still discoverable, with warning
- `"archived"` - removed from discovery

## Help

- [Discussions](https://github.com/skillsets-cc/main/discussions) - Questions and feedback
- [Issues](https://github.com/skillsets-cc/main/issues) - Bug reports
- [@supercollectible/Valence](./skillsets/@supercollectible/Valence/) - Complete example
