# Skillsets.cc

A curated registry of production-verified Claude Code workflows.

## What is a Skillset?

A cohesive workflow built on interoperable Claude Code primitives—skills, agents, hooks, plugins, and MCP. Each one has shipped production software, with evidence to prove it.

Unlike atomic skill marketplaces, skillsets.cc indexes validated combinations that work together. Not a list of ingredients—a complete recipe, and proof that the dish has been served.

## Browse & Install

Visit [skillsets.cc](https://skillsets.cc) to browse the registry, or use the CLI:

```bash
npx skillsets search "sdlc"
npx skillsets install @supercollectible/The_Skillset
npx skillsets verify
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
├── skillsets/                    # Registry entries
│   └── @{namespace}/
│       └── {skillset-name}/
│           ├── skillset.yaml     # Manifest
│           ├── README.md         # Documentation
│           ├── PROOF.md          # Production evidence
│           ├── AUDIT_REPORT.md   # Validation results
│           └── content/          # Files to install
├── site/                         # Astro SSR site
├── cli/                          # npx skillsets
├── tools/                        # Audit skill
├── schema/                       # JSON Schema
└── .github/workflows/            # CI validation
```

## Technology

| Component | Implementation |
|-----------|----------------|
| Site | Astro 5 SSR on Cloudflare Workers |
| Auth | GitHub OAuth with PKCE (in Astro) |
| Stars | KV-backed API (in Astro) |
| CLI | Node.js + degit + Fuse.js |
| Validation | JSON Schema + GitHub Actions |

## Links

- [skillsets.cc](https://skillsets.cc) — Browse registry
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Submission guide
- [MAINTAINER_CHECKLIST.md](./MAINTAINER_CHECKLIST.md) — Review process

## License

Registry infrastructure is MIT licensed. Individual skillsets are licensed by their authors.
