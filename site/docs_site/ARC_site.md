# Site

## Purpose
Astro 5 SSR application running on Cloudflare Workers. Serves as the public-facing registry for skillsets.cc with static-first architecture, React islands for interactivity, and API routes backed by Cloudflare KV.

## Architecture
```
site/src/
├── components/                    # React islands + Astro components
│   ├── SearchBar.tsx              # Fuzzy search (Fuse.js)
│   ├── TagFilter.tsx              # Tag-based filtering
│   ├── SkillsetGrid.tsx           # Orchestrates search + filter + grid
│   ├── StarButton.tsx             # Star/unstar with auth
│   ├── DownloadCount.tsx          # Live download count display
│   ├── CopyCommand.tsx            # Install command with clipboard
│   ├── ProofGallery.astro         # Verification proofs display
│   ├── docs_components/           # Per-file docs
│   └── __tests__/                 # Component tests
│
├── lib/                           # Server-side utilities
│   ├── auth.ts                    # GitHub OAuth + PKCE + JWT sessions
│   ├── stars.ts                   # Star/unstar with rate limiting
│   ├── downloads.ts               # Download count tracking
│   ├── data.ts                    # Build-time search index access
│   ├── responses.ts               # JSON response helpers
│   ├── sanitize.ts                # XSS protection (js-xss)
│   ├── validation.ts              # Input validation for API routes
│   ├── docs_lib/                  # Per-file docs
│   └── __tests__/                 # Library tests
│
├── pages/                         # File-based routing
│   ├── index.astro                # Homepage (prerendered)
│   ├── browse.astro               # Browse with search/filter (prerendered)
│   ├── about.astro                # About page (prerendered)
│   ├── contribute.astro           # Submission guide (prerendered)
│   ├── cli.astro                  # CLI reference (prerendered)
│   ├── 404.astro                  # Error page (prerendered)
│   ├── login.ts                   # OAuth initiation
│   ├── callback.ts                # OAuth callback
│   ├── logout.ts                  # Session clearance
│   ├── skillset/[namespace]/
│   │   └── [name].astro           # Skillset detail (SSR)
│   ├── api/
│   │   ├── star.ts                # GET/POST star operations
│   │   ├── downloads.ts           # POST download increment
│   │   └── stats/counts.ts        # GET aggregate stats
│   └── docs_pages/                # Per-file docs
│
├── types/
│   ├── index.ts                   # Skillset, SearchIndex, SearchIndexEntry
│   └── docs_types/                # Per-file docs
│
├── layouts/
│   ├── BaseLayout.astro           # Global layout (sidebar nav + slot)
│   └── docs_layouts/              # Per-file docs
│
└── styles/
    └── global.css                 # Tailwind + custom styles
```

## Modules

| Module | Purpose | ARC Doc |
|--------|---------|---------|
| **components** | React islands + Astro components for UI | [ARC_components.md](../src/components/docs_components/ARC_components.md) |
| **lib** | Server-side auth, stars, downloads, data, sanitization | [ARC_lib.md](../src/lib/docs_lib/ARC_lib.md) |
| **pages** | Routes: static pages, auth endpoints, API routes | [ARC_pages.md](../src/pages/docs_pages/ARC_pages.md) |
| **types** | TypeScript interfaces for skillsets and search index | [ARC_types.md](../src/types/docs_types/ARC_types.md) |
| **layouts** | Base HTML layout with sidebar navigation | [ARC_layouts.md](../src/layouts/docs_layouts/ARC_layouts.md) |

## Routes

### Static Pages (Prerendered)
| Route | Page | Description |
|-------|------|-------------|
| `/` | index.astro | Dictionary-style landing with definition |
| `/browse` | browse.astro | SkillsetGrid with search/filter |
| `/about` | about.astro | Problem/solution narrative |
| `/contribute` | contribute.astro | Submission process guide |
| `/cli` | cli.astro | CLI reference docs |
| `/404` | 404.astro | Error page with browse link |

### Dynamic Pages (SSR)
| Route | Page | Description |
|-------|------|-------------|
| `/skillset/[ns]/[name]` | [name].astro | Detail page with README, stars, downloads, MCP servers |

### Auth Endpoints
| Route | Method | Description |
|-------|--------|-------------|
| `/login` | GET | Generate PKCE + state, redirect to GitHub |
| `/callback` | GET | Validate state, exchange code, create JWT |
| `/logout` | GET | Clear session cookie, redirect home |

### API Endpoints
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/star` | GET | No | Star count + user's starred status |
| `/api/star` | POST | Yes | Toggle star (rate limited: 10/min) |
| `/api/downloads` | POST | No | Increment download count |
| `/api/stats/counts` | GET | No | Bulk star + download counts |

## Data Flow

### Build Time
```
GitHub Registry (skillsets/)
  ↓
GitHub Action generates search-index.json
  ↓
Astro imports at build → embedded in static pages
  ↓
