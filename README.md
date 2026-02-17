# Skillsets.cc

**Skillsets.cc** is the trust layer missing in the Claude Code ecosystem. We are building out the high-signal path between power users and the rest of the community: it's a reputation foundry for creators, a low-noise discovery engine for users, and content generator that promotes the newest hotness.

## What is a Skillset?

A **skillset** is an integrated Claude Code workflow that actually met the bar. Expertly forged combinations of skills, agents, commands, hooks, plugins, MCP servers, custom support-stacks, in unholy union and at your service. We only accept complete workflows that have shipped real software, with clear documentation and evidence of production use.

## The Bar

Contributions are limited to bi-monthly cohorts of 10. Every submission passes through three verification tiers before it reaches the registry.

**Structural audit** validates manifest schema, required files, content structure, file sizes, binary detection, secrets scanning, and README links. If the structure isn't clean, the process stops here.

**Qualitative review.** Our review agent evaluates every primitive — skills, agents, hooks, MCP servers, CLAUDE.md — against published [criteria](./tools/audit-skill/CRITERIA.md). Third-party MCP servers and runtime dependencies are researched for provenance and reputation. A safety scan checks all primitives for prompt injection and exfiltration. The reviewer then searches the contributor's reference repo for collaboration artifacts — design docs, execution docs, analysis reports — as evidence the skillset actually shipped software. Findings are appended to the audit report with a verdict.

**Human approval.** A maintainer reviews the production proof, the documentation, and both audit tiers, then signs off. CI re-runs structural validation on the final PR state.

The result is a small, high-trust catalog where everything listed has been structurally validated, qualitatively reviewed, and human-approved.

## Browse & Install

