# Skillsets.cc Design Document

> The Verified Registry of Agentic Workflows

## Executive Summary

Skillsets.cc is a curated registry of complete, production-verified Claude Code workflows. Unlike SkillsMP (87k+ atomic skills, quantity-focused) or Anthropic's plugin marketplace (official but limited scope), Skillsets.cc indexes **complete production stacks**—validated combinations of skills, agents, prompts, and configurations that have shipped real software.

**Core value proposition**: "I want what actually shipped, not what demos well."

**The first contribution**: [The_Skillset](https://github.com/supercollectible/The_Skillset) — a spec-driven SDLC with adversarial review, quality gates, and multi-model validation.

---

## Rationale

### The Problem

| Issue | Description |
|-------|-------------|
| **Fragmentation** | Individual skills conflict when combined (namespace collisions, context window hogging) |
| **Theory vs Practice** | Many skills work in demos but fail in production |
| **Missing Glue** | The value is in orchestration strategies, not individual tools |

### Why Not Existing Solutions?

| Solution | Gap |
|----------|-----|
| **SkillsMP** | 87k skills, 2-star minimum filter. Quantity over quality. No verification skills work together. |
| **Anthropic Plugins** | High quality but limited scope. Official examples, not community production stacks. |
| **Awesome Lists** | Curated but still atomic skills. No interoperability testing. |

### Architecture Decisions

| Decision | Rationale | Alternative Considered | Why Rejected |
|----------|-----------|------------------------|--------------|
| Mono-repo registry | Enables PR diffing, keeps verified snapshots, single source of truth | Poly-repo with index | Can't diff external repos, content can change after approval |
| degit for downloads | No .git folder, caches, extracts subfolders | git clone --depth 1 | Leaves .git folder, can't extract subfolders |
| Astro SSR | Islands architecture allows interactivity (stars, filters) while staying mostly static | Eleventy | No interactivity without full JS framework |
| Cloudflare Pages + Workers | Free tier, minimal serverless code, KV for stars | Vercel/Netlify | Comparable, but Cloudflare KV is simpler than alternatives |
| GitHub OAuth | Real identity for stars, target users already have accounts | localStorage / anonymous | Stars would be meaningless/gameable |
| Folders not zips | Allows PR diffing, keeps repo small (text vs binary history) | Zip uploads | Can't review changes, binary bloat |

---

## Technology Stack

### Site (skillsets.cc)

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Astro 5 (`output: 'server'`) | Static pages prerendered, dynamic routes on-demand |
| **Hosting** | Cloudflare Pages | Free, fast, integrated with Workers |
| **Auth** | GitHub OAuth via Cloudflare Worker | ~50 lines (includes CSRF + PKCE) |
| **Stars** | Cloudflare Worker + KV | ~60 lines (includes rate limiting) |
| **Styling** | Tailwind CSS | Utility-first, tree-shaken, Astro integration |

**Total serverless code**: ~110 lines

**Note**: GitHub OAuth serves dual purpose—authenticates both star actions and contribution submissions.

**Astro 5 Configuration**: Use `output: 'server'` with `export const prerender = true` on static pages (`/`, `/contribute`). Dynamic routes (`/skillset/:ns/:name`) render on-demand.

### Registry (GitHub)

| Component | Technology |
|-----------|------------|
| **Storage** | GitHub mono-repo (`skillsets-cc/registry`) |
| **Submissions** | GitHub Pull Requests |
| **CI Validation** | GitHub Actions |
| **Schema** | JSON Schema for `skillset.yaml` |

### CLI

| Component | Technology |
|-----------|------------|
| **Distribution** | `npx skillsets` |
| **Installation** | degit (subfolder extraction) |
| **Verification** | SHA-256 checksum comparison |
| **Dependencies** | Minimal (degit + crypto) |

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         skillsets.cc                                 │
│                    (Cloudflare Pages + Workers)                      │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │   Astro     │  │   GitHub    │  │   Star      │                  │
│  │   Static    │  │   OAuth     │  │   Worker    │                  │
│  │   Site      │  │   Worker    │  │   + KV      │                  │
│  └──────┬──────┘  └─────────────┘  └─────────────┘                  │
│         │                                                            │
└─────────┼────────────────────────────────────────────────────────────┘
          │ fetches at build time
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    skillsets-cc/registry                             │
│                       (GitHub Mono-repo)                             │
│                                                                      │
│  skillsets/                                                          │
│  ├── @supercollectible/                                              │
│  │   └── The_Skillset/                                               │
│  │       ├── skillset.yaml          ◄── Manifest                     │
│  │       ├── README.md              ◄── User instructions            │
│  │       ├── AUDIT_REPORT.md        ◄── Structural validation        │
│  │       └── content/               ◄── Files to install             │
│  │           ├── .claude/                                            │
│  │           ├── TheSkillset/                                        │
│  │           └── CLAUDE.md                                           │
│  └── @another-user/                                                  │
│      └── Another_Skillset/                                           │
│                                                                      │
│  schema/                                                             │
│  └── skillset.schema.json           ◄── Validation schema            │
│                                                                      │
│  .github/workflows/                                                  │
│  ├── validate-submission.yml        ◄── PR validation                │
│  └── deploy-site.yml                ◄── Trigger site rebuild         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
          ▲
          │ npx degit skillsets-cc/registry/skillsets/@user/name
          │
┌─────────────────────────────────────────────────────────────────────┐
│                         npx skillsets                                │
│                        (CLI Tool)                                    │
│                                                                      │
│  Commands:                                                           │
│  ├── search <query>    ── Fuzzy search against CDN-hosted index      │
│  ├── install <name>    ── degit to current directory + verify        │
│  └── verify            ── SHA-256 checksum against registry          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Search Architecture

CLI search uses a **build-time index**, not GitHub API queries:

1. **Build time**: GitHub Action generates `search-index.json` containing name, description, tags, author, stars, checksums
2. **CDN delivery**: Index served from Cloudflare Pages as static file
3. **Client-side search**: CLI fetches index, runs Fuse.js fuzzy search locally
4. **Zero runtime API dependency**: No GitHub API rate limits for discovery

```json
// search-index.json (generated at build)
{
  "version": "1.0",
  "generated_at": "2026-01-30T12:00:00Z",
  "skillsets": [
    {
      "id": "@supercollectible/The_Skillset",
      "name": "The_Skillset",
      "description": "Spec-driven SDLC with adversarial review",
      "tags": ["sdlc", "planning", "multi-agent"],
      "author": "@supercollectible",
      "stars": 42,
      "version": "1.0.0",
      "checksum": "sha256:abc123...",
      "files": {
        "content/CLAUDE.md": "sha256:def456...",
        "skillset.yaml": "sha256:ghi789..."
      }
    }
  ]
}
```

### Checksum Verification

| Aspect | Specification |
|--------|---------------|
| **Algorithm** | SHA-256 |
| **Storage** | `search-index.json` (per-skillset and per-file) |
| **Computed** | At PR merge (GitHub Action) |
| **On mismatch** | Error + reinstall prompt |

**Verification flow:**
1. `npx skillsets verify` computes SHA-256 of local installed files
2. Fetches `search-index.json` from CDN
3. Compares local hashes against registry checksums
4. Mismatch → error with `npx skillsets install --force` suggestion

### OAuth Security

GitHub OAuth flow with CSRF protection and PKCE:

1. **Login initiate**: Worker generates cryptographically random `state` + PKCE `code_verifier`, stores in KV with 5-minute TTL
2. **Redirect to GitHub**: Include `state` and `code_challenge` (SHA-256 of verifier)
3. **Callback validation**: Verify `state` matches KV, exchange code with `code_verifier`
4. **Session binding**: JWT stored in `httpOnly` cookie (not localStorage)

```
User          Worker (KV)           GitHub
  │                │                   │
  │ /login ───────►│                   │
  │                │ store(state,      │
  │                │   code_verifier)  │
  │ ◄──redirect────│                   │
  │ ─────────────────────────────────►│
  │                                    │ authorize
  │ ◄────────callback?code&state──────│
  │ ───────────────►│                   │
  │                │ validate(state)   │
  │                │ exchange(code,    │
  │                │   code_verifier)  │
  │ ◄──httpOnly────│                   │
  │    cookie      │                   │
```

### Star Rate Limiting

Cloudflare KV has 1 write/second soft limit per key. Mitigation:

| Strategy | Implementation |
|----------|----------------|
| **User rate limit** | KV-based rate limiting: 10 star ops/minute per user (custom Worker implementation, not Cloudflare native) |
| **Write queue** | Exponential backoff on 429 responses from KV itself |
| **Optimistic UI** | Show star immediately, reconcile async |
| **Eventual consistency** | Stars may be ~60s stale; documented in UX |

### Site Routes

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/` | Browse skillsets, search, filter | No (view), Yes (star) |
| `/login` | GitHub OAuth flow | — |
| `/skillset/:namespace/:name` | Detail page, proof gallery, audit badge | No (view), Yes (star) |
| `/contribute` | Submission guide + `/audit-skill` skill download | No |


### Data Flow: Submission

```
Contributor                    skillsets.cc/contribute           GitHub
    │                                   │                           │
    │  1. Downloads /audit-skill ◄───│                           │
    │     skill from /contribute        │                           │
    │                                   │                           │
    │  2. Prepares skillset locally     │                           │
    │                                   │                           │
    │  3. Runs /audit-skill locally  │                           │
    │     (generates AUDIT_REPORT.md)   │                           │
    │                                   │                           │
    │  4. Opens PR with:                │                           │
    │     - skillset folder             │                           │
    │     - AUDIT_REPORT.md             ├──────────────────────────►│
    │     - production proof link       │                           │
    │                                   │                           │
    │                                   │     5. CI validates       │
    │                                   │        schema + files     │
    │                                   │                           │
    │                                   │     6. Maintainer reviews │
    │                                   │        production proof   │
    │                                   │                           │
    │  7. PR merged ◄───────────────────┼───────────────────────────│
    │                                   │                           │
    │                                   │     8. Site rebuild       │
    │                                   │        triggered          │
```

### Lifecycle Management

Contributors are responsible for maintaining their skillsets. All lifecycle operations are PR-based:

| Action | Process |
|--------|---------|
| **Update** | Open PR with changes to your skillset folder. CI validates, maintainer merges. |
| **Deprecate** | Open PR changing `status: "deprecated"` in `skillset.yaml`. Skillset remains visible with deprecation badge. |
| **Archive** | Open PR changing `status: "archived"`. Skillset hidden from search but still installable via direct URL. |
| **Remove** | Open PR deleting your skillset folder entirely. Permanent removal from registry. |

**Note**: Only the original author (matched by GitHub handle) can modify or remove their skillset.

---

## Protocol/Schema

### skillset.yaml

```yaml
schema_version: "1.0"

# Identity
name: "The_Skillset"
version: "1.0.0"  # semver, for changelog/metadata
description: "Spec-driven SDLC with adversarial review and quality gates."
author:
  handle: "@supercollectible"
  url: "https://github.com/supercollectible"

# Verification (the friction)
verification:
  production_url: "https://example.com/shipped-product"  # or GitHub repo
  production_proof: "./PROOF.md"        # Screenshots, video links, testimonials
  audit_report: "./AUDIT_REPORT.md"     # Generated by audit tool

# Discovery
tags: ["sdlc", "planning", "multi-agent", "adversarial-review"]
compatibility:
  claude_code_version: ">=1.0.0"
  languages: ["any"]                    # or ["python", "typescript"]

# Lifecycle
status: "active"                        # active | deprecated | archived

# Content
entry_point: "./content/CLAUDE.md"      # Main file users should read
```

**Version field**: For changelog semantics and metadata. Users always get latest; version history lives in git.

### JSON Schema (for CI validation)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["schema_version", "name", "version", "description", "author", "verification", "tags"],
  "properties": {
    "schema_version": { "const": "1.0" },
    "name": { "type": "string", "pattern": "^[A-Za-z0-9_-]+$" },
    "version": { "type": "string", "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+$" },
    "description": { "type": "string", "maxLength": 200 },
    "author": {
      "type": "object",
      "required": ["handle"],
      "properties": {
        "handle": { "type": "string" },
        "url": { "type": "string", "format": "uri" }
      }
    },
    "verification": {
      "type": "object",
      "required": ["production_url", "audit_report"],
      "properties": {
        "production_url": { "type": "string", "format": "uri" },
        "production_proof": { "type": "string" },
        "audit_report": { "type": "string" }
      }
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1
    },
    "compatibility": {
      "type": "object",
      "properties": {
        "claude_code_version": { "type": "string" },
        "languages": { "type": "array", "items": { "type": "string" } }
      }
    },
    "status": { "type": "string", "enum": ["active", "deprecated", "archived"], "default": "active" },
    "entry_point": { "type": "string" }
  }
}
```

---

## Implementation Details

### Phase 1: Registry Structure

**Deliverables:**
- `skillsets-cc/registry` GitHub repo
- Folder structure with The_Skillset as first entry
- `skillset.schema.json`
- GitHub Actions for PR validation
- CONTRIBUTING.md with submission guide

**File structure:**
```
skillsets-cc/registry/
├── skillsets/
│   └── @supercollectible/
│       └── The_Skillset/
│           ├── skillset.yaml
│           ├── README.md
│           ├── AUDIT_REPORT.md
│           └── content/
│               └── (copied from The_Skillset repo)
├── schema/
│   └── skillset.schema.json
├── .github/
│   └── workflows/
│       └── validate.yml
├── CONTRIBUTING.md
└── README.md
```

### Phase 2: Static Site

**Deliverables:**
- Astro project in `skillsets-cc/site` repo (or same repo, `/site` folder)
- Cloudflare Pages deployment
- GitHub OAuth Worker
- Star/unstar Worker + KV namespace
- Routes: `/`, `/skillset/:ns/:name`, `/contribute`, `/login`

**Build process:**
1. GitHub Action triggers on push to `registry/` (or via repository_dispatch if separate repos)
2. Reads all `skillset.yaml` files from registry filesystem
3. Generates `search-index.json` with checksums and star counts from KV
4. Builds Astro static pages for each skillset
5. Deploys to Cloudflare Pages

### Phase 3: CLI

**Deliverables:**
- `skillsets` npm package
- Commands: `search`, `install`, `verify`
- Build-time search index integration
- SHA-256 verification
- Conflict resolution strategy

**Example usage:**
```bash
# Search (uses CDN-hosted index, not GitHub API)
npx skillsets search "adversarial review"

# Install (always latest)
npx skillsets install @supercollectible/The_Skillset

# Verify (SHA-256 check against registry)
npx skillsets verify
```

**Conflict Resolution:**

When installing into a project with existing `.claude/` or `CLAUDE.md`:

| Flag | Behavior |
|------|----------|
| (default) | Error with instructions: "Existing files detected. Use --force or --merge" |
| `--force` | Overwrite all existing files |
| `--merge` | Combine files with conflict markers (`<<<<<<< LOCAL`) |
| `--backup` | Move existing to `.claude.backup/` before install |

### Audit Skill (downloadable from /contribute)

**What it is:** A Claude Code `/audit-skill` skill that contributors download and run locally.

**Flow:**
1. Contributor downloads skill from `/contribute` page
2. Copies to their project's `.claude/skills/`
3. Runs `/audit-skill` in Claude Code session
4. Skill validates structure, generates `AUDIT_REPORT.md`
5. Contributor includes report in PR

**Validation checks:**
- `skillset.yaml` exists and passes schema
- Required files present (`README.md`, `content/` folder)
- `content/` contains `.claude/` or `CLAUDE.md`
- No obvious issues (huge files, binaries, secrets patterns)

**Implementation:**
- Standard Claude Code skill (`.claude/skills/audit-skill/SKILL.md`)
- Hosted in registry repo under `/tools/audit-skill/`
- `/contribute` page links to download

---

## Open Items

| Item | Status | Notes |
|------|--------|-------|
| Namespace format | Decided | `@handle/skillset-name` as folder names |
| Star persistence | Decided | Cloudflare KV |
| Download method | Decided | degit command only (site provides copy button) |
| Audit skill | Decided | `/audit-skill` skill, downloaded from `/contribute`, runs locally |
| Site styling | Decided | Tailwind CSS |
| CLI package name | Decided | `skillsets` (available on npm) |

---

## References

- [PROJECT_BRIEF.md](../../PROJECT_BRIEF.md) — Original concept
- [The_Skillset README](../../README.md) — First contribution / proof of concept
- [SkillsMP](https://skillsmp.com/) — Competing approach (quantity-focused)
- [Anthropic Skills Repo](https://github.com/anthropics/skills) — Official examples
- [degit](https://github.com/Rich-Harris/degit) — Download mechanism
- [Astro Docs](https://docs.astro.build/) — Site framework
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) — Serverless functions