Deploy to Cloudflare Workers
```

### Browse Page (Static + Islands)
```
CDN serves prerendered HTML
  ↓
SkillsetGrid hydrates (client:load)
  ↓
SearchBar (Fuse.js) + TagFilter → intersection → finalResults
  ↓
Single request: fetch /api/stats/counts → all star counts → hydrate grid
```

### Skillset Detail (SSR)
```
Request → /skillset/@ns/name
  ↓
Look up in search-index.json (build-time data)
  ↓
Fetch README.md from GitHub raw content API
  ↓
marked → HTML → sanitizeHtml (js-xss)
  ↓
Render with StarButton, DownloadCount, CopyCommand islands
  ↓
If mcp_servers: render MCP section (native/docker grouped, reputation, runtime caveat)
```

### Authentication
```
/login → generate state + PKCE verifier → store in KV (5-min TTL)
  ↓
Redirect to GitHub OAuth
  ↓
GitHub → /callback?code=X&state=Y
  ↓
Validate state (KV) → exchange code (with PKCE) → fetch user
  ↓
Create JWT (HMAC-SHA256, 7-day expiry) → httpOnly cookie
```

### Star Toggle
```
StarButton POST /api/star
  ↓
Verify JWT from cookie → check rate limit (KV)
  ↓
toggleStar() → read user stars + count from KV → update both
  ↓
Return { starred, count } → update UI
```

## Dependencies

### External
- `astro@5.x` — SSR framework
- `@astrojs/cloudflare` — Workers adapter
- `@astrojs/react` — React islands integration
- `@astrojs/tailwind` — Tailwind CSS
- `react@19.x` — Interactive components
- `fuse.js` — Client-side fuzzy search
- `marked` — Markdown to HTML
- `xss` — HTML sanitization

### Services
- **Cloudflare Workers** — Hosting + SSR
- **Cloudflare KV** — AUTH namespace (OAuth state), DATA namespace (stars, downloads, rate limits)
- **GitHub OAuth API** — Authentication
- **GitHub Raw Content API** — README fetching for detail pages

## KV Storage Schema

### AUTH Namespace
```
oauth:{state} → { codeVerifier, returnTo }    (5-min TTL)
```

### DATA Namespace
```
stars:{skillsetId}       → "42"                (star count)
user:{userId}:stars      → ["id1", "id2"]      (user's starred IDs)
downloads:{skillsetId}   → "123"               (download count)
ratelimit:{userId}       → "7"                 (star ops count, 60s TTL)
dl-rate:{ip}             → "12"                (download ops count, 3600s TTL)
```

## Key Patterns

- **Static-First**: `prerender: true` on all content pages; SSR only for skillset detail (runtime README fetch)
- **Islands Architecture**: Static HTML default, React hydrated with `client:load` for interactivity
- **Build-Time Index**: Search via CDN-hosted JSON (includes MCP server metadata), no runtime GitHub API for browsing
- **Filter Intersection**: SearchBar results AND TagFilter results (Set-based O(1) lookup)
- **Optimistic-ish Stars**: Waits for server response, but immediate loading state
- **KV Retry**: Exponential backoff on 429s (100ms → 200ms → 400ms, 3 attempts)
- **PKCE + CSRF**: OAuth uses code_challenge + random state param with TTL

## Security

| Layer | Implementation |
|-------|----------------|
| **XSS** | js-xss whitelist sanitization on README HTML |
| **CSRF** | Random state param with 5-min KV TTL |
| **PKCE** | SHA-256 code_challenge prevents code interception |
| **Sessions** | JWT in httpOnly/Secure/SameSite=Lax cookie (7-day expiry) |
| **Rate Limiting** | 10 star ops/min per user, 30 downloads/hr per IP (KV-based counters with TTL) |
| **Input Validation** | Request body checked in API routes |

## Testing
```bash
cd site && npm test          # Vitest + React Testing Library
cd site && npm run typecheck # TypeScript strict mode
cd site && npm run build     # Full build verification
```

## Configuration
| File | Purpose |
|------|---------|
| `astro.config.mjs` | `output: 'server'`, Cloudflare adapter, React + Tailwind |
| `tailwind.config.js` | Design tokens: colors, fonts, spacing |
| `tsconfig.json` | Strict mode, `@/*` path aliases |
| `vitest.config.ts` | Test setup with React Testing Library |

## Design System

### Typography
- **Serif**: Crimson Pro (headings, descriptions)
- **Sans**: Inter (reserved for UI text)
- **Mono**: JetBrains Mono (code, metadata, labels)

### Colors
- **Background**: stone-50
- **Text**: text-ink (near-black), text-secondary, text-tertiary
- **Accent**: orange-500 (links, stars, highlights)
- **Borders**: border-ink (black), border-light

## Related Documentation
- [Frontend Style Guide](../.claude/resources/frontend_styleguide.md)
- [Workers Style Guide](../.claude/resources/workers_styleguide.md)
- [Deployment](../DEPLOYMENT.md)
- [CLI](../cli/)
