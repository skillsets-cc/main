# Pages Architecture

## Overview
Astro pages defining routes for the skillsets.cc site. Mix of static prerendered pages (homepage, about, contribute, CLI docs) and dynamic SSR pages (skillset detail). Includes OAuth flow endpoints, reservation system APIs, and star/download tracking APIs.

## Directory Structure
```
pages/
├── docs_pages/                      # Page documentation
│   ├── ARC_pages.md                 # This file
│   ├── index.md
│   ├── about.md
│   ├── contribute.md
│   ├── cli.md
│   ├── 404.md
│   ├── skillset-[namespace]-[name].md
│   ├── login.md
│   ├── callback.md
│   ├── logout.md
│   └── api/
│       ├── star.md
│       ├── downloads.md
│       ├── me.md
│       ├── reservations.md
│       ├── stats/
│       │   └── counts.md
│       └── reservations/
│           ├── config.md
│           ├── verify.md
│           ├── lookup.md
│           └── submit.md
├── api/                             # API endpoints
│   ├── star.ts                      # Star/unstar operations
│   ├── downloads.ts                 # Download tracking
│   ├── me.ts                        # User profile
│   ├── reservations.ts              # Slot reservation CRUD
│   ├── stats/
│   │   └── counts.ts                # Bulk stats
│   └── reservations/
│       ├── config.ts                # Config updates (maintainer)
│       ├── verify.ts                # Batch ID verification (CI)
│       ├── lookup.ts                # Find user's reservation
│       └── submit.ts                # Mark slot submitted (maintainer)
├── skillset/
│   └── [namespace]/
│       └── [name].astro             # Dynamic skillset detail (SSR)
├── login.ts                         # OAuth initiation
├── callback.ts                      # OAuth callback
├── logout.ts                        # Session clearance
├── index.astro                      # Homepage with embedded grid (static)
├── about.astro                      # About page (static)
├── contribute.astro                 # Contribution guide (static)
├── cli.astro                        # CLI reference (static)
└── 404.astro                        # 404 error page (static)
```

## Routes

### Static Pages (Prerendered)
| Route | Purpose | Prerender |
|-------|---------|-----------|
| `/` | Homepage with intro + embedded skillset grid | Yes |
| `/about` | About page explaining skillsets.cc | Yes |
| `/contribute` | Submission guide with cohort claiming flow | Yes |
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

#### Star & Download Tracking
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/star` | GET | Get star count and user's starred status |
| `/api/star` | POST | Toggle star for skillset |
| `/api/downloads` | POST | Increment download count |
| `/api/stats/counts` | GET | Get all star and download counts |
| `/api/me` | GET | Get authenticated user's login |

#### Reservation System
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/reservations` | GET | Get all slot states + config |
| `/api/reservations` | POST | Reserve a slot (authenticated) |
| `/api/reservations` | DELETE | Release user's reservation |
| `/api/reservations/config` | POST | Update config (maintainer) |
| `/api/reservations/verify` | GET | Verify batch ID (CI) |
| `/api/reservations/lookup` | GET | Find user's reservation |
| `/api/reservations/submit` | POST | Mark slot submitted (maintainer) |

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

### API Request Flow (Star)
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

### Reservation Flow
```
User → POST /api/reservations { slotId }
  ↓
Verify session + check rate limit
  ↓
Validate slotId format
  ↓
Forward to Durable Object
  ↓
DO atomically reserves slot
  ↓
Return { batchId, status: "reserved" }
```

## Integration Points

### Internal Dependencies
- `@/lib/auth` (OAuth, session management)
- `@/lib/stars` (star operations)
- `@/lib/downloads` (download tracking)
- `@/lib/data` (search index access)
- `@/lib/responses` (JSON response helpers)
- `@/lib/sanitize` (XSS protection)
- `@/lib/reservation-do` (Durable Object stub)
- `@/lib/maintainer` (authorization checks)
- `@layouts/BaseLayout.astro` (all pages use this layout)
- `@components/*` (React islands and Astro components)

### External Dependencies
- Astro framework (APIRoute, page components)
- GitHub OAuth API (login.ts, callback.ts)
- GitHub raw content API (skillset detail page fetches README)
- Cloudflare KV (auth state, stars, downloads, rate limits)
- Cloudflare Durable Objects (reservation state)
- `marked` (markdown parsing in skillset detail)
- `mermaid` (diagram rendering in skillset detail)

### Used By
- Site visitors (all pages)
- CLI tool (`/api/downloads` on install, `/api/stats/counts` for list, `/api/reservations/lookup` for init)
- React components (`/api/star`, `/api/stats/counts` for live data)
- GitHub Actions CI (`/api/reservations/verify` for PR validation)

## Design Patterns

### Static-First Architecture
- Default to `export const prerender = true`
- Only skillset detail page uses SSR (needs runtime README fetch)
- Reduces server load, improves performance

### Islands Architecture
- Static HTML with selective React hydration
- `client:load` for interactive components (search, filters, stars, slot claiming)
- Minimal JavaScript for fast initial load

### Progressive Enhancement
- Index page works without JavaScript (static HTML grid)
- Search/filter enhance with JavaScript (client:load)
- Star buttons degrade to link to /login without JavaScript

### Error Handling
- 404 page for missing skillsets
- OAuth error handling with redirects to homepage + error query params
- API endpoints return proper HTTP status codes (400, 401, 403, 409, 429, 500)

### Security
- Session verification on authenticated endpoints
- Rate limiting on star ops (10/min), downloads (30/hr), reservations (5/hr), verify (30/hr), lookup (30/hr)
- XSS protection on user-contributed content (README sanitization)
- CSRF protection on OAuth flow
- Maintainer-only endpoints (config, submit)
- IP-based rate limiting for public endpoints (verify, lookup)

## Prerender vs SSR Decision Matrix

| Page | Prerender | Reason |
|------|-----------|--------|
| Homepage | Yes | Static content + embedded data, client-side filtering |
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
- Durable Objects for atomic reservation state (no race conditions)
