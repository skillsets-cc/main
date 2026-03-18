# skillsets.cc

## Purpose
Curated registry of production-verified Claude Code workflows. Three independent modules: a web application (site), a CLI tool (cli), and a plugin system (plugins). The site serves as the public-facing registry with search, authentication, star/download tracking, and a ghost entry reservation system. The CLI provides installation with checksum verification and a contributor submission workflow. The plugins bridge skillsets.cc with Claude Code's native plugin system — packaging skills as distributable, namespaced units for both contributors and end users.

## Architecture
```
skillsets.cc/
├── site/                         # Astro 5 SSR on Cloudflare Workers
│   ├── scripts/
│   │   ├── build-index.ts        # Generates search-index.json from skillsets/
│   │   └── build-plugins.ts      # Generates per-skillset plugins + marketplace.json
│   └── src/
│       ├── components/           # React islands + Astro components (10 files)
│       ├── lib/                  # Server-side utilities (10 files)
│       ├── pages/                # Routes + API endpoints (18 files)
│       ├── types/                # TypeScript interfaces
│       ├── layouts/              # Base HTML layout + mobile drawer
│       └── styles/               # Tailwind + typography + scrollbar
│
├── cli/                          # Node.js CLI (npx skillsets)
│   └── src/
│       ├── commands/             # install, init, audit, audit-report, submit
│       ├── lib/                  # API, checksum, constants, errors, filesystem, templates, validate-deps, validate-mcp, versions
│       └── types/                # CLI-specific interfaces
│
├── plugins/                      # Claude Code plugins
│   ├── contribute/               # Static: contributor submission + qualitative audit
│   └── @ns/Name/                 # Generated (prod only): per-skillset install plugins
│
├── .claude-plugin/
│   └── marketplace.json          # Aggregate plugin listing for Claude Code discovery
│
├── schema/                       # JSON Schema for validation
│   └── skillset.schema.json
│
├── skillsets/                    # Registry content (mono-repo, prod only)
│   └── @{namespace}/{name}/
│       ├── skillset.yaml         # Manifest
│       ├── AUDIT_REPORT.md       # Structural + qualitative validation
│       └── content/              # Files to install
│
└── .github/workflows/            # CI/CD
    ├── validate-submission.yml   # PR validation (audit + author + reservation)
    ├── rebuild-index.yml         # Post-merge: rebuild index, plugins, deploy
    └── sync-to-prod.yml          # Dev-to-prod sync (manual)
```

## Modules

| Module | Purpose | ARC Doc |
|--------|---------|---------|
| **site** | Astro 5 SSR application — registry UI, auth, APIs, reservation system | [ARC_site.md](site/docs_site/ARC_site.md) |
| **cli** | Node.js CLI — install (degit + checksums), contribute (init, audit, submit) | [ARC_cli.md](cli/docs_cli/ARC_cli.md) |
| **plugins** | Claude Code plugins — static contribute plugin + generated per-skillset install plugins | [ARC_plugins.md](plugins/docs_plugins/ARC_plugins.md) |

### Site Sub-Modules

| Module | Purpose | ARC Doc |
|--------|---------|---------|
| **components** | React islands + Astro components (filtering, stars, ghost entries, galleries) | [ARC_components.md](site/src/components/docs_components/ARC_components.md) |
| **lib** | Auth, stars, downloads, reservations, data, sanitization, validation | [ARC_lib.md](site/src/lib/docs_lib/ARC_lib.md) |
| **pages** | Static pages, auth endpoints, star/download APIs, reservation APIs | [ARC_pages.md](site/src/pages/_docs_pages/ARC_pages.md) |
| **types** | SearchIndexEntry, SearchIndex, McpServer, McpNestedServer, SlotStatus, GhostSlot, ReservationState | [ARC_types.md](site/src/types/docs_types/ARC_types.md) |
| **layouts** | Base layout with expanding sidebar, canvas hex rain, mobile FABs, View Transitions | [ARC_layouts.md](site/src/layouts/docs_layouts/ARC_layouts.md) |
| **styles** | Tailwind layers, typography (Outfit + JetBrains Mono), scrollbar, sticky header | [ARC_styles.md](site/src/styles/docs_styles/ARC_styles.md) |

## System Data Flow

### End-to-End: Contributor → Registry → Consumer
```
Contributor
  ↓
npx skillsets init → scaffold skillset.yaml + content/
  ↓
npx skillsets audit → validate manifest + MCP + runtime deps → AUDIT_REPORT.md (tier 1)
  ↓
/audit-skill → qualitative Opus review → AUDIT_REPORT.md (tier 2) + skillset.yaml updates
  ↓
npx skillsets submit → fork → branch → open PR via gh CLI
  ↓
GitHub Actions: validate-submission.yml
  ├── npx skillsets audit --check (schema, MCP, runtime deps)
  ├── Author ↔ namespace verification
  └── Reservation batch ID verification (GET /api/reservations/verify)
  ↓
Maintainer review (production proof + audit report)
  ↓
PR merged → rebuild-index.yml
  ├── Rebuild search-index.json (metadata + checksums + MCP)
  ├── Generate per-skillset plugins + marketplace.json
  ├── Commit generated files
  ├── Build Astro site
  └── Deploy to Cloudflare Workers
  ↓
Consumer
  ├── Web: skillsets.cc (browse, star, view detail)
  ├── CLI: npx skillsets install
  └── Plugin: claude plugin marketplace add → /skillset:install
```

