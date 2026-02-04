# Pages Architecture

## Overview
Astro pages defining routes for the skillsets.cc site. Mix of static prerendered pages (homepage, about, CLI docs) and dynamic SSR pages (skillset detail). Includes OAuth flow endpoints and API routes for star/download tracking.

## Directory Structure
```
pages/
├── docs_pages/                # Page documentation
│   ├── login.md
│   ├── callback.md
│   ├── logout.md
│   ├── index.md
│   ├── browse.md
│   ├── about.md
│   ├── contribute.md
│   ├── cli.md
│   ├── 404.md
│   └── skillset-[namespace]-[name].md
├── api/                       # API endpoints
│   ├── docs_api/
│   │   ├── star.md
│   │   └── downloads.md
│   ├── stats/
│   │   └── docs_stats/
│   │       └── counts.md
│   ├── star.ts               # Star/unstar operations
│   ├── downloads.ts          # Download tracking
│   └── stats/
│       └── counts.ts         # Bulk stats endpoint
├── skillset/
│   └── [namespace]/
│       └── [name].astro      # Dynamic skillset detail page (SSR)
├── login.ts                  # OAuth initiation
├── callback.ts               # OAuth callback
├── logout.ts                 # Session clearance
├── index.astro               # Homepage (static)
├── browse.astro              # Browse page (static)
├── about.astro               # About page (static)
├── contribute.astro          # Contribution guide (static)
├── cli.astro                 # CLI reference (static)
└── 404.astro                 # 404 error page (static)
```

## Routes

### Static Pages (Prerendered)
| Route | Purpose | Prerender |
|-------|---------|-----------|
| `/` | Homepage with definition | Yes |
| `/browse` | Browse all skillsets with search/filter | Yes |
| `/about` | About page explaining skillsets.cc | Yes |
| `/contribute` | Submission guide | Yes |
| `/cli` | CLI reference | Yes |
| `/404` | Error page | Yes |

### Dynamic Pages (SSR)
| Route | Purpose | Prerender |
|-------|---------|-----------|
| `/skillset/[namespace]/[name]` | Skillset detail with README | No (SSR) |

### Auth Flow (Endpoints)
| Route | Method | Purpose |
|-------|--------|---------|
| `/login` | GET | Initiate GitHub OAuth |
| `/callback` | GET | OAuth callback, create session |
| `/logout` | GET | Clear session cookie |

### API Endpoints
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/star` | GET | Get star count and user's starred status |
| `/api/star` | POST | Toggle star for skillset |
| `/api/downloads` | POST | Increment download count |
| `/api/stats/counts` | GET | Get all star and download counts |

## Data Flow

### Static Page Flow (Build Time)
```
Build time
  ↓
Load search-index.json → getSkillsets()
  ↓
Generate static HTML with embedded data
  ↓
Deploy to Cloudflare Workers
  ↓
CDN serves static HTML (fast)
```

### Dynamic Page Flow (Request Time)
```
User → /skillset/@user/name
  ↓
Look up skillset in search index (build-time data)
  ↓
Fetch README.md from GitHub (runtime)
  ↓
Parse markdown → Sanitize HTML
  ↓
Render page with components (SSR)
  ↓
Cache on Cloudflare edge
```

### OAuth Flow
```
User → /login?returnTo=/browse
  ↓
Generate state + PKCE → Store in KV
  ↓
Redirect to GitHub authorization
  ↓
User authorizes → GitHub → /callback?code={code}&state={state}
  ↓
Validate state → Exchange code → Create JWT
  ↓
Set httpOnly cookie → Redirect to returnTo
```

### API Request Flow
```
Component → POST /api/star
  ↓
Extract session from cookie
  ↓
Check authentication (401 if missing)
  ↓
Check rate limit (429 if exceeded)
  ↓
Validate request body
  ↓
Call lib/stars.ts → toggleStar()
  ↓
Return JSON { starred, count }
```

## Integration Points

### Internal Dependencies
- `@/lib/auth` (OAuth, session management)
- `@/lib/stars` (star operations)
- `@/lib/downloads` (download tracking)
- `@/lib/data` (search index access)
- `@/lib/responses` (JSON response helpers)
- `@/lib/sanitize` (XSS protection)
- `@layouts/BaseLayout.astro` (all pages use this layout)
- `@components/*` (React islands and Astro components)

### External Dependencies
- Astro framework (APIRoute, page components)
- GitHub OAuth API (login.ts, callback.ts)
- GitHub raw content API (skillset detail page fetches README)
- Cloudflare KV (auth state, stars, downloads)
- `marked` (markdown parsing in skillset detail)

### Used By
- Site visitors (all pages)
- CLI tool (`/api/downloads` called on install, `/api/stats/counts` for list command)
- React components (`/api/star`, `/api/stats/counts` for live data)

## Design Patterns

### Static-First Architecture
- Default to `export const prerender = true`
- Only skillset detail page uses SSR (needs runtime README fetch)
- Reduces server load, improves performance

### Islands Architecture
- Static HTML with selective React hydration
- `client:load` for interactive components (search, filters, stars)
- Minimal JavaScript for fast initial load

### Progressive Enhancement
- Browse page works without JavaScript (static HTML grid)
- Search/filter enhance with JavaScript (client:load)
- Star buttons degrade to link to /login without JavaScript

### Error Handling
- 404 page for missing skillsets
- OAuth error handling with redirects to homepage + error query params
- API endpoints return proper HTTP status codes (400, 401, 429, 500)

### Security
- Session verification on authenticated endpoints
- Rate limiting on star operations (10 ops/min)
- XSS protection on user-contributed content (README sanitization)
- CSRF protection on OAuth flow

## Prerender vs SSR Decision Matrix

| Page | Prerender | Reason |
|------|-----------|--------|
| Homepage | Yes | Static content, no dynamic data |
| Browse | Yes | Search index embedded at build time, client-side filtering |
| About | Yes | Static content |
| Contribute | Yes | Static content |
| CLI | Yes | Static documentation |
| 404 | Yes | Static error page |
| Skillset Detail | No (SSR) | Fetches README from GitHub at runtime, sanitizes user content |
| Login/Callback/Logout | N/A | Endpoints, not pages |
| API routes | N/A | Endpoints, not pages |

## Performance Considerations
- Static pages served from CDN (fast)
- Skillset detail page cached on Cloudflare edge (after first request)
- Bulk stats API reduces client API calls (single request for all counts)
- Build-time search index (no runtime GitHub API queries)
