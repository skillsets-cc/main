# skillsets.cc

## Purpose
Curated registry of production-verified Claude Code workflows. Two independent modules: a web application (site) and a CLI tool (cli). The site serves as the public-facing registry with search, authentication, star/download tracking, and a ghost entry reservation system. The CLI provides discovery, installation with checksum verification, and a contributor submission workflow.

## Architecture
```
skillsets.cc/
├── site/                         # Astro 5 SSR on Cloudflare Workers
│   └── src/
│       ├── components/           # React islands + Astro components (9 files)
│       ├── lib/                  # Server-side utilities (10 files)
│       ├── pages/                # Routes + API endpoints (17 files)
│       ├── types/                # TypeScript interfaces
│       ├── layouts/              # Base HTML layout + mobile drawer
│       └── styles/               # Tailwind + typography + scrollbar
│
├── cli/                          # Node.js CLI (npx skillsets)
│   └── src/
│       ├── commands/             # search, list, view, install, init, audit, submit
│       ├── lib/                  # API, checksum, constants, errors, filesystem, MCP validation, versions
│       └── types/                # CLI-specific interfaces
│
├── schema/                       # JSON Schema for validation
│   └── skillset.schema.json
│
├── skillsets/                    # Registry content (mono-repo)
│   └── @{namespace}/{name}/
│       ├── skillset.yaml         # Manifest
│       ├── AUDIT_REPORT.md       # Structural validation
│       └── content/              # Files to install
│
└── .github/workflows/            # CI/CD
    ├── validate-submission.yml   # PR validation
    └── sync-to-prod.yml          # Deploy to Cloudflare
```

## Modules

| Module | Purpose | ARC Doc |
|--------|---------|---------|
| **site** | Astro 5 SSR application — registry UI, auth, APIs, reservation system | [ARC_site.md](site/docs_site/ARC_site.md) |
| **cli** | Node.js CLI — search, install (degit + checksums), contribute (init, audit, submit) | [ARC_cli.md](cli/docs_cli/ARC_cli.md) |

### Site Sub-Modules

| Module | Purpose | ARC Doc |
|--------|---------|---------|
| **components** | React islands + Astro components (filtering, stars, ghost entries, galleries) | [ARC_components.md](site/src/components/docs_components/ARC_components.md) |
| **lib** | Auth, stars, downloads, reservations, data, sanitization, validation | [ARC_lib.md](site/src/lib/docs_lib/ARC_lib.md) |
| **pages** | Static pages, auth endpoints, star/download APIs, reservation APIs | [ARC_pages.md](site/src/pages/docs_pages/ARC_pages.md) |
| **types** | SearchIndexEntry, SearchIndex, McpServer, McpNestedServer, SlotStatus, GhostSlot, ReservationState | [ARC_types.md](site/src/types/docs_types/ARC_types.md) |
| **layouts** | Base layout with sidebar nav and mobile slide-out drawer | [ARC_layouts.md](site/src/layouts/docs_layouts/ARC_layouts.md) |
| **styles** | Tailwind layers, typography system (Crimson Pro + JetBrains Mono), scrollbar | [ARC_styles.md](site/src/styles/docs_styles/ARC_styles.md) |

## System Data Flow

### End-to-End: Contributor → Registry → Consumer
```
Contributor
  ↓
npx skillsets init → scaffold skillset.yaml + content/
  ↓
npx skillsets audit → validate manifest + MCP servers → generate AUDIT_REPORT.md
  ↓
npx skillsets submit → fork → branch → open PR via gh CLI
  ↓
GitHub Actions: validate-submission.yml
  ├── JSON Schema validation (skillset.yaml)
  ├── Checksum generation
  ├── MCP consistency check
  └── Reservation batch ID verification (GET /api/reservations/verify)
  ↓
Maintainer review (production proof + MCP justification)
  ↓
PR merged → sync-to-prod.yml
  ├── Rebuild search-index.json
  ├── Build Astro site
  └── Deploy to Cloudflare Workers
  ↓
Consumer
  ├── Web: skillsets.cc (browse, search, star, view detail)
  └── CLI: npx skillsets search/list/install
```

### Site: Build Time
```
GitHub Registry (skillsets/)
  ↓
GitHub Action generates search-index.json (metadata + checksums + MCP)
  ↓
Astro imports at build → embedded in static pages
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
list/search → CDN index + live stats from API → Fuse.js/sort → terminal
view → GitHub raw content → terminal
install → degit extract → checksum verify → POST /api/downloads
```

