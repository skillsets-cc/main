# skillsets.cc Site

## Purpose
Astro 5 SSR application on Cloudflare Workers. Public-facing registry with static-first pages, React islands for interactivity, and API routes backed by Cloudflare KV and Durable Objects.

## Architecture
```
site/
├── astro.config.mjs               # Astro SSR + Cloudflare adapter + React/Tailwind
├── tailwind.config.js             # Design tokens: colors, fonts, spacing, prose
├── tsconfig.json                  # Strict mode + path aliases
├── vitest.config.ts               # jsdom + Cloudflare Workers mocking
├── wrangler.toml                  # Worker bindings: KV, DO, secrets
├── package.json                   # Scripts: dev, build, build:index, test, typecheck
│
├── scripts/
│   └── build-index.ts             # Generates search-index.json from skillsets/ registry
│
├── public/
│   ├── search-index.json          # CDN-hosted search index
│   ├── favicon.svg                # SVG favicon
│   ├── favicon.ico                # ICO fallback
│   └── .assetsignore              # Excludes worker files from static assets
│
├── vitest-mocks/
│   └── cloudflare-workers.ts      # Stub DurableObject class for unit tests
│
├── docs_site/                     # Site-level documentation
│   ├── ARC_site.md                # Architecture overview
│   ├── astro.config.md
│   ├── tailwind.config.md
│   ├── tsconfig.md
│   ├── vitest.config.md
│   ├── wrangler.md
│   ├── build-index.md
│   └── worker.md
│
└── src/
    ├── worker.ts                  # Custom worker entry (Astro handler + DO exports)
    ├── components/                # React islands + Astro components (10 files)
    ├── lib/                       # Server-side utilities (10 files)
    ├── pages/                     # Routes + API endpoints (18 files)
    ├── types/                     # TypeScript interfaces
    ├── layouts/                   # Base HTML layout + mobile drawer
    └── styles/                    # Tailwind + typography + scrollbar
```

## Files

| File | Purpose | Documentation |
|------|---------|---------------|
| — | Architecture, data flow, routes, security | [ARC_site.md](./docs_site/ARC_site.md) |

### Configuration
| File | Purpose | Documentation |
|------|---------|---------------|
| `astro.config.mjs` | SSR output, Cloudflare adapter, React + Tailwind, DO exports | [Docs](./docs_site/astro.config.md) |
| `tailwind.config.js` | Design tokens: colors, fonts, spacing, prose styling | [Docs](./docs_site/tailwind.config.md) |
| `tsconfig.json` | Strict mode, React JSX, path aliases (`@/*`, `@components/*`) | [Docs](./docs_site/tsconfig.md) |
| `vitest.config.ts` | jsdom environment, Cloudflare Workers mocking | [Docs](./docs_site/vitest.config.md) |
| `wrangler.toml` | KV bindings, DO bindings, env vars, migrations | [Docs](./docs_site/wrangler.md) |

### Build Pipeline
| File | Purpose | Documentation |
|------|---------|---------------|
| `scripts/build-index.ts` | Generates `search-index.json` from skillsets/ registry | [Docs](./docs_site/build-index.md) |
| `src/worker.ts` | Custom worker entry (Astro handler + Durable Object exports) | [Docs](./docs_site/worker.md) |

### Source Modules
| Module | Purpose | README | ARC |
|--------|---------|--------|-----|
| **components** | React islands + Astro components (filtering, stars, ghost entries, galleries) | [README](./src/components/README.md) | [ARC](./src/components/docs_components/ARC_components.md) |
| **lib** | Auth, stars, downloads, rate limiting, reservations, data, sanitization, validation | [README](./src/lib/README.md) | [ARC](./src/lib/docs_lib/ARC_lib.md) |
| **pages** | Static pages, auth endpoints, star/download APIs, reservation APIs | [README](./src/pages/README.md) | [ARC](./src/pages/docs_pages/ARC_pages.md) |
| **types** | SearchIndexEntry, McpServer, SlotStatus, GhostSlot, ReservationState | [README](./src/types/README.md) | [ARC](./src/types/docs_types/ARC_types.md) |
| **layouts** | Base layout with sidebar nav and mobile slide-out drawer | [README](./src/layouts/README.md) | [ARC](./src/layouts/docs_layouts/ARC_layouts.md) |
| **styles** | Tailwind layers, typography system (Crimson Pro + JetBrains Mono), scrollbar | [README](./src/styles/README.md) | [ARC](./src/styles/docs_styles/ARC_styles.md) |

## Development

```bash
npm install
npm run dev          # Local dev server at localhost:4321
npm run dev:cf       # Build + Wrangler dev (tests KV/DO locally)
```

## Build & Deploy

```bash
npm run build:index  # Regenerate search-index.json
npm run build        # Build Astro site to ./dist/
npx wrangler deploy  # Deploy to Cloudflare Workers
```

## Testing

```bash
npm test             # Vitest + React Testing Library
npm run typecheck    # TypeScript strict mode
```

## Configuration

See `wrangler.toml` ([docs](./docs_site/wrangler.md)) for Workers config and [DEPLOYMENT.md](../DEPLOYMENT.md) for full deployment documentation.

## Related Documentation
- [Frontend Style Guide](../.claude/resources/frontend_styleguide.md)
- [Workers Style Guide](../.claude/resources/workers_styleguide.md)
- [Deployment](../DEPLOYMENT.md)
