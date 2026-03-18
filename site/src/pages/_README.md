# Pages Module

## Purpose
Astro pages and API routes for skillsets.cc. Defines all site routes including static pages (homepage, about, contribute), dynamic skillset detail pages, OAuth authentication flow, and REST APIs for stars, downloads, and reservation management.

## Architecture
```
pages/
├── _docs_pages/             # Documentation (underscore prefix excludes from Astro routing)
│   ├── ARC_pages.md         # Architecture overview
│   └── *.md                 # Per-file docs
├── api/                     # API endpoints
│   ├── star.ts
│   ├── downloads.ts
│   ├── me.ts
│   ├── reservations.ts
│   └── reservations/
│       ├── config.ts
│       ├── verify.ts
│       ├── lookup.ts
│       └── submit.ts
├── skillset/
│   └── [namespace]/
│       └── [name].astro     # Dynamic skillset detail
├── *.astro                  # Static pages
└── *.ts                     # Auth endpoints
```

## Files

| File | Purpose | Documentation |
|------|---------|---------------|
| — | Architecture overview | [ARC_pages.md](./_docs_pages/ARC_pages.md) |
| `404.astro` | 404 error page (static) | [Docs](./_docs_pages/404.md) |
| `about.astro` | About page (static) | [Docs](./_docs_pages/about.md) |
| `index.astro` | Homepage with embedded skillset grid (static) | [Docs](./_docs_pages/index.md) |
| `contribute.astro` | Contribution guide with cohort claiming flow (static) | [Docs](./_docs_pages/contribute.md) |
| `skillset/[namespace]/[name].astro` | Dynamic skillset detail page (SSR) | [Docs](./_docs_pages/skillset-[namespace]-[name].md) |
| `login.ts` | OAuth login initiation endpoint | [Docs](./_docs_pages/login.md) |
| `callback.ts` | OAuth callback endpoint | [Docs](./_docs_pages/callback.md) |
| `logout.ts` | Session logout endpoint | [Docs](./_docs_pages/logout.md) |
| `api/star.ts` | Star/unstar operations API | [Docs](./_docs_pages/api/star.md) |
| `api/downloads.ts` | Download tracking API | [Docs](./_docs_pages/api/downloads.md) |
| `api/me.ts` | User profile API | [Docs](./_docs_pages/api/me.md) |
| `api/reservations.ts` | Reservation CRUD API | [Docs](./_docs_pages/api/reservations.md) |
| `api/reservations/config.ts` | Config updates (maintainer) | [Docs](./_docs_pages/api/reservations/config.md) |
| `api/reservations/verify.ts` | Batch ID verification (CI) | [Docs](./_docs_pages/api/reservations/verify.md) |
| `api/reservations/lookup.ts` | Find user's reservation | [Docs](./_docs_pages/api/reservations/lookup.md) |
| `api/reservations/submit.ts` | Mark slot submitted (maintainer) | [Docs](./_docs_pages/api/reservations/submit.md) |

## Key Patterns

### Static-First Architecture
- Default to `export const prerender = true` for static pages
- Only skillset detail uses SSR (runtime README fetch)
- Static HTML served from CDN with fast load times

### Islands Architecture
- Static pages with React islands for interactivity
- `client:load` for components (search, filters, stars, slot claiming)
- Minimal JavaScript for fast initial render

### API Design
- RESTful endpoints with proper HTTP verbs
- Consistent error responses via `lib/responses.ts`
- Rate limiting on public and authenticated endpoints
- Session-based authentication via JWT cookies

### Security
- Session verification on authenticated endpoints
- Rate limiting (stars: 10/min, downloads: 30/hr, reservations: 5/hr)
- XSS protection via `lib/sanitize.ts`
- CSRF protection on OAuth flow
- Maintainer-only endpoints for admin operations

## Integration

**Consumes:**
- `lib/auth` - OAuth, session management
- `lib/stars` - Star operations
- `lib/downloads` - Download tracking
- `lib/data` - Search index access
- `lib/reservation-do` - Durable Object for reservations
- `components/*` - React and Astro components
- `layouts/BaseLayout.astro` - Base page layout

**Used by:**
- Site visitors (all pages)
- CLI (`/api/downloads`, `/api/reservations/lookup`)
- GitHub Actions CI (`/api/reservations/verify`)
- React components (`/api/star`, `/api/reservations`)

## Testing
Tests are located in `api/_tests_api/` for API endpoints. Run with:
```bash
npm test
```