### CLI: Contributor Flow
```
init → interactive prompts → scaffold → reserve ghost slot (POST /api/reservations)
audit → validate manifest + MCP → check registry (update detection) → AUDIT_REPORT.md
submit → validate version bump → gh CLI → fork → branch → PR
```

## Cross-Module Integration

### Site ↔ CLI Touchpoints
| Endpoint | CLI Usage | Site Handler |
|----------|-----------|--------------|
| `GET /search-index.json` | Index for search/list | Static asset (build-time) |
| `GET /api/stats/counts` | Live star/download counts for list | `pages/api/stats/counts.ts` |
| `POST /api/downloads` | Track install count | `pages/api/downloads.ts` |
| `GET /api/reservations/lookup` | Find user's reservation (init) | `pages/api/reservations/lookup.ts` |
| `GET /api/reservations/verify` | Validate batch ID (CI) | `pages/api/reservations/verify.ts` |

### Shared via Registry (not code)
- **skillset.yaml** schema: validated by both CLI (`audit`) and GitHub Actions
- **search-index.json**: generated by Actions, consumed by both site (build-time) and CLI (CDN fetch)
- **Checksums**: generated at build time, verified by CLI on install

## Infrastructure

### Cloudflare Workers (Single Worker)
```
┌──────────────────────────────────────────────┐
│              Astro SSR Worker                │
│                                              │
│  Static pages (/, /about, /contribute, /cli) │
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

### GitHub (Dual Role)
- **Repository**: Mono-repo registry of skillset content
- **Actions**: PR validation + deploy pipeline + search index generation
- **OAuth**: Authentication provider for site
- **Raw Content API**: README fetching for skillset detail pages

## Security

| Layer | Site | CLI |
|-------|------|-----|
| **Auth** | GitHub OAuth (PKCE + CSRF → JWT) | N/A (uses gh CLI auth) |
| **Sessions** | httpOnly/Secure/SameSite=Lax cookie, 7-day expiry | N/A |
| **XSS** | js-xss whitelist on README HTML; sanitizeUrl for user URLs | N/A |
| **Rate Limiting** | Stars: 10/min; Downloads: 30/hr; Reservations: 5/hr | N/A (server-side) |
| **Input Validation** | Skillset ID format checks (prevent KV key injection) | Manifest + MCP validation |
| **Checksums** | Generated at build time | SHA-256 verification on install |
| **Authorization** | Maintainer-only endpoints (config, submit) | N/A |

## Design System

### Typography
- **Serif**: Crimson Pro (body text, headings) — 18px base
- **Mono**: JetBrains Mono at 0.95em (code, metadata, labels, buttons)

### Colors
- **Background**: stone-50 | **Text**: text-ink, text-secondary, text-tertiary
- **Accent**: orange-500 | **Borders**: border-ink, border-light | **Status**: green-500

### Patterns
- Static-first (prerender by default, SSR only for runtime data)
- Islands architecture (static HTML + selective React hydration)
- No border radius (sharp geometric aesthetic)
- Glassmorphism for floating UI (TagFilter bar)

## Testing

```bash
# Site
cd site && npm test          # Vitest + React Testing Library
cd site && npm run typecheck # TypeScript strict mode
cd site && npm run build     # Full build verification

# CLI
cd cli && npm test           # Vitest
cd cli && npm test -- --coverage
```

## Configuration

| File | Module | Purpose |
|------|--------|---------|
| `site/astro.config.mjs` | Site | `output: 'server'`, Cloudflare adapter, React + Tailwind |
| `site/tailwind.config.mjs` | Site | Design tokens: colors, fonts, spacing |
| `site/wrangler.jsonc` | Site | Worker bindings (KV, DO, secrets) |
| `cli/package.json` | CLI | `bin: { skillsets }`, dependencies |
| `schema/skillset.schema.json` | Shared | Manifest validation schema |

## Related Documentation
- [CLAUDE.md](CLAUDE.md) — Development protocol and hard constraints
- [DEPLOYMENT.md](DEPLOYMENT.md) — CI/CD and Cloudflare Workers deployment
- [Frontend Style Guide](.claude/resources/frontend_styleguide.md)
- [Workers Style Guide](.claude/resources/workers_styleguide.md)
- [CLI Style Guide](.claude/resources/cli_styleguide.md)