### Plugins: Build + Distribution
```
DEV REPO (skillsets.cc)                     PROD REPO (skillsets-cc/main)

plugins/contribute/ ── sync-to-prod.yml ──► plugins/contribute/
marketplace.json    ── merge (not overwrite) ► marketplace.json
                                            (dev entries update, prod entries preserved)

                                            skillsets/@ns/Name/skillset.yaml
                                              ↓ rebuild-index.yml
                                            plugins/@ns/Name/ (generated)
                                              ├── .claude-plugin/plugin.json
                                              └── skills/install/SKILL.md
                                              ↓
                                            .claude-plugin/marketplace.json (aggregate)
                                              ↓
                                            Claude Code discovers via marketplace
```

### Site: Build Time
```
GitHub Registry (skillsets/)
  ↓
build-index.ts → search-index.json (metadata + checksums + MCP)
build-plugins.ts → plugins/@ns/Name/ + marketplace.json
  ↓
Astro imports index at build → embedded in static pages
  ↓
Deploy to Cloudflare Workers (single worker: static + SSR + API)
```

### Site: Runtime
```
Static pages → CDN (fast, prerendered)
Skillset detail → SSR (fetch README from GitHub, sanitize, render)
API routes → Cloudflare Workers (KV for state, Durable Objects for reservations)
Auth → GitHub OAuth (PKCE + CSRF → JWT in httpOnly cookie)
```

### CLI: Consumer Flow
```
install → CDN index → metadata lookup → MCP/deps warnings → degit extract → checksum verify → POST /api/downloads
```

### CLI: Contributor Flow
```
init → interactive prompts → scaffold → reserve ghost slot (POST /api/reservations)
audit → validate manifest + MCP + runtime deps → check registry (update detection) → AUDIT_REPORT.md
submit → validate version bump → gh CLI → fork → branch → PR
```

## Cross-Module Integration

### Site ↔ CLI Touchpoints
| Endpoint | CLI Usage | Site Handler |
|----------|-----------|--------------|
| `GET /search-index.json` | Index for install/audit | Static asset (build-time) |
| `POST /api/downloads` | Track install count | `pages/api/downloads.ts` |
| `GET /api/reservations/lookup` | Find user's reservation (init) | `pages/api/reservations/lookup.ts` |
| `GET /api/reservations/verify` | Validate batch ID (CI) | `pages/api/reservations/verify.ts` |

### Plugins ↔ Site Touchpoints
| Asset | Plugin Usage | Site Role |
|-------|-------------|-----------|
| `build-plugins.ts` | Generates per-skillset plugins + marketplace | Build script lives in site/scripts/ |
| `search-index.json` | Not consumed by plugins directly | Generated by `build-index.ts` in same pipeline |

### Plugins ↔ CLI Touchpoints
| Interaction | Direction | Mechanism |
|-------------|-----------|-----------|
| `/contribute:contribute` invokes CLI | Plugin → CLI | `Bash(npx skillsets@latest init/audit/submit)` |
| `/install` invokes CLI | Plugin → CLI | `Bash(npx skillsets@latest install @ns/Name)` |
| CLI `init` scaffolds skillset | CLI → Plugin input | Scaffold becomes `skillset.yaml` → plugin generation |

### Plugins ↔ Claude Code
| Interaction | Direction | Mechanism |
|-------------|-----------|-----------|
| Marketplace discovery | CC → Plugins | `claude plugin marketplace add skillsets-cc/main` reads `marketplace.json` |
| Plugin loading | CC → Plugins | Reads `.claude-plugin/plugin.json`, discovers `skills/` directory |
| Skill invocation | CC → Skills | `/contribute:contribute`, `/contribute:audit-skill`, `/@ns/Name:install` |
| Namespacing | CC convention | Plugin name becomes skill prefix (e.g., `/contribute:audit-skill`) |

### Shared via Registry (not code)
- **skillset.yaml** schema: validated by CLI (`audit`), GitHub Actions, and consumed by `build-plugins.ts`
- **search-index.json**: generated by Actions, consumed by site (build-time) and CLI (CDN fetch)
- **Checksums**: generated at build time, verified by CLI on install
- **marketplace.json**: generated by `build-plugins.ts`, consumed by Claude Code

