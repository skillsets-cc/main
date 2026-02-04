# Claude Development Protocol - Skillsets.cc

## 1. Identity & Constraints

**What we're building**: A curated registry of complete, production-verified Claude Code workflows. Unlike atomic skill marketplaces (SkillsMP's 87k+ skills) or limited official examples, skillsets.cc indexes **complete production stacks**—validated combinations of skills, agents, prompts, and configurations that have shipped real software.


**The first contribution**: [The_Skillset](https://github.com/supercollectible/The_Skillset) — a spec-driven SDLC with adversarial review, quality gates, and multi-model validation.

### Design Philosophy
- **First Principles**: Understand the system before you reach for abstractions. Know what the framework hides; know what the library costs. Custom solutions beat cargo-culted patterns. If you need a hack, your model is wrong—fix the design. Actively seek what could break it.
- **Spec-Driven**: Design precedes code. No implementation without a validated plan.
- **Test-Driven**: Tests are written *with* the code, not after. Red → Green → Refactor.
- **Atomic Tasks**: Work is broken into small, verifiable units. 10-15 tasks per feature.
- **Verification-First**: High friction ensures high quality. Proof of production required.

### Hard Constraints (never violate)
- **Mono-repo Registry**: Folders not zips—enables PR diffing and keeps repo small
- **Static-First Architecture**: Astro SSR with `prerender: true` on static pages, dynamic routes on-demand
- **Cloudflare Stack**: Workers + KV (no traditional backend, SSR + static assets in single worker)
- **degit for Distribution**: No .git folder, caches, extracts subfolders
- **GitHub as Auth**: OAuth for both stars and contributions (dual-purpose)
- **Build-Time Index**: Search via CDN-hosted JSON, not runtime GitHub API queries
- **Forward-first**: No backward compatibility unless explicitly instructed

### Architecture Overview

| Layer | Implementation |
|-------|----------------|
| **Site** | Astro 5 (`output: 'server'`) + Tailwind CSS + Cloudflare Workers |
| **Auth** | GitHub OAuth via CSRF + PKCE (in `site/src/lib/auth.ts`) |
| **Stars** | KV-backed with rate limiting (in `site/src/lib/stars.ts`) |
| **Downloads** | KV-backed counter, incremented by CLI on install (in `site/src/lib/downloads.ts`) |
| **CLI** | Node.js `npx skillsets` using degit + Fuse.js search |
| **Registry** | GitHub mono-repo with GitHub Actions validation |
| **Schema** | JSON Schema for `skillset.yaml` validation |

**Data Flow**:
```
┌─────────────────────────────────────────────────────────────────────┐
│                         skillsets.cc                                 │
│                    (Single Cloudflare Worker)                        │
│                                                                      │
│  Astro SSR Worker                                                    │
│  ├── Static pages (/, /browse, /about, /contribute)                  │
│  ├── SSR pages (/skillset/[ns]/[name])                               │
│  ├── Auth routes (/login, /callback, /logout)                        │
│  └── API routes (/api/star, /api/downloads, /api/stats/counts)       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
          │ fetches at build time
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    skillsets-cc/main                                │
│                       (GitHub Mono-repo)                            │
│                                                                     │
│  skillsets/                                                         │
│  ├── @supercollectible/                                             │
│  │   └── The_Skillset/                                              │
│  │       ├── skillset.yaml          ◄── Manifest                    │
│  │       ├── README.md              ◄── User instructions           │
│  │       ├── AUDIT_REPORT.md        ◄── Structural validation       │
│  │       └── content/               ◄── Files to install            │
│  │           ├── .claude/                                           │
│  │           ├── TheSkillset/                                       │
│  │           └── CLAUDE.md                                          │
│                                                                     │
│  schema/                                                            │
│  └── skillset.schema.json           ◄── Validation schema           │
│                                                                     │
│  .github/workflows/                                                 │
│  ├── validate-submission.yml        ◄── PR validation               │
│  └── sync-to-prod.yml              ◄── Deploy to Cloudflare         │
└─────────────────────────────────────────────────────────────────────┘
          ▲
          │ npx degit skillsets-cc/main/skillsets/@user/name
          │
┌─────────────────────────────────────────────────────────────────────┐
│                         npx skillsets                                │
│                        (CLI Tool)                                    │
│                                                                      │
│  Commands:                                                           │
│  ├── search <query>    ── Fuzzy search + live stats from API         │
│  ├── list              ── Browse all + sort by stars/downloads       │
│  └── install <name>    ── degit + verify checksums + track download  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Navigation and Toolkit

### Documentation Map

**Implementation Guides** (in .claude/resources/):

| Guide | Purpose |
|-------|---------|
| **[frontend_styleguide.md](.claude/resources/frontend_styleguide.md)** | Astro + TypeScript + Tailwind patterns |
| **[workers_styleguide.md](.claude/resources/workers_styleguide.md)** | Cloudflare Workers + KV + OAuth patterns |
| **[cli_styleguide.md](.claude/resources/cli_styleguide.md)** | Node.js CLI + degit + Commander patterns |
| **[claude-execution-template.md](.claude/resources/claude-execution-template.md)** | Execution doc structure |
| **[ARC_doc_template.md](.claude/resources/ARC_doc_template.md)** | Module architecture template |
| **[README_module_template.md](.claude/resources/README_module_template.md)** | Module README template |
| **[file_doc_template.md](.claude/resources/file_doc_template.md)** | Per-file doc template |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | CI/CD and Cloudflare Workers deployment |

**Code Documentation** (colocated with code):

Every module follows this documentation structure:
```
[module]/
├── [implementation files]
├── docs_[name]/                    # All docs live here
│   ├── ARC_[name].md               # Module architecture (data flow, patterns, integration)
│   ├── [FileName].md               # Per-file docs (public API, dependencies, key logic)
│   └── [subdir]/[FileName].md      # Nested files mirror source structure
└── README.md                       # Module index (purpose, tree, file table with doc links)
```

**Navigation order**: README → ARC → per-file docs → source code.

| Module | README | ARC | Per-file docs |
|--------|--------|-----|---------------|
| **Site** | `site/README.md` | `site/docs_site/ARC_site.md` | `site/src/[mod]/docs_[mod]/*.md` |
| **CLI** | `cli/README.md` | `cli/docs_cli/ARC_cli.md` | `cli/docs_cli/[subdir]/*.md` |

### Exploration Pattern

1. Reference implementation guides (.claude/resources/) for patterns before writing code
2. Start with `README.md` for module overview and file index
3. Read `ARC_[name].md` for architecture, data flow, and integration points
4. Read per-file docs for public API and dependencies
5. Only parse source code if docs are missing or stale

### Plugins

LSP plugins (`vtsls` for TypeScript) enable precise code navigation. Requires `export ENABLE_LSP_TOOL=1`.

| Use Case | Operation | Benefit |
|----------|-----------|---------|
| Find where function is defined | `goToDefinition` | Jump directly instead of grep |
| Check if code is used anywhere | `findReferences` | Confident dead code detection |
| Get type info without reading file | `hover` | Quick context, fewer tokens |
| Map file structure | `documentSymbol` | Understand module at a glance |
| Search across codebase | `workspaceSymbol` | Find by name, not pattern |
| Check for errors before running | `getDiagnostics` | Catch issues early |

---

## 3. Code Patterns

### Project Structure

This is a multi-module project with two distinct codebases:

```
skillsets.cc/
├── site/                     # Astro SSR site (single Cloudflare Worker)
│   ├── src/
│   │   ├── pages/           # Routes + API endpoints
│   │   ├── components/      # Astro + React components
│   │   ├── layouts/         # Page layouts
│   │   ├── lib/             # Auth, stars, downloads, data, sanitize
│   │   ├── types/           # Shared TypeScript types
│   │   └── styles/          # Global CSS + Tailwind config
│   └── public/              # Static assets + search-index.json
│
├── cli/                      # NPM package
│   ├── src/
│   │   ├── commands/        # search, install, list, init, audit, submit
│   │   ├── lib/             # degit wrapper, checksum utils
│   │   └── index.ts         # CLI entry point
│   └── package.json
│
├── schema/                   # JSON Schema for validation
│   └── skillset.schema.json
│
└── .github/workflows/        # CI/CD
    ├── validate-submission.yml  # PR validation
    └── sync-to-prod.yml        # Deploy to Cloudflare
```

### Module Structure

| Rule | Requirement |
|------|-------------|
| **Single Responsibility** | Each module has one clear purpose |
| **Dependency Direction** | `site` and `cli` are independent; no cross-imports |
| **Barrel Exports** | Each module has `index.ts` exporting public API |
| **Tests Alongside** | Tests in `__tests__/` or `*.test.ts` files |
| **Stateless** | KV is the only persistence; no shared state |

### Frontend Patterns (Astro + Tailwind)

See [frontend_styleguide.md](.claude/resources/frontend_styleguide.md) for complete patterns.

| Pattern | Requirement |
|---------|-------------|
| **Static by Default** | Use `export const prerender = true` on static pages |
| **Islands Architecture** | Interactive components as React islands with `client:load` or `client:visible` |
| **Tailwind Utilities** | Use Tailwind classes; custom CSS only for animations/glassmorphism |
| **Theme Consistency** | Extract colors/spacing to Tailwind config |
| **Type Safety** | TypeScript strict mode; no `any` types |
| **Minimal JS** | Static HTML where possible; JS only for interactivity (stars, filters) |

**Example**: Static page with interactive star button
```astro
---
export const prerender = true;
import StarButton from '@components/StarButton.tsx';
const { skillset } = Astro.props;
---
<div class="glass-surface p-6 rounded-lg">
  <h2 class="text-2xl font-bold">{skillset.name}</h2>
  <StarButton client:load skillsetId={skillset.id} />
</div>
```

### API & KV Patterns

See [workers_styleguide.md](.claude/resources/workers_styleguide.md) for Cloudflare-specific patterns.

| Pattern | Requirement |
|---------|-------------|
| **Stateless** | API routes are stateless; KV is the only persistence |
| **KV for State** | Use Cloudflare KV for stars, downloads, OAuth state (with TTL) |
| **Rate Limiting** | KV-based: 10 star ops/min per user, 30 downloads/hr per IP |
| **Error Handling** | Return proper HTTP status codes via `responses.ts` helpers |
| **Security** | CSRF (state param) + PKCE for OAuth, open redirect protection |
| **Environment Variables** | Secrets via `wrangler secret put` (never committed) |

### CLI Patterns (Node.js)

See [cli_styleguide.md](.claude/resources/cli_styleguide.md) for complete patterns.

| Pattern | Requirement |
|---------|-------------|
| **Commander.js** | Use Commander for CLI framework |
| **degit** | Use degit for repo extraction (no .git folder) |
| **Fuse.js** | Client-side fuzzy search against CDN index |
| **SHA-256 Verification** | Checksum validation against registry |
| **No GitHub API for Search** | Fetch build-time `search-index.json` from CDN |
| **Error Messages** | Clear, actionable error messages with next steps |

**Example**: Install command with verification
```typescript
import degit from 'degit';
import crypto from 'crypto';

async function install(skillsetId: string) {
  const emitter = degit(`skillsets-cc/main/skillsets/${skillsetId}`);
  await emitter.clone('.');

  // Verify checksums
  const index = await fetch('https://skillsets.cc/search-index.json').then(r => r.json());
  const expected = index.skillsets.find(s => s.id === skillsetId);
  // ... checksum comparison
}
```

---

## 4. Testing and Logging

### Test Environment

```bash
# Site (Astro + Vitest)
cd site && npm test

# CLI (Vitest)
cd cli && npm test
```

### Logging Examples

```typescript
// Site/CLI - console is fine for development
console.log('[Skillsets] Fetching index...');
console.error('[Skillsets] Failed to fetch:', error);

// Workers - use console, logs go to Cloudflare dashboard
console.log('[Auth] OAuth callback', { state, code });
console.error('[Stars] Rate limit exceeded', { userId });
```

---

## 5. Schema & Protocol

### skillset.yaml

The manifest that makes skillsets discoverable:

```yaml
schema_version: "1.0"

# Identity
name: "The_Skillset"
version: "1.0.0"  # semver
description: "Spec-driven SDLC with adversarial review and quality gates."
author:
  handle: "@supercollectible"
  url: "https://github.com/supercollectible"

# Verification (the friction)
verification:
  production_links:
    - url: "https://example.com/shipped-product"
  production_proof: "./PROOF.md"
  audit_report: "./AUDIT_REPORT.md"

# Discovery
tags: ["sdlc", "planning", "multi-agent", "adversarial-review"]
compatibility:
  claude_code_version: ">=1.0.0"
  languages: ["any"]

# Lifecycle
status: "active"  # active | deprecated | archived

# Content
entry_point: "./content/CLAUDE.md"
```

### Contributor Flow

1. Download `/audit-skill` skill from `/contribute` page
2. Prepare skillset locally with `skillset.yaml`
3. Run `/audit-skill` to generate `AUDIT_REPORT.md`
4. Open PR with skillset folder + audit report + production proof
5. CI validates schema + files
6. Maintainer reviews production proof
7. PR merged → site rebuild triggered

---

## 6. Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for complete CI/CD and Cloudflare Workers documentation.

**Quick reference**:
- Site runs on Cloudflare Workers (not Pages) for SSR support
- Deploy via GitHub Actions workflow "Sync to Production"
- Manual deploy: `cd site && npm run build && npx wrangler deploy`
- Secrets managed via `npx wrangler secret put <NAME>`

---

## 7. Security Considerations

| Area | Implementation |
|------|----------------|
| **OAuth CSRF** | Cryptographically random `state` param with 5-min TTL in KV |
| **OAuth PKCE** | SHA-256 `code_challenge` from `code_verifier` |
| **Rate Limiting** | KV-based: 10 star ops/min per user (custom implementation) |
| **Session Binding** | JWT in `httpOnly` cookie (not localStorage) |
| **Input Validation** | JSON Schema validation on PR submissions |
| **XSS Prevention** | js-xss (`sanitizeHtml`) for README HTML; `sanitizeUrl` protocol allowlist for user-supplied URLs; schema `pattern` blocks non-http(s) URIs |

---

## 8. Performance & Optimization

| Strategy | Implementation |
|----------|----------------|
| **Build-Time Index** | GitHub Action generates `search-index.json` with checksums |
| **CDN-Hosted Search** | CLI fetches index from Cloudflare CDN (no API rate limits) |
| **Static Prerendering** | `/`, `/contribute` prerendered at build time |
| **On-Demand SSR** | `/skillset/:ns/:name` rendered on-demand with caching |
| **Optimistic UI** | Star button updates immediately, reconciles async |
| **KV Write Queue** | Exponential backoff on 429 responses from KV |

---

## 9. Lessons Learned

*Living section - add entries as patterns emerge or issues are resolved.*

### npx Caching

npx caches packages in `~/.npm/_npx`. After publishing a new CLI version, users may still get the old version. Fix: `rm -rf ~/.npm/_npx` or `npx clear-npx-cache` before retrying.

### .gitignore and Skillset Content

`.env.*` patterns in `.gitignore` can accidentally exclude `.env.example` files in skillset content. Added `!.env.example` exception to allow example env files while still ignoring real secrets.

### Sanitization in Cloudflare Workers

DOM-based sanitizers (`isomorphic-dompurify`, `sanitize-html`) don't work in Workers — no DOM APIs, no `process` global. Use `xss` (js-xss) for HTML sanitization: pure string-based parsing, no browser dependencies, explicit Web Worker support. For URL attributes rendered into `href` (author URLs, production links), HTML sanitization doesn't help — use a protocol allowlist (`sanitizeUrl` in `site/src/lib/sanitize.ts`) that parses with `new URL()` and rejects anything other than `http:`/`https:`. Schema `"format": "uri"` does NOT block `javascript:` URIs (valid per RFC 3986), so the schema also needs `"pattern": "^https?://"`.

### Checksum Verification Path Mismatch

The search index stores paths as `content/CLAUDE.md` but degit extracts the content folder's *contents* directly to the target directory. Verification code must strip the `content/` prefix and only verify `content/*` files (not root-level skillset files like PROOF.md).
