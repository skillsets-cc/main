# Site

## Purpose
The Astro 5 static site that serves as the public-facing registry interface for skillsets.cc. Uses Cloudflare Pages for deployment with server-side rendering for dynamic routes and static prerendering for content pages.

## Architecture
```
site/
├── src/
│   ├── components/           # Astro components + React islands
│   │   ├── SkillsetCard.astro
│   │   ├── SkillsetGrid.tsx  # React island with search/filter
│   │   ├── SearchBar.tsx     # React island with Fuse.js
│   │   ├── TagFilter.tsx     # React island for tag filtering
│   │   ├── StarButton.tsx    # React island for starring
│   │   ├── CopyCommand.tsx   # React island for copy-to-clipboard
│   │   ├── ProofGallery.astro
│   │   └── __tests__/        # Component tests
│   ├── layouts/
│   │   └── BaseLayout.astro  # Main layout with nav/footer
│   ├── pages/                # File-based routing
│   │   ├── index.astro       # Home page (prerendered)
│   │   ├── contribute.astro  # Contribute page (prerendered)
│   │   └── skillset/
│   │       └── [namespace]/
│   │           └── [name].astro  # Dynamic detail page (SSR)
│   ├── styles/
│   │   └── global.css        # Tailwind + custom styles
│   └── types/
│       └── index.ts          # TypeScript definitions
├── astro.config.mjs          # Astro + Cloudflare config
├── tailwind.config.js        # Tailwind design system
├── tsconfig.json             # TypeScript config with paths
└── vitest.config.ts          # Test configuration
```

## Files

### Core Components
| File | Purpose | Documentation |
|------|---------|---------------|
| `src/layouts/BaseLayout.astro` | Main layout with nav, footer, and global styles | Inline |
| `src/components/SkillsetGrid.tsx` | React island orchestrating search and filtering | Inline |
| `src/components/SearchBar.tsx` | Client-side fuzzy search with Fuse.js | Inline |
| `src/components/StarButton.tsx` | Star/unstar functionality with optimistic UI | Inline |

### Pages
| File | Purpose | Prerendered |
|------|---------|-------------|
| `src/pages/index.astro` | Home page with skillset grid | Yes |
| `src/pages/contribute.astro` | Contribution workflow guide | Yes |
| `src/pages/skillset/[namespace]/[name].astro` | Individual skillset detail | No (SSR) |

### Supporting Files
| File | Purpose |
|------|---------|
| `src/types/index.ts` | TypeScript types for Skillset and SearchIndex |
| `src/styles/global.css` | Tailwind imports + custom utility classes |
| `tailwind.config.js` | Design system tokens (colors, spacing) |

### Test Files
| File | Coverage | Key Tests |
|------|----------|-----------|
| `src/components/__tests__/StarButton.test.tsx` | StarButton | Star toggle, API errors, optimistic UI |

## Dependencies
- **External**:
  - `astro@5.x` - SSR framework
  - `@astrojs/cloudflare` - Cloudflare Pages adapter
  - `@astrojs/react` - React integration for islands
  - `@astrojs/tailwind` - Tailwind CSS integration
  - `fuse.js` - Client-side fuzzy search
  - `react@19.x` - UI library for interactive islands
- **Internal**: None (standalone site)
- **Services**: Cloudflare Workers (auth, stars) via API routes

## Data Flow
```
Build Time:
GitHub Registry → [Future: Build Script] → search-index.json → CDN

Runtime (Static Pages):
CDN → Prerendered HTML → Client

Runtime (Dynamic Pages):
Request → Cloudflare Pages SSR → [namespace]/[name].astro → Response
  ↓
search-index.json

Interactive Islands:
User Action → React Component → Worker API → KV → Response
```

## Key Patterns
- **Islands Architecture**: Static Astro components with React islands for interactivity
- **Prerendering**: Static pages use `export const prerender = true` for CDN caching
- **Client-Side Search**: Fuse.js searches against static JSON index (no API calls)
- **Optimistic UI**: StarButton updates immediately, reconciles async
- **Glass Morphism**: Tailwind utilities for consistent glassmorphic design

## Configuration
| Variable | Purpose | Default |
|----------|---------|---------|
| `output: 'server'` | Enable SSR mode in Astro | N/A |
| `adapter: cloudflare()` | Deploy to Cloudflare Pages | N/A |

## API/Interface
### Public Routes
| Route | Type | Purpose |
|-------|------|---------|
| `/` | Static | Home page with skillset grid |
| `/contribute` | Static | Contribution guide |
| `/skillset/:namespace/:name` | Dynamic (SSR) | Skillset detail page |

### Component API (React Islands)
```typescript
// StarButton
interface StarButtonProps {
  skillsetId: string;
  initialStars?: number;
  initialStarred?: boolean;
}

// SkillsetGrid
interface SkillsetGridProps {
  skillsets: SearchIndexEntry[];
}

// CopyCommand
interface CopyCommandProps {
  command: string;
}
```

## Integration Points
- **Upstream**: GitHub Registry (via search-index.json)
- **Downstream**: Cloudflare Workers (auth, stars) via `/api/*` routes
- **Parallel**: CLI (shares TypeScript types, consumes same search index)

## Testing
```bash
# Run all tests
cd site && npm test

# Type checking
npm run typecheck

# Dev server
npm run dev

# Build
npm run build
```

## Monitoring
- **Metrics**: Cloudflare Pages Analytics (page views, response times)
- **Logs**: Cloudflare Pages logs for SSR errors
- **Health**: Static pages always available via CDN

## Common Issues
- **React 19 with Astro**: Ensure `@astrojs/react@4.x` for compatibility
- **TypeScript Paths**: Use `@/*` aliases configured in `tsconfig.json`
- **Island Hydration**: Use `client:load` for immediate interactivity, `client:visible` for lazy loading
- **Cloudflare Adapter**: KV bindings required for sessions (SESSION binding)

## Related Documentation
- [Frontend Style Guide](../../.claude/resources/frontend_styleguide.md)
- [Cloudflare Workers](../../workers/)
- [CLI Tool](../../cli/)
