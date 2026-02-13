# Skillsets.cc

A curated registry of production-verified Claude Code workflows.

## What is a Skillset?

A cohesive workflow built on interoperable Claude Code primitives—skills, agents, hooks, plugins, and MCP. Each one has shipped production software, with evidence to prove it.

Unlike atomic skill marketplaces, skillsets.cc indexes validated combinations that work together. Not a list of ingredients—a complete recipe, and proof that the dish has been served.

## Browse & Install

Visit [skillsets.cc](https://skillsets.cc) to browse the registry, or use the CLI:

```bash
npx skillsets search "sdlc"
npx skillsets install @supercollectible/Valence
```

## Contributing

Have a production-verified workflow? See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full process.

```bash
npx skillsets init      # Scaffold structure + install audit skill
npx skillsets audit     # Tier 1: structural validation
/audit-skill [AUDIT_REPORT.md] [path/to/reference-repo]  # Tier 2: qualitative review
npx skillsets submit    # Open PR to registry
```

**Requirements:**
- Production proof (URL to live product, repository, or case study)
- Passing audit (both tiers)
- Complete documentation

High friction ensures high quality.

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
├── cli/                          # npx skillsets (Node.js + degit + Fuse.js)
│   ├── src/
│   │   ├── commands/             # list, search, install, init, audit, submit
│   │   ├── lib/                  # API client, checksum, filesystem, versions
│   │   └── types/                # TypeScript interfaces + degit types
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

The site is an Astro 5 application running on Cloudflare Workers. Static pages (homepage, browse, about) are prerendered at build time; skillset detail pages are server-rendered on demand. Interactive elements — search, filtering, star buttons — are React islands hydrated on the client.

Auth uses GitHub OAuth with PKCE, managed entirely within Astro's server routes. Stars and download counts are persisted in Cloudflare KV via API routes in the same worker, with KV-based rate limiting. Slot reservations use a Cloudflare Durable Object for coordination, with batch IDs (`{position}.{batch_size}.{cohort}`) tracking each slot through reservation, CI verification, and submission. There is no traditional backend — the entire site, auth flow, and API run as a single Cloudflare Worker.

The CLI (`npx skillsets`) searches a build-time JSON index hosted on the CDN and installs skillsets via degit, which extracts repository subfolders without cloning. Checksums are verified against the index after extraction.

Submissions are GitHub PRs validated by JSON Schema in CI. Registry entries are folders, not packages — enabling standard PR review and keeping the repo small.

| Component | Implementation |
|-----------|----------------|
| Site | Astro 5 SSR on Cloudflare Workers |
| Auth | GitHub OAuth with PKCE + JWT sessions (in Astro lib/) |
| Stars / Downloads | KV-backed API routes (in Astro pages/api/) |
| Reservations | Durable Object + batch IDs (verify, lookup, submit routes) |
| CLI | Node.js + degit + Fuse.js + `gh` auth for reservations |
| Validation | JSON Schema + GitHub Actions |

## Links

- [skillsets.cc](https://skillsets.cc) — Browse registry
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Submission guide
- [MAINTAINER_CHECKLIST.md](./MAINTAINER_CHECKLIST.md) — Review process
- [DEPLOYMENT.md](./DEPLOYMENT.md) — CI/CD and Cloudflare Workers

## License

Registry infrastructure is MIT licensed. Individual skillsets are licensed by their authors.
