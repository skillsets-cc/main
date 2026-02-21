# Frontend Style Guide
## Astro + TypeScript + Tailwind Development Standards

---

## Design System

### Typography
- **Serif body**: Crimson Pro (headings, descriptions, body text)
- **Monospace**: JetBrains Mono at 0.95em (code, metadata, labels, buttons)
- **Base font-size**: 18px (scaled up from 16px to compensate for Crimson Pro's smaller x-height)
- **Font stack mapping**: `font-sans` → Crimson Pro, `font-serif` → Crimson Pro, `font-mono` → JetBrains Mono

### Color Palette
Light academic paper aesthetic with single orange accent.

```
Surfaces:    surface-paper (#FAFAFA), surface-white (#FFFFFF)
Text:        text-ink (#1A1A1A), text-secondary (#555555), text-tertiary (#777777)
Accent:      accent (#F97316), accent-light (#FDBA74), accent-highlight (#FFF3C4)
Borders:     border-ink (#E5E7EB, structural gray), border-strong (#1A1A1A)
Status:      status-success (#22c55e), status-error (#ef4444), status-warning (#f59e0b)
```

### Component Aesthetics
- **No border radius**: Sharp edges (`rounded-none` for buttons, `rounded-sm: 2px` and `rounded-md: 4px` for subtle rounding)
- **Monospace UI**: Buttons, labels, section headers use `font-mono`
- **Frosted glass** (TagFilter only): `bg-surface-white/90 backdrop-blur-sm`
- **Stable scrollbar**: `scrollbar-gutter: stable` prevents layout shift
- **Selection styling**: `selection:bg-accent-highlight selection:text-text-ink`

---

## Tailwind Configuration

```javascript
// tailwind.config.js
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        surface: { paper: '#FAFAFA', white: '#FFFFFF' },
        text: { ink: '#1A1A1A', secondary: '#555555', tertiary: '#777777' },
        accent: { DEFAULT: '#F97316', light: '#FDBA74', highlight: '#FFF3C4' },
        border: { ink: '#E5E7EB', strong: '#1A1A1A' },
        status: { success: '#22c55e', error: '#ef4444', warning: '#f59e0b' },
      },
      fontFamily: {
        serif: ['"Crimson Pro"', 'serif'],
        sans: ['"Crimson Pro"', 'serif'],   // font-sans remapped to Crimson Pro
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      spacing: { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '20px' },
      borderRadius: { none: '0', sm: '2px', md: '4px' },
      typography: { /* @tailwindcss/typography prose overrides for Crimson Pro */ },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
```

---

## Layout Pattern

`BaseLayout.astro` wraps all pages with a fixed sidebar and mobile drawer.

```
┌─────────────────────────────────────────┐
│              BaseLayout (flex-row)       │
├───────────┬─────────────────────────────┤
│  Sidebar  │        Main Content         │
│  (w-64)   │        (flex-grow)          │
│           │                             │
│  - Logo   │   <slot /> (page content)   │
│  - Nav    │                             │
│  - Social │                             │
└───────────┴─────────────────────────────┘
```

```astro
---
// /src/layouts/BaseLayout.astro
import AuthStatus from '@/components/AuthStatus.tsx';
import '@/styles/global.css';

interface Props {
  title: string;
  description?: string;
}

const { title, description = 'Verified registry of production-ready Claude Code workflows' } = Astro.props;
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content={description} />
    <title>{title}</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,200..900;1,200..900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  </head>

  <body class="min-h-screen bg-surface-paper text-text-ink selection:bg-accent-highlight selection:text-text-ink font-sans">
    <div class="md:flex min-h-screen">
      <!-- Sidebar: fixed on desktop, slide-out drawer on mobile -->
      <aside class="fixed inset-y-0 left-0 w-64 border-r border-border-ink bg-surface-paper z-[60] -translate-x-full md:translate-x-0 md:sticky md:top-0">
        <nav>
          <h3 class="text-xs font-bold uppercase tracking-wider text-text-tertiary font-mono">Index</h3>
          <a href="/" class="text-base text-text-secondary hover:text-accent hover:underline">Skillsets</a>
          <!-- ... CLI, Contribute, About links ... -->
          <AuthStatus client:load />
        </nav>
        <!-- Social links pinned to bottom -->
      </aside>

      <main class="flex-1 min-w-0 overflow-x-clip bg-surface-white">
        <slot />
      </main>
    </div>
  </body>
</html>
```

### Key Layout Details
- **Desktop**: Sidebar sticky at `top-0`, `w-64`, `border-r border-border-ink`
- **Mobile**: Sidebar hidden with `-translate-x-full`, toggled via hamburger button at `fixed bottom-0 left-0 z-[70]`
- **Overlay**: `bg-black/30 z-[55]` behind open drawer
- **Z-index layers**: toggle (70) > sidebar (60) > overlay (55) > TagFilter (50)
- **Nav headings**: uppercase, `font-mono`, `tracking-wider`, `text-text-tertiary`
- **Nav links**: `text-base`, `text-text-secondary`, hover `text-accent` + underline

---

## Astro Page Pattern (Static)

```astro
---
// /src/pages/index.astro
export const prerender = true;

import BaseLayout from '@/layouts/BaseLayout.astro';
import SkillsetGrid from '@/components/SkillsetGrid.tsx';
import { getSkillsets } from '@/lib/data';

const skillsets = getSkillsets();
---

<BaseLayout title="Skillsets.cc — Verified Agentic Workflows">
  <div class="max-w-5xl mx-auto px-8 py-12">
    <h1 class="text-3xl font-serif font-semibold text-text-ink mb-6">
      Production-Verified Skillsets
    </h1>
    <SkillsetGrid client:load skillsets={skillsets} />
  </div>
</BaseLayout>
```

### Data Loading
- Static pages use `getSkillsets()` from `lib/data.ts` (build-time import of `search-index.json`)
- No runtime GitHub API calls for browsing
- Index is immutable once deployed; requires rebuild to update

---

## Dynamic Route Pattern (SSR)

```astro
---
// /src/pages/skillset/[namespace]/[name].astro
// No prerender — renders on-demand

import BaseLayout from '@/layouts/BaseLayout.astro';
import StarButton from '@/components/StarButton.tsx';
import CopyCommand from '@/components/CopyCommand.tsx';
import DownloadCount from '@/components/DownloadCount.tsx';
import ProofGallery from '@/components/ProofGallery.astro';
import MediaGallery from '@/components/MediaGallery.astro';
import { getSkillsetById } from '@/lib/data';
import { sanitizeHtml, sanitizeUrl } from '@/lib/sanitize';
import { marked } from 'marked';

const { namespace, name } = Astro.params;
const skillset = getSkillsetById(`@${namespace}/${name}`);

if (!skillset) return Astro.redirect('/404');

// Fetch README from GitHub raw content API (runtime)
const readmeUrl = `https://raw.githubusercontent.com/skillsets-cc/main/main/skillsets/@${namespace}/${name}/content/README.md`;
const readmeResponse = await fetch(readmeUrl);
const readmeHtml = sanitizeHtml(await marked(await readmeResponse.text()));
---

<BaseLayout title={`${skillset.name} — Skillsets.cc`}>
  <article class="max-w-4xl mx-auto px-8 py-12">
    <ProofGallery productionLinks={skillset.verification.production_links} hasAuditReport={true} skillsetId={skillset.id} />
    <StarButton client:load skillsetId={skillset.id} initialStars={skillset.stars} />
    <DownloadCount client:load skillsetId={skillset.id} />
    <CopyCommand client:load command={`npx skillsets install ${skillset.id}`} heading="Install" />
    <div class="prose" set:html={readmeHtml} />
  </article>
</BaseLayout>
```

### SSR Data Flow
1. Look up skillset in build-time search index via `getSkillsetById()`
2. Fetch README.md from GitHub raw content API at runtime
3. Parse markdown with `marked`, sanitize HTML with `sanitizeHtml` (js-xss)
4. Render Mermaid diagrams if present
5. Render with React islands for interactive elements

---

## React Island Pattern

React components hydrate with `client:load` for interactivity. Static HTML renders first, JS hydrates on load.

```typescript
// /src/components/StarButton.tsx
import { useState, useEffect } from 'react';

interface StarButtonProps {
  skillsetId: string;
  initialStars?: number;
}

export default function StarButton({ skillsetId, initialStars = 0 }: StarButtonProps) {
  const [stars, setStars] = useState(initialStars);
  const [starred, setStarred] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch server-side state on mount
  useEffect(() => {
    fetch(`/api/star?skillsetId=${encodeURIComponent(skillsetId)}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setStars(data.count); setStarred(data.starred); })
      .catch(console.error);
  }, [skillsetId]);

  const handleToggle = async () => {
    setLoading(true);
    const res = await fetch('/api/star', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillsetId }),
      credentials: 'include',
    });
    if (res.status === 401) { window.location.href = '/login'; return; }
    if (res.ok) {
      const data = await res.json();
      setStarred(data.starred);
      setStars(data.count);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`font-mono text-sm px-3 py-1 border rounded-none transition-colors
        ${starred ? 'border-accent text-accent' : 'border-border-ink text-text-secondary hover:border-accent'}`}
    >
      {starred ? '★' : '☆'} {stars}
    </button>
  );
}
```

**Usage in Astro**:
```astro
<StarButton client:load skillsetId="@supercollectible/Valence" initialStars={42} />
```

### Island Patterns
| Pattern | When to Use |
|---------|-------------|
| `client:load` | Component needs interactivity immediately (stars, filters, auth status) |
| Static Astro component | No interactivity needed (ProofGallery, MediaGallery) |

### State Management
- Local `useState` only — no global state (Redux, Zustand)
- Props drilling for parent-child communication
- Optimistic UI for ghost entry reserve/cancel actions
- Progressive hydration: build-time values render first, API calls update on mount

---

## Astro Component Pattern (Static)

```astro
---
// /src/components/ProofGallery.astro
import { sanitizeUrl } from '@/lib/sanitize';

interface ProductionLink { url: string; label?: string; }
interface Props {
  productionLinks: ProductionLink[];
  hasAuditReport: boolean;
  skillsetId: string;
}

const { productionLinks, hasAuditReport, skillsetId } = Astro.props;
---

<div class="sticky top-[6.5rem] z-50 bg-surface-white border-b-2 border-accent flex flex-wrap gap-2 py-2">
  {productionLinks.map(link => (
    <a href={sanitizeUrl(link.url)} target="_blank" rel="noopener noreferrer"
       class="inline-flex items-center gap-1 px-2 py-1 border border-accent bg-surface-white font-mono text-xs">
      <span class="w-2 h-2 rounded-full bg-status-success"></span>
      shipped {link.label || new URL(link.url).hostname}
    </a>
  ))}
  {hasAuditReport && <span class="...">audit complete</span>}
  <span class="...">schema valid</span>
</div>
```

### When to Use Astro vs React
- **Astro**: No interactivity, renders at build/request time (galleries, badges, static content)
- **React (`.tsx`)**: Needs `useState`, `useEffect`, event handlers, API calls

---

## Component Inventory

| Component | Type | Purpose | Hydration |
|-----------|------|---------|-----------|
| **SkillsetGrid** | React | Grid orchestrator: tag filtering, ghost entries, live star counts | client:load |
| **TagFilter** | React | Tag-based filtering (fixed bottom bar, portal) | client:load |
| **StarButton** | React | Star/unstar toggle with auth redirect | client:load |
| **GhostCard** | React | Ghost entry slot card (claim/cancel/submitted states) | client:load |
| **AuthStatus** | React | Login/logout link in sidebar nav | client:load |
| **CopyCommand** | React | Code block with clipboard copy button | client:load |
| **DownloadCount** | React | Download count badge from API | client:load |
| **useCountdown** | Hook | Countdown timer for reservation expiry | N/A |
| **ProofGallery** | Astro | Sticky verification proof badges | Static |
| **MediaGallery** | Astro | Image gallery with lazy loading | Static |

---

## API Route Pattern (Astro Endpoints)

API routes live in `pages/api/` and export HTTP method handlers.

```typescript
// /src/pages/api/star.ts
import type { APIRoute } from 'astro';
import { getSessionFromRequest, type Env } from '@/lib/auth';
import { toggleStar, isRateLimited, isStarred, getStarCount } from '@/lib/stars';
import { jsonResponse, errorResponse } from '@/lib/responses';
import { isValidSkillsetId } from '@/lib/validation';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env as Env;

  // 1. Auth check
  const session = await getSessionFromRequest(request, env);
  if (!session) return errorResponse('Unauthorized', 401);

  // 2. Rate limit check
  if (await isRateLimited(session.sub, env)) return errorResponse('Rate limit exceeded', 429);

  // 3. Input validation
  const { skillsetId } = await request.json();
  if (!isValidSkillsetId(skillsetId)) return errorResponse('Invalid skillset ID', 400);

  // 4. Business logic
  const result = await toggleStar(skillsetId, session.sub, env);

  // 5. JSON response
  return jsonResponse({ skillsetId, starred: result.starred, count: result.count });
};
```

### API Route Flow (all endpoints follow this)
1. **Auth check** — `getSessionFromRequest()` (returns null if not authenticated)
2. **Rate limit check** — `isRateLimited()` or `isHourlyRateLimited()`
3. **Input validation** — `isValidSkillsetId()`, regex checks, JSON body parsing
4. **Business logic** — call `lib/*` functions
5. **Response** — `jsonResponse(data)` or `errorResponse(message, status)`

### Response Helpers
```typescript
// lib/responses.ts
jsonResponse(data, { status: 200 })    // → Response with Content-Type: application/json
errorResponse('message', 400)          // → { "error": "message" }
errorResponse('Rate limited', 429, { retryAfter: 60 })  // Additional data merged
```

### Standard Status Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created (slot reserved) |
| 400 | Bad request (invalid input) |
| 401 | Unauthorized (no session) |
| 403 | Forbidden (not maintainer) |
| 409 | Conflict (slot already taken) |
| 429 | Rate limited |
| 500 | Server error |

---

## Portal Pattern (TagFilter)

TagFilter renders at document root via `createPortal` for fixed bottom positioning.

```typescript
// Simplified pattern
import { useState, useMemo, useEffect, createPortal } from 'react';

export default function TagFilter({ skillsets, onResultsChange }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const bar = (
    <div className="fixed bottom-0 left-0 md:left-64 right-0 z-50 bg-surface-white/90 backdrop-blur-sm border-t border-border-ink">
      {/* Tag buttons with horizontal scroll */}
    </div>
  );

  return mounted ? createPortal(bar, document.body) : null;
}
```

### Key Details
- Fixed at bottom, offset by sidebar width on desktop (`left-64`)
- Frosted glass: `bg-surface-white/90 backdrop-blur-sm`
- Active tag: `border-accent text-accent bg-surface-white`
- Inactive: `bg-surface-paper border-border-ink` with hover
- `scrollbar-hide` for horizontal overflow

---

## Global CSS

```css
/* /src/styles/global.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html { font-size: 18px; }
  body { font-family: 'Crimson Pro', serif; scrollbar-gutter: stable; }
  code, pre, kbd, samp, .font-mono { font-size: 0.95em; font-weight: 500; }
  /* Custom scrollbar (WebKit only) */
}

@layer utilities {
  .scrollbar-hide { /* Hides scrollbar, keeps scroll functionality */ }
}
```

### No Custom CSS Classes
All styling is Tailwind utilities. No `.btn-primary`, no `.glass-surface`. The only custom CSS is in `global.css` for typography base and scrollbar.

---

## Type Definitions

```typescript
// /src/types/index.ts
export interface SearchIndex {
  version: string;
  generated_at: string;
  skillsets: SearchIndexEntry[];
}

export interface SearchIndexEntry {
  id: string;
  name: string;
  description: string;
  tags: string[];
  author: { handle: string; url?: string; };
  stars: number;
  version: string;
  status: 'active' | 'deprecated' | 'archived';
  verification: {
    production_links: Array<{ url: string; label?: string }>;
    production_proof?: string;
    audit_report: string;
  };
  compatibility: { claude_code_version: string; languages: string[]; };
  context_image_url?: string;
  entry_point: string;
  checksum: string;
  files: Record<string, string>;
  mcp_servers?: McpServer[];
  batch_id?: string;
}

export interface McpServer {
  name: string;
  type: 'stdio' | 'http' | 'docker';
  command?: string; args?: string[]; url?: string; image?: string;
  servers?: McpNestedServer[];
  mcp_reputation: string;
  researched_at: string;
}

export type SlotStatus = 'available' | 'reserved' | 'submitted';

export interface GhostSlot {
  slotId: string;
  status: SlotStatus;
  expiresAt?: number;
  skillsetId?: string;
}

export interface ReservationState {
  slots: Record<string, { status: SlotStatus; expiresAt?: number; skillsetId?: string; }>;
  totalGhostSlots: number;
  cohort: number;
  userSlot: string | null;
}
```

---

## Build Configuration

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    workerEntryPoint: {
      path: 'src/worker.ts',
      namedExports: ['ReservationCoordinator'],  // Durable Object export
    },
  }),
  integrations: [react(), tailwind()],
  vite: { ssr: { external: ['node:buffer'] } },
});
```

---

## File Naming

```
Astro Components:   PascalCase.astro     (ProofGallery.astro, MediaGallery.astro)
React Islands:      PascalCase.tsx       (StarButton.tsx, GhostCard.tsx)
React Hooks:        camelCase.ts         (useCountdown.ts)
Lib Modules:        kebab-case.ts        (rate-limit.ts, reservation-do.ts)
Pages (static):     kebab-case.astro     (index.astro, contribute.astro)
Pages (API):        kebab-case.ts        (star.ts, downloads.ts)
Auth Endpoints:     kebab-case.ts        (login.ts, callback.ts, logout.ts)
Types:              index.ts             (types/index.ts)
Tests:              [name].test.ts(x)    (StarButton.test.tsx, auth.test.ts)
```

---

## Folder Structure

```
src/
├── components/                # React islands + Astro components
│   ├── AuthStatus.tsx
│   ├── CopyCommand.tsx
│   ├── DownloadCount.tsx
│   ├── GhostCard.tsx
│   ├── MediaGallery.astro
│   ├── ProofGallery.astro
│   ├── SkillsetGrid.tsx
│   ├── StarButton.tsx
│   ├── TagFilter.tsx
│   ├── useCountdown.ts
│   ├── docs_components/       # Per-file documentation
│   └── __tests__/             # Component tests
├── layouts/
│   └── BaseLayout.astro       # Base layout with sidebar nav + mobile drawer
├── lib/                       # Server-side utilities
│   ├── auth.ts                # GitHub OAuth + PKCE + JWT sessions
│   ├── data.ts                # Build-time search index access
│   ├── downloads.ts           # Download counting + rate limiting
│   ├── maintainer.ts          # Maintainer authorization
│   ├── rate-limit.ts          # Hour-bucketed KV rate limiter
│   ├── reservation-do.ts      # Durable Object for reservations
│   ├── responses.ts           # JSON response helpers
│   ├── sanitize.ts            # XSS protection (js-xss) + URL validation
│   ├── stars.ts               # Star/unstar + rate limiting
│   ├── validation.ts          # Input validation (skillset ID format)
│   ├── docs_lib/              # Per-file documentation
│   └── __tests__/             # Library tests
├── pages/                     # File-based routing
│   ├── index.astro            # Homepage (prerendered)
│   ├── about.astro            # About (prerendered)
│   ├── contribute.astro       # Contribute (prerendered)
│   ├── cli.astro              # CLI docs (prerendered)
│   ├── 404.astro              # Error page (prerendered)
│   ├── login.ts               # OAuth initiation
│   ├── callback.ts            # OAuth callback
│   ├── logout.ts              # Session clearance
│   ├── skillset/[namespace]/
│   │   └── [name].astro       # Skillset detail (SSR)
│   └── api/                   # API endpoints
│       ├── star.ts
│       ├── downloads.ts
│       ├── me.ts
│       ├── reservations.ts
│       ├── stats/counts.ts
│       └── reservations/{config,verify,lookup,submit}.ts
├── styles/
│   └── global.css             # Tailwind layers + typography + scrollbar
├── types/
│   └── index.ts               # All type exports
└── worker.ts                  # Custom worker entry (Astro handler + DO exports)
```

---

## Testing Pattern (Vitest + React Testing Library)

```typescript
// /src/components/__tests__/StarButton.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StarButton from '../StarButton';

describe('StarButton', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('renders with initial star count', () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ count: 42, starred: false }) });
    render(<StarButton skillsetId="@user/test" initialStars={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('redirects to login on 401', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ count: 0, starred: false }) })
      .mockResolvedValueOnce({ ok: false, status: 401 });

    delete (window as any).location;
    (window as any).location = { href: '' };

    render(<StarButton skillsetId="@user/test" />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(window.location.href).toBe('/login');
    });
  });
});
```

### Test Conventions
- Tests live in `__tests__/` directories alongside source
- Mock `global.fetch` with `vi.fn()` for API calls
- Use `test-utils.ts` for shared helpers and fixtures
- API endpoint tests in `pages/api/__tests__/`
- Cloudflare DO tests use `vitest-mocks/cloudflare-workers.ts` stub

---

## Prerender Decision Matrix

| Page | Prerender | Reason |
|------|-----------|--------|
| Homepage (`/`) | Yes | Static content + embedded build-time data, client-side filtering |
| About (`/about`) | Yes | Static content |
| Contribute (`/contribute`) | Yes | Static content |
| CLI (`/cli`) | Yes | Static documentation |
| 404 | Yes | Static error page |
| Skillset detail | **No (SSR)** | Fetches README from GitHub at runtime, sanitizes user content |
| Auth endpoints | N/A | Endpoints, not pages |
| API routes | N/A | Endpoints, not pages |

---

## Performance Checklist

- [ ] Static pages use `export const prerender = true`
- [ ] React islands hydrated with `client:load`
- [ ] Build-time data loading via `lib/data.ts` (no runtime GitHub API for browsing)
- [ ] Images use `loading="lazy"` and `referrerpolicy="no-referrer"`
- [ ] Font preconnects in layout (`fonts.googleapis.com`, `fonts.gstatic.com`)
- [ ] `display=swap` in Google Fonts URL (prevents FOIT)
- [ ] Single batch API call for all star counts (`/api/stats/counts`)
- [ ] `scrollbar-gutter: stable` prevents layout shift
- [ ] Minimal JavaScript (only interactive islands ship JS)
- [ ] No virtualization needed (dataset < 100 skillsets)

---

## Accessibility Checklist

- [ ] Semantic HTML5 (`<article>`, `<nav>`, `<main>`, `<aside>`)
- [ ] `aria-label` on icon-only buttons (sidebar toggle, social links)
- [ ] Keyboard navigation for interactive elements
- [ ] Focus indicators visible on all interactive elements
- [ ] Color contrast meets WCAG AA (text-ink on surface-white/surface-paper)
- [ ] Alt text on all images (MediaGallery defaults to "Context usage breakdown")
- [ ] Mobile sidebar has close button and overlay dismissal

---

## Code Review Checklist

- [ ] TypeScript strict mode, no `any` types
- [ ] Static pages prerendered, only skillset detail uses SSR
- [ ] Tailwind utilities only, no custom CSS classes
- [ ] React islands used only for interactivity
- [ ] Loading states on async operations (buttons disabled during API calls)
- [ ] Auth redirects on 401 responses (`window.location.href = '/login'`)
- [ ] URLs sanitized via `sanitizeUrl()` before rendering in `href`
- [ ] HTML sanitized via `sanitizeHtml()` before `set:html`
- [ ] Tests for interactive components and API endpoints
