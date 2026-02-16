# Skillsets.cc

Skillsets.cc is the trust layer missing the native Claude Code plugin ecosystem. It is a reputation foundry for plugin creators, and semi-automated content engine with a programmatically constrained maintenance burden.

## What is a Skillset?

A skillset is a Claude Code plugin that met the bar. Skills, agents, commands, hooks, MCP servers. The difference is entirely in what it took to get listed.

There's no shortage of plugins. The hard part isn't discovery — it's trust. Skillsets.cc curates production-verified workflows from builders who shipped real software and can prove it.

## How It Works

Every submission passes through three layers before it reaches the registry.

**Filter.** Automated structural validation rejects low-effort submissions before human attention is required. Schema, secrets scanning, MCP consistency — if the structure isn't right, the process stops here.

**Crucible.** Qualitative Opus review via `/audit-skill` enforces "actually shipped" and "coherent workflow" standards. Production artifacts are verified against a reference repo. Third-party MCP servers are researched and their provenance attested.

**Seal.** Human approval confers the final signal. Merging a PR into the registry means a maintainer validated the production proof, the documentation, and the audit — and signed off.

The result is a small, high-trust catalog. Submissions are batched into bi-monthly cohorts of 7.

### The Process Is the Content

Every step in the process generates something worth looking at, and nothing is bolted on.

A submission starts as an anonymous reservation visible on the site with a countdown timer. Visitors see claimed positions filling and timers ticking before any content ships. When the PR merges, the identity is revealed in a **merge announcement** templated from the manifest, proof, and audit report. The creator gets a streamed **livestream showcase** — a conversation and live demo — and a **deep dive post**. Three content moments per submission, all organic to the process.

Each cohort is a season. Ghost cards fill the gaps between beats. Roughly half the output (merge announcements, state changes) is automatable. The registry stays alive even between editorial posts because something is always in-flight, always resolving.

## Browse & Install

Visit [skillsets.cc](https://skillsets.cc) to browse the registry. Install natively through Claude Code:

    # Add the curated marketplace (once)
    claude plugin marketplace add skillsets-cc/main

    # Browse the registry
    /skillset:browse

    # Install a skillset
    /skillset:install <name>

Or install directly via CLI:

    npx skillsets install <name>

## Contributing

    /skillset:contribute

Claude guides you step by step: detecting your existing `.claude/` structure, scaffolding the submission,
running structural validation, preparing your production proof, and opening the PR. The full process
and requirements are documented in [CONTRIBUTING.md](./CONTRIBUTING.md).

Or use the CLI directly: `npx skillsets init`, `npx skillsets audit`, `npx skillsets submit`.

High friction ensures high quality. Production proof required. Both audit tiers must pass. Infrastructure is MIT-licensed; individual skillsets are licensed by their authors.

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
├── skillsets/                    # Registry entries
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

### Module Documentation

Each module has a `README.md` (file index) and `docs_[name]/ARC_[name].md` (architecture):

| Module | README | ARC |
|--------|--------|-----|
| **Root** | — | [ARC_skillsets_cc.md](./ARC_skillsets_cc.md) |
| **Site** | [site/README.md](./site/README.md) | [ARC_site.md](./site/docs_site/ARC_site.md) |
| **CLI** | [cli/README.md](./cli/README.md) | [ARC_cli.md](./cli/docs_cli/ARC_cli.md) |

## Architecture

Skillsets.cc is a Claude Code marketplace backed by a curated mono-repo.

The site is an Astro 5 application running on Cloudflare Workers. Static pages (homepage, browse, about) are prerendered at build time; skillset detail pages are server-rendered on demand. Interactive elements — search, filtering, star buttons — are React islands hydrated on the client.

Auth uses GitHub OAuth with PKCE, managed entirely within Astro's server routes. Stars and download counts are persisted in Cloudflare KV via API routes in the same worker, with KV-based rate limiting. Slot reservations use a Cloudflare Durable Object for coordination, with batch IDs (`{position}.{batch_size}.{cohort}`) tracking each slot through reservation, CI verification, and submission. There is no traditional backend — the entire site, auth flow, and API run as a single Cloudflare Worker.

The CLI (`npx skillsets`) handles contributor operations: scaffold, audit, and submit. The `/skillset:contribute` skill in the orchestrator plugin wraps this CLI — Claude walks contributors through each step, running `npx skillsets` under the hood. Discovery and installation happen through Claude Code's native plugin system.

Submissions are GitHub PRs validated by JSON Schema in CI.

| Component | Implementation |
|-----------|----------------|
| Marketplace | `marketplace.json` generated from curated registry entries |
| Site | Astro 5 SSR on Cloudflare Workers |
| Auth | GitHub OAuth with PKCE + JWT sessions (in Astro lib/) |
| Stars / Downloads | KV-backed API routes (in Astro pages/api/) |
| Reservations | Durable Object + batch IDs (verify, lookup, submit routes) |
| CLI | Node.js — contributor workflow, wrapped by `/contribute` command |
| Validation | JSON Schema + GitHub Actions |

## Links

- [skillsets.cc](https://skillsets.cc) — Browse registry
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Submission guide
- [MAINTAINER_CHECKLIST.md](./MAINTAINER_CHECKLIST.md) — Review process
- [DEPLOYMENT.md](./DEPLOYMENT.md) — CI/CD and Cloudflare Workers

## License

Registry infrastructure is MIT licensed. Individual skillsets are licensed by their authors.