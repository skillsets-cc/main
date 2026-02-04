# skillsets.cc Site

## Purpose
Astro 5 SSR application on Cloudflare Workers. Public-facing registry with static-first pages, React islands for interactivity, and API routes backed by Cloudflare KV.

## Architecture
```
site/
├── src/
│   ├── components/          # React islands + Astro components
│   │   ├── SearchBar.tsx
│   │   ├── TagFilter.tsx
│   │   ├── SkillsetGrid.tsx
│   │   ├── StarButton.tsx
│   │   ├── DownloadCount.tsx
│   │   ├── CopyCommand.tsx
│   │   ├── ProofGallery.astro
│   │   └── __tests__/  
│   ├── lib/                 # Server-side utilities
│   │   ├── auth.ts
│   │   ├── stars.ts
│   │   ├── downloads.ts
│   │   ├── data.ts
│   │   ├── responses.ts
│   │   ├── sanitize.ts
│   │   ├── validation.ts
│   │   └── __tests__/
│   ├── pages/               # File-based routing
│   │   ├── index.astro
│   │   ├── browse.astro
│   │   ├── about.astro
│   │   ├── contribute.astro
│   │   ├── cli.astro
│   │   ├── 404.astro
│   │   ├── login.ts
│   │   ├── callback.ts
│   │   ├── logout.ts
│   │   ├── skillset/[namespace]/[name].astro
│   │   └── api/
│   │       ├── star.ts
│   │       ├── downloads.ts
│   │       └── stats/counts.ts
│   ├── types/
│   │   └── index.ts
│   ├── layouts/
│   │   └── BaseLayout.astro
│   └── styles/
│       └── global.css
├── docs_site/               # Documentation
│   └── ARC_site.md
└── public/
    └── search-index.json
```

## Files

| File | Purpose | Documentation |
|------|---------|---------------|
| — | Architecture, data flow, key patterns | [ARC_site.md](./docs_site/ARC_site.md) |

### Components
| File | Purpose | Documentation |
|------|---------|---------------|
| `SearchBar.tsx` | Fuzzy search with Fuse.js | [Docs](./src/components/docs_components/SearchBar.md) |
| `TagFilter.tsx` | Tag-based filtering with pill buttons | [Docs](./src/components/docs_components/TagFilter.md) |
| `SkillsetGrid.tsx` | Orchestrates search + filter + grid display | [Docs](./src/components/docs_components/SkillsetGrid.md) |
| `StarButton.tsx` | Star/unstar with auth and optimistic UI | [Docs](./src/components/docs_components/StarButton.md) |
| `DownloadCount.tsx` | Live download count from API | [Docs](./src/components/docs_components/DownloadCount.md) |
| `CopyCommand.tsx` | Install command with clipboard copy | [Docs](./src/components/docs_components/CopyCommand.md) |
| `ProofGallery.astro` | Verification proofs display | [Docs](./src/components/docs_components/ProofGallery.md) |

### Lib
| File | Purpose | Documentation |
|------|---------|---------------|
| `auth.ts` | GitHub OAuth + PKCE + JWT sessions | [Docs](./src/lib/docs_lib/auth.md) |
| `stars.ts` | Star/unstar with KV rate limiting | [Docs](./src/lib/docs_lib/stars.md) |
| `downloads.ts` | Download count tracking | [Docs](./src/lib/docs_lib/downloads.md) |
| `data.ts` | Build-time search index access | [Docs](./src/lib/docs_lib/data.md) |
| `responses.ts` | JSON response helpers | [Docs](./src/lib/docs_lib/responses.md) |
| `sanitize.ts` | XSS protection for README content | [Docs](./src/lib/docs_lib/sanitize.md) |
| `validation.ts` | Input validation for API routes | — |

### Pages
| File | Purpose | Documentation |
|------|---------|---------------|
| `index.astro` | Homepage (prerendered) | [Docs](./src/pages/docs_pages/index.md) |
| `browse.astro` | Browse with search/filter (prerendered) | [Docs](./src/pages/docs_pages/browse.md) |
| `about.astro` | About page (prerendered) | [Docs](./src/pages/docs_pages/about.md) |
| `contribute.astro` | Submission guide (prerendered) | [Docs](./src/pages/docs_pages/contribute.md) |
| `cli.astro` | CLI reference (prerendered) | [Docs](./src/pages/docs_pages/cli.md) |
| `404.astro` | Error page (prerendered) | [Docs](./src/pages/docs_pages/404.md) |
| `login.ts` | OAuth initiation | [Docs](./src/pages/docs_pages/login.md) |
| `callback.ts` | OAuth callback + session creation | [Docs](./src/pages/docs_pages/callback.md) |
| `logout.ts` | Session clearance | [Docs](./src/pages/docs_pages/logout.md) |
| `[namespace]/[name].astro` | Skillset detail (SSR) | [Docs](./src/pages/docs_pages/skillset-[namespace]-[name].md) |
| `api/star.ts` | GET/POST star operations | [Docs](./src/pages/api/docs_api/star.md) |
| `api/downloads.ts` | POST download increment | [Docs](./src/pages/api/docs_api/downloads.md) |
| `api/stats/counts.ts` | GET aggregate stats | [Docs](./src/pages/api/stats/docs_stats/counts.md) |

### Types
| File | Purpose | Documentation |
|------|---------|---------------|
| `index.ts` | Skillset, SearchIndex, SearchIndexEntry | [Docs](./src/types/docs_types/index.md) |

### Layouts
| File | Purpose | Documentation |
|------|---------|---------------|
| `BaseLayout.astro` | Global layout with sidebar nav | [Docs](./src/layouts/docs_layouts/BaseLayout.md) |

## Development

```bash
npm install
npm run dev          # Local dev server at localhost:4321
```

## Build & Deploy

```bash
npm run build        # Build to ./dist/
npx wrangler deploy  # Deploy to Cloudflare Workers
```

## Configuration

See `wrangler.toml` for Workers config and [DEPLOYMENT.md](../DEPLOYMENT.md) for full documentation.

## Related Documentation
- [Frontend Style Guide](../.claude/resources/frontend_styleguide.md)
- [Workers Style Guide](../.claude/resources/workers_styleguide.md)
- [Deployment](../DEPLOYMENT.md)
