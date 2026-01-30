# Skillsets.cc Registry

A curated registry of production-verified Claude Code workflows. Unlike atomic skill marketplaces or limited official examples, skillsets.cc indexes **complete production stacks**—validated combinations of skills, agents, prompts, and configurations that have shipped real software.

## What is a Skillset?

A skillset is a complete, production-verified Claude Code workflow that includes:

- **Skills & Agents**: Custom Claude Code skills and agent configurations
- **Prompts**: Proven prompt patterns and templates
- **Configuration**: Project structure and setup instructions
- **Production Proof**: Evidence that this workflow shipped real software

## Repository Structure

```
skillsets-cc/
├── skillsets/               # Namespace folders containing skillsets
│   └── @{namespace}/
│       └── {skillset-name}/
│           ├── skillset.yaml       # Manifest
│           ├── README.md           # Installation/usage guide
│           ├── AUDIT_REPORT.md     # Structural validation
│           └── content/            # Files to install
│               ├── .claude/        # Skills, agents, prompts
│               └── CLAUDE.md       # Project instructions
├── schema/                  # JSON Schema for validation
│   └── skillset.schema.json
├── .github/workflows/       # CI/CD automation
│   ├── validate-submission.yml
│   └── deploy-site.yml
├── CONTRIBUTING.md          # Submission guide
└── MAINTAINER_CHECKLIST.md  # Review checklist
```

## Discovery & Installation

### Browse & Search
Visit [skillsets.cc](https://skillsets.cc) to browse the registry with:
- Fuzzy search across names, descriptions, and tags
- Filter by tags and compatibility
- Star your favorites
- View production proof and audit reports

### CLI Installation
```bash
# Search for skillsets
npx skillsets search "sdlc"

# Install to current directory
npx skillsets install @supercollectible/The_Skillset

# Verify installation integrity
npx skillsets verify
```

## Contributing

Want to share your production-verified Claude Code workflow? See [CONTRIBUTING.md](./CONTRIBUTING.md) for the submission process.

### Quick Start
1. Download the `/audit_skillset` skill from [skillsets.cc/contribute](https://skillsets.cc/contribute)
2. Prepare your skillset locally with `skillset.yaml` manifest
3. Run `/audit_skillset` to generate validation report
4. Open PR with your skillset folder + audit report + production proof
5. Automated CI validates structure and files
6. Maintainer reviews production proof
7. Merge → your skillset is live on skillsets.cc

## Verification Requirements

All submissions must include:
- **Production URL**: Link to live deployment, repository, or case study
- **Audit Report**: Automated validation confirming structure and content
- **Production Proof**: Evidence the workflow shipped real software (screenshots, testimonials, metrics)

This verification process ensures the registry contains only battle-tested, production-ready workflows.

## Core Principles

- **Folders, not zips**: Enables PR diffing and keeps the repo lightweight
- **Static-first architecture**: Fast, scalable, and CDN-cacheable
- **GitHub as source of truth**: No separate backend or database
- **degit for distribution**: Clean installation without .git folders
- **Build-time indexing**: Search via CDN-hosted JSON, not runtime API queries

## Technology Stack

| Layer | Implementation |
|-------|----------------|
| **Registry** | GitHub mono-repo with CI validation |
| **Site** | Astro 5 + Tailwind CSS + Cloudflare Pages |
| **Auth** | GitHub OAuth via Cloudflare Workers |
| **Stars** | Cloudflare Workers + KV namespace |
| **CLI** | Node.js with degit + Fuse.js search |
| **Validation** | JSON Schema + GitHub Actions |

## Links

- **Website**: [skillsets.cc](https://skillsets.cc)
- **Contributing Guide**: [CONTRIBUTING.md](./CONTRIBUTING.md)
- **Maintainer Checklist**: [MAINTAINER_CHECKLIST.md](./MAINTAINER_CHECKLIST.md)
- **JSON Schema**: [schema/skillset.schema.json](./schema/skillset.schema.json)

## License

The registry infrastructure is MIT licensed. Individual skillsets are licensed by their respective authors (see each skillset's `skillset.yaml` for licensing information).
