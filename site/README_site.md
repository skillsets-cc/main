# Site

## Purpose
The Astro 5 static site serving as the public-facing registry interface for skillsets.cc. Provides browsing, search, and detail views for production-verified Claude Code workflows with static prerendering for content pages and server-side rendering for dynamic routes.

## Architecture
```
site/
├── src/
│   ├── components/          # Astro components + React islands
│   │   ├── SkillsetCard.astro
│   │   ├── SkillsetGrid.tsx
│   │   ├── SearchBar.tsx
│   │   ├── TagFilter.tsx
│   │   ├── StarButton.tsx
│   │   ├── CopyCommand.tsx
│   │   ├── ProofGallery.astro
│   │   └── __tests__/       # Component tests
│   ├── layouts/
│   │   └── BaseLayout.astro # Main layout
│   ├── pages/               # File-based routing
│   │   ├── index.astro      # Home (prerendered)
│   │   ├── contribute.astro # Contribute (prerendered)
│   │   └── skillset/[namespace]/[name].astro # Detail (SSR)
│   ├── styles/
│   │   └── global.css       # Tailwind + utilities
│   └── types/
│       └── index.ts         # TypeScript types
├── docs_site/               # Documentation
│   └── ARC_site.md          # Architecture reference
├── astro.config.mjs         # Astro configuration
├── tailwind.config.js       # Design system
├── tsconfig.json            # TypeScript config
└── vitest.config.ts         # Test config
```

## Files

### Core Components
| File | Purpose | Documentation |
|------|---------|---------------|
| `BaseLayout.astro` | Main layout with nav/footer, global styles | Inline |
| `SkillsetGrid.tsx` | React island orchestrating search/filtering | Inline |
| `SearchBar.tsx` | Client-side fuzzy search with Fuse.js | Inline |
| `StarButton.tsx` | Star/unstar with optimistic UI | Inline |

### Pages
| File | Purpose | Type |
|------|---------|------|
| `index.astro` | Home page with grid | Static |
| `contribute.astro` | Contribution guide | Static |
| `skillset/[namespace]/[name].astro` | Skillset detail | SSR |

### Infrastructure
| File | Purpose |
|------|---------|
| `types/index.ts` | Skillset and SearchIndex types |
| `styles/global.css` | Tailwind + custom utilities |

## Dependencies
- **External**: `astro@5.x`, `@astrojs/cloudflare`, `@astrojs/react`, `@astrojs/tailwind`, `fuse.js`, `react@19.x`
- **Internal**: None (standalone module)
- **Services**: Cloudflare Workers (auth, stars)

## Data Flow
```
Build Time:
GitHub Registry → [Future Build Script] → search-index.json → CDN

Runtime (Static):
Request
    │
    ▼
┌─────────────────┐
│  Prerendered    │◄── index.astro, contribute.astro
│  HTML from CDN  │
└─────────────────┘

Runtime (Dynamic):
Request
    │
    ▼
┌─────────────────┐
│  Cloudflare     │◄── [namespace]/[name].astro
│  Pages SSR      │
└────────┬────────┘
         │
         ▼
    search-index.json

Interactive Islands:
User Action → React Island → Worker API → KV → UI Update
```

## Key Patterns
- **Islands Architecture**: Static Astro with React for interactivity only
- **Prerendering**: `export const prerender = true` for static pages
- **Client-Side Search**: Fuse.js against static JSON (no API calls)
- **Optimistic UI**: Immediate feedback, async reconciliation
- **Glass Morphism**: Consistent design via Tailwind utilities

## Configuration
| Variable | Default | Description |
|----------|---------|-------------|
| `output` | `'server'` | Enable SSR mode |
| `adapter` | `cloudflare()` | Deploy to Cloudflare Pages |

## Testing
```bash
# Run tests
cd site && npm test

# Type checking
npm run typecheck

# Dev server
npm run dev

# Build
npm run build
```

## Related Documentation
- [Architecture Reference](./docs_site/ARC_site.md)
- [Frontend Style Guide](../.claude/resources/frontend_styleguide.md)
- [Cloudflare Workers](../workers/)