## CI/CD Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `validate-submission.yml` | PR touching `skillsets/**` | Audit + author verification + reservation check |
| `rebuild-index.yml` | Push to `main` touching `skillsets/**`, or manual | Rebuild index + plugins, commit, deploy |
| `sync-to-prod.yml` | Manual only | Sync dev code to prod (merges marketplace, preserves skillsets) |

## Infrastructure

### Cloudflare Workers (Single Worker)
```
┌──────────────────────────────────────────────┐
│              Astro SSR Worker                │
│                                              │
│  Static pages (/, /about, /contribute)        │
│  SSR pages (/skillset/[ns]/[name])           │
│  Auth routes (/login, /callback, /logout)    │
│  API routes (/api/star, /api/downloads, ...) │
│  Reservation APIs (/api/reservations/*)      │
│                                              │
│  Bindings:                                   │
│  ├── KV: AUTH (OAuth state, 5-min TTL)       │
│  ├── KV: DATA (stars, downloads, rate limits)│
│  └── DO: RESERVATIONS (atomic slot mgmt)     │
└──────────────────────────────────────────────┘
```

### GitHub (Triple Role)
- **Repository**: Mono-repo registry of skillset content + generated plugins
- **Actions**: PR validation + index/plugin generation + deploy pipeline
- **OAuth**: Authentication provider for site
- **Raw Content API**: README fetching for skillset detail pages
- **Plugin Marketplace Host**: `marketplace.json` served from repo for Claude Code discovery

## Security

| Layer | Site | CLI | Plugins |
|-------|------|-----|---------|
| **Auth** | GitHub OAuth (PKCE + CSRF → JWT) | N/A (uses gh CLI auth) | N/A (inherits CC session) |
| **Sessions** | httpOnly/Secure/SameSite=Lax cookie, 7-day expiry | N/A | N/A |
| **XSS** | js-xss whitelist on README HTML; sanitizeUrl for user URLs | N/A | N/A |
| **Rate Limiting** | Stars: 10/min; Downloads: 30/hr; Reservations: 5/hr | N/A (server-side) | N/A |
| **Input Validation** | Skillset ID format checks (prevent KV key injection) | Manifest + MCP + runtime deps validation | Schema-enforced `unevaluatedProperties: false` |
| **Checksums** | Generated at build time | SHA-256 verification on install | N/A |
| **Authorization** | Maintainer-only endpoints (config, submit) | N/A | N/A |
| **Consent Gating** | N/A | MCP/deps install warnings | Install skill shows INSTALL_NOTES.md before proceeding |

## Design System

### Typography
- **Body**: Outfit sans-serif (applied via `font-sans`)
- **Mono**: JetBrains Mono at 0.90em / font-weight 500 (scaled for visual balance)

### Colors
- **Background**: `#020202` (near-black)
- **Text**: `text-text-ink`, `text-text-secondary`, `text-text-tertiary`
- **Accent**: `accent` orange (links, stars, hover), `accent-highlight` (glow)
- **Surface**: `surface-paper` (sidebar, scrollbar track), `surface-white`
- **Borders**: `border-ink` (subtle), `border-strong` (prominent, scrollbar thumb)

### Patterns
- Static-first (prerender by default, SSR only for runtime data)
- Islands architecture (static HTML + selective React hydration)
- Monospace UI elements (buttons use `font-mono`)
- Dark glassmorphism (`bg-[#020202]/90 backdrop-blur-sm` for floating UI)
- Sticky header condensing via `data-stuck` attribute
- Glow hover (`.glow-border-hover` adds orange box-shadow)

## Testing

```bash
# Site
cd site && npm test          # Vitest + React Testing Library
cd site && npm run typecheck # TypeScript strict mode
cd site && npm run build     # Full build verification

# CLI
cd cli && npm test           # Vitest
cd cli && npm test -- --coverage

# Plugins (build script tests)
cd site && npm test -- tests_scripts/build-plugins.test.ts
```

## Configuration

| File | Module | Purpose |
|------|--------|---------|
| `site/astro.config.mjs` | Site | `output: 'server'`, Cloudflare adapter, React + Tailwind |
| `site/tailwind.config.mjs` | Site | Design tokens: colors, fonts, spacing |
| `site/wrangler.jsonc` | Site | Worker bindings (KV, DO, secrets) |
| `cli/package.json` | CLI | `bin: { skillsets }`, dependencies |
| `schema/skillset.schema.json` | Shared | Manifest validation schema |
| `.claude-plugin/marketplace.json` | Plugins | Aggregate plugin listing for Claude Code |

## Related Documentation
- [CLAUDE.md](CLAUDE.md) — Development protocol and hard constraints
- [DEPLOYMENT.md](DEPLOYMENT.md) — CI/CD and Cloudflare Workers deployment
- [Frontend Style Guide](.claude/resources/frontend_styleguide.md)
- [Workers Style Guide](.claude/resources/workers_styleguide.md)
- [CLI Style Guide](.claude/resources/cli_styleguide.md)