Visit [skillsets.cc](https://skillsets.cc) to browse the registry, or search from within Claude Code:

    # Add the curated marketplace (once)
    claude plugin marketplace add skillsets-cc/main

    # Browse and search the registry
    /browse

    # Install a skillset
    /install <name>

`/install` is an onboarding agent, not a file extractor. Claude installs the skillset, then walks you through customizing it for your project — so you land in a working environment, not a pile of extracted files.

## We All Want To Learn From You

You built a high-dimensional skillset, not a toy. Give it a dedicated repo, spin up Claude Code, and run the following command:

    /contribute

This is our submission agent. It scaffolds your structure, helps you prepare content and production proof, runs structural validation and the qualitative audit, then submits the PR. The full process and requirements are documented in [CONTRIBUTING.md](./CONTRIBUTING.md).

## What We Solve For

The technical structure solves for five interconnected pain points:

**For end users**, the plugin ecosystem is 200k+ skills with minimal vetting. Marketplaces scrape GitHub with a 2-star minimum as the quality floor. Nothing ships as a complete workflow; you get individual primitives and assemble them yourself, hoping for the best. And installation is file extraction — no guidance on how to configure anything for your project. Skillsets.cc inverts all of that: three verification tiers, checksum verified installs, and an onboarding agent that sets it up with you.

**For contributors**, if you built an integrated Claude Code workflow there's no distribution channel for it. Your production stack sits next to a weekend experiment of dubious provenance and there's no way to tell them apart. Publishing through skillsets.cc gives your work structural validation, a qualitative review, dependency attestation, and a verified listing with built-in promotion. The submission agent runs the full process without ever leaving Claude Code, and the onboarding agent on the install side means your skillset actually gets adopted.

**For the ecosystem**, plugins are cached runtime extensions — great for adding capabilities, but structurally limited to native primitives. They are not speced to configure your core operating environment beyond the basics, with no formal path for custom support stacks. A skillset installs to the project root: CLAUDE.md, .claude/, support stacks, configs — files you own, edit, and adapt. Every version is a diffable commit in the registry, so updates have a real path: /install [Skillset Name] --backup, let Claude diff the two versions, and port your customizations forward. 

**For maintainers**, it's a programmatically constrained workload. Bi-monthly cohorts capped at 10, that only increase when the team grows. Two automated audit tiers gate submissions before human review. The site, auth, and API run as a single Cloudflare Worker. There is no traditional backend to maintain — just a mono-repo, a schema, a three-skill plugin, a CLI, and a three-function Worker.

**For the story**, promotion is baked into the system architecture from the get-go, and largely automated. A submission starts as an anonymous claim visible on the site with a countdown timer, and a **submit announcement**. Visitors see claimed positions filling and timers ticking between publications. It's a reason to check back in. When the PR merges, the identity is revealed in a **merge announcement** templated from the manifest, proof, and audit report. The creator gets a **livestream showcase** — a conversation and live demo — and a **deep dive post**. Four story beats per submission, making each cohort a 40 beat season. The registry stays alive even between editorial posts because something is always in-flight, always resolving.

## Architecture

Three components: a site for discovery, a CLI for execution, and a plugin that orchestrates both natively in Claude Code. All backed by a mono-repo registry.

The site is an Astro 5 application running on Cloudflare Workers. Static pages (homepage, browse, about) are prerendered at build time; skillset detail pages are server-rendered on demand. Interactive elements — search, filtering, star buttons — are React islands hydrated on the client.

Auth uses GitHub OAuth with PKCE, managed entirely within Astro's server routes. Stars and download counts are persisted in Cloudflare KV via API routes in the same worker, with KV-based rate limiting. Slot reservations use a Cloudflare Durable Object for coordination, with batch IDs ({position}.{batch_size}.{cohort}) tracking each slot through reservation, CI verification, and submission. There is no traditional backend — the entire site, auth flow, and API run as a single Cloudflare Worker.

The CLI (`npx skillsets`) is a Node.js Commander.js application distributed via npm. It uses degit for extraction, SHA-256 checksums for verification, Fuse.js for client-side fuzzy search against a CDN-hosted index, and JSON Schema for manifest validation.

The orchestrator plugin is three SKILL.md files (`/browse`, `/install`, `/contribute`) with scoped tool permissions and phase-tracked task flows, distributed through Claude Code's marketplace system via a plugin manifest and a marketplace manifest. The skills wrap the CLI for operations that need interactive prompts or agentic orchestration.

Submissions are GitHub PRs validated by JSON Schema in CI.

## Repository Structure

```
skillsets-cc/
├── site/                         # Astro 5 SSR on Cloudflare Workers
│   ├── src/
│   │   ├── components/           # React islands + Astro components
│   │   ├── lib/                  # Auth, stars, downloads, reservations, data, sanitization
│   │   ├── pages/                # Routes + API endpoints
│   │   ├── types/                # TypeScript interfaces
│   │   └── layouts/              # Base layout
│   └── docs_site/                # Site architecture docs
│
├── cli/                          # npx skillsets (contributor workflow)
│   ├── src/
│   │   ├── commands/             # init, audit, submit
│   │   ├── lib/                  # API client, validation, filesystem, versions
│   │   └── types/                # TypeScript interfaces
│   └── docs_cli/                 # CLI architecture docs
│
├── plugin/                      # Claude Code orchestrator plugin
│   ├── .claude-plugin/          # Plugin manifest
│   └── skills/                  # /browse, /install, /contribute
│
├── .claude-plugin/              # Marketplace manifest
│
├── skillsets/                   # Registry entries
│   └── @{namespace}/
│       └── {name}/
│           ├── skillset.yaml     # Manifest
│           ├── README.md         # Documentation
│           ├── PROOF.md          # Production evidence
│           ├── AUDIT_REPORT.md   # Validation results
│           └── content/          # Files to install
│
├── schema/                       # JSON Schema for skillset.yaml
└── .github/workflows/            # CI validation + site deploy
```

## Links

- [skillsets.cc](https://skillsets.cc) — Browse registry
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Submission guide
- [MAINTAINER_CHECKLIST.md](./MAINTAINER_CHECKLIST.md) — Review process
- [DEPLOYMENT.md](./DEPLOYMENT.md) — CI/CD and Cloudflare Workers
- Module docs: [Site](./site/README.md) | [CLI](./cli/README.md) | [Plugin](./plugin/README.md) | [System ARC](./ARC_skillsets_cc.md)

## License

Registry infrastructure is MIT licensed. Individual skillsets are licensed by their authors.
