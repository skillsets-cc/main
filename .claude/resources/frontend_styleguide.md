# Frontend Style Guide
## Astro + TypeScript Development Standards

---

## Astro Page Pattern (Static)

```astro
---
// /src/pages/index.astro
export const prerender = true; // Static page

import Layout from '@layouts/Layout.astro';
import SkillsetGrid from '@components/SkillsetGrid.astro';
import SearchBar from '@components/SearchBar.tsx';

// Fetch data at build time
const response = await fetch('https://api.github.com/repos/skillsets-cc/main/contents/skillsets');
const skillsets = await response.json();
---

<Layout title="Skillsets.cc - Verified Agentic Workflows">
  <main class="max-w-7xl mx-auto px-4 py-12">
    <h1 class="text-4xl font-bold text-center mb-8">
      Production-Verified Skillsets
    </h1>

    <!-- Interactive search (React island) -->
    <SearchBar client:load skillsets={skillsets} />

    <!-- Static grid -->
    <SkillsetGrid skillsets={skillsets} />
  </main>
</Layout>
```

---

## Astro Component Pattern (Static)

```astro
---
// /src/components/SkillsetCard.astro
import type { Skillset } from '@/types';

interface Props {
  skillset: Skillset;
}

const { skillset } = Astro.props;
---

<article class="glass-surface p-6 rounded-lg hover:border-accent transition-all">
  <div class="flex items-start justify-between mb-4">
    <h3 class="text-xl font-bold">{skillset.name}</h3>
    <span class="px-2 py-1 text-xs rounded bg-accent/20 text-accent">
      {skillset.tags[0]}
    </span>
  </div>

  <p class="text-text-secondary mb-4">{skillset.description}</p>

  <div class="flex items-center justify-between">
    <span class="text-sm text-text-secondary">
      by {skillset.author.handle}
    </span>

    <a
      href={`/skillset/${skillset.author.handle}/${skillset.name}`}
      class="btn-primary"
    >
      View Details
    </a>
  </div>
</article>

<style>
  .glass-surface {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  }

  .btn-primary {
    @apply px-4 py-2 rounded bg-accent hover:bg-accent/80 transition-colors;
  }
</style>
```

---

## React Island Pattern (Interactive)

```typescript
// /src/components/StarButton.tsx
import { useState, useEffect } from 'react';

interface StarButtonProps {
  skillsetId: string;
  initialStars?: number;
  initialStarred?: boolean;
}

export default function StarButton({
  skillsetId,
  initialStars = 0,
  initialStarred = false,
}: StarButtonProps) {
  const [stars, setStars] = useState(initialStars);
  const [starred, setStarred] = useState(initialStarred);
  const [loading, setLoading] = useState(false);

  const handleToggleStar = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/stars', {
        method: starred ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillsetId }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to toggle star');
      }

      // Optimistic update
      setStarred(!starred);
      setStars(starred ? stars - 1 : stars + 1);
    } catch (error) {
      console.error('[StarButton] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleStar}
      disabled={loading}
      className={`
        flex items-center gap-2 px-4 py-2 rounded
        transition-all duration-200
        ${starred ? 'bg-accent text-white' : 'bg-surface-glass border border-border-medium'}
        ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
      `}
    >
      <svg
        className={`w-5 h-5 ${starred ? 'fill-current' : 'stroke-current fill-none'}`}
        viewBox="0 0 24 24"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      <span>{stars}</span>
    </button>
  );
}
```

**Usage in Astro**:
```astro
---
import StarButton from '@components/StarButton.tsx';
---
<StarButton client:load skillsetId="the-skillset" />
```

---

## Dynamic Route Pattern (SSR)

```astro
---
// /src/pages/skillset/[namespace]/[name].astro
// Dynamic route - renders on-demand

import Layout from '@layouts/Layout.astro';
import StarButton from '@components/StarButton.tsx';

const { namespace, name } = Astro.params;

// Fetch skillset data on-demand
const response = await fetch(
  `https://api.github.com/repos/skillsets-cc/main/contents/skillsets/@${namespace}/${name}/skillset.yaml`
);

if (!response.ok) {
  return Astro.redirect('/404');
}

const content = await response.json();
const yaml = atob(content.content);
const skillset = parseYAML(yaml);

// Fetch star count from Worker
const starsResponse = await fetch(`https://workers.skillsets.cc/api/stars/${namespace}/${name}`);
const { count, starred } = await starsResponse.json();
---

<Layout title={`${skillset.name} - Skillsets.cc`}>
  <article class="max-w-4xl mx-auto px-4 py-12">
    <header class="mb-8">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-4xl font-bold mb-2">{skillset.name}</h1>
          <p class="text-text-secondary">
            by <a href={skillset.author.url} class="text-accent hover:underline">
              {skillset.author.handle}
            </a>
          </p>
        </div>

        <StarButton
          client:load
          skillsetId={`${namespace}/${name}`}
          initialStars={count}
          initialStarred={starred}
        />
      </div>

      <p class="mt-4 text-lg">{skillset.description}</p>

      <div class="flex gap-2 mt-4">
        {skillset.tags.map((tag: string) => (
          <span class="px-3 py-1 text-sm rounded-full bg-accent/20 text-accent">
            {tag}
          </span>
        ))}
      </div>
    </header>

    <!-- Installation instructions -->
    <section class="glass-surface p-6 rounded-lg">
      <h2 class="text-2xl font-bold mb-4">Install</h2>
      <pre class="bg-black/30 p-4 rounded overflow-x-auto">
        <code>npx skillsets install @{namespace}/{name}</code>
      </pre>
    </section>
  </article>
</Layout>
```

---

## Tailwind Configuration

```typescript
// tailwind.config.mjs
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        accent: {
          primary: '#4fd1a5',
          secondary: '#38b2ac',
        },
        text: {
          primary: 'rgba(255, 255, 255, 0.85)',
          secondary: 'rgba(255, 255, 255, 0.55)',
        },
        surface: {
          glass: 'rgba(255, 255, 255, 0.05)',
          glassDark: 'rgba(0, 0, 0, 0.3)',
        },
        border: {
          light: 'rgba(255, 255, 255, 0.05)',
          medium: 'rgba(255, 255, 255, 0.1)',
          strong: 'rgba(255, 255, 255, 0.2)',
        },
        status: {
          success: '#5cb85c',
          error: '#d9534f',
          warning: '#f0ad4e',
        },
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      },
    },
  },
};
```

---

## Layout Pattern

```astro
---
// /src/layouts/Layout.astro
import '@/styles/global.css';

interface Props {
  title: string;
  description?: string;
}

const { title, description = 'Verified registry of agentic workflows' } = Astro.props;
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content={description} />
    <title>{title}</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
  </head>

  <body class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-text-primary">
    <nav class="border-b border-border-medium">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <a href="/" class="text-2xl font-bold text-accent-primary">
          Skillsets.cc
        </a>

        <div class="flex gap-4">
          <a href="/contribute" class="hover:text-accent-primary transition-colors">
            Contribute
          </a>
          <a href="/api/login" class="btn-primary">
            Sign In
          </a>
        </div>
      </div>
    </nav>

    <slot />

    <footer class="border-t border-border-medium mt-20">
      <div class="max-w-7xl mx-auto px-4 py-8 text-center text-text-secondary">
        <p>Powered by Valence</p>
      </div>
    </footer>
  </body>
</html>

<style is:global>
  body {
    font-family: 'Inter', system-ui, sans-serif;
  }

  .btn-primary {
    @apply px-4 py-2 rounded bg-accent-primary hover:bg-accent-secondary transition-colors;
  }

  .glass-surface {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  }
</style>
```

---

## Type Definitions

```typescript
// /src/types/index.ts

export interface Skillset {
  schema_version: string;
  name: string;
  version: string;
  description: string;
  author: {
    handle: string;
    url: string;
  };
  verification: {
    production_links: Array<{ url: string; label?: string }>;
    production_proof?: string;
    audit_report: string;
  };
  tags: string[];
  compatibility: {
    claude_code_version: string;
    languages: string[];
  };
  status: 'active' | 'deprecated' | 'archived';
  entry_point: string;
}

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
  author: string;
  stars: number;
  version: string;
  checksum: string;
  files: Record<string, string>;
}
```

---

## API Routes Pattern (Astro Endpoints)

```typescript
// /src/pages/api/stars.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = cookies.get('session')?.value;
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { skillsetId } = await request.json();

  // Proxy to Workers API
  const response = await fetch('https://workers.skillsets.cc/api/stars', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `session=${session}`,
    },
    body: JSON.stringify({ skillsetId }),
  });

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  // Similar pattern for unstar
};
```

---

## Client-Side Search Pattern

```typescript
// /src/components/SearchBar.tsx
import { useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import type { SearchIndexEntry } from '@/types';

interface SearchBarProps {
  skillsets: SearchIndexEntry[];
}

export default function SearchBar({ skillsets }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const fuse = useMemo(
    () =>
      new Fuse(skillsets, {
        keys: ['name', 'description', 'tags', 'author'],
        threshold: 0.3,
      }),
    [skillsets]
  );

  const results = useMemo(() => {
    if (!query) return skillsets;
    return fuse.search(query).map((result) => result.item);
  }, [query, fuse, skillsets]);

  return (
    <div className="mb-8">
      <input
        type="text"
        placeholder="Search skillsets..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-4 py-3 rounded-lg bg-surface-glass border border-border-medium focus:border-accent-primary focus:outline-none transition-colors"
      />

      {query && (
        <p className="mt-2 text-sm text-text-secondary">
          {results.length} result{results.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
```

---

## Testing Pattern (Vitest)

```typescript
// /src/components/__tests__/StarButton.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StarButton from '../StarButton';

describe('StarButton', () => {
  it('renders with initial star count', () => {
    render(<StarButton skillsetId="test" initialStars={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('toggles star on click', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<StarButton skillsetId="test" initialStars={10} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('11')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<StarButton skillsetId="test" initialStars={10} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});
```

---

## Build Configuration

```typescript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server', // Enable SSR
  adapter: cloudflare(),
  integrations: [
    react(),
    tailwind(),
  ],
  vite: {
    ssr: {
      external: ['node:buffer'],
    },
  },
});
```

---

## File Naming

```
Components:     PascalCase.astro     (SkillsetCard.astro)
Pages:          kebab-case.astro     (index.astro, contribute.astro)
React Islands:  PascalCase.tsx       (StarButton.tsx)
Utilities:      camelCase.ts         (parseYAML.ts)
Types:          index.ts             (types/index.ts)
Tests:          [name].test.tsx      (StarButton.test.tsx)
```

---

## Folder Structure

```
src/
├── components/          # Astro components + React islands
│   ├── SkillsetCard.astro
│   ├── StarButton.tsx
│   └── __tests__/
├── layouts/
│   └── Layout.astro
├── pages/              # File-based routing
│   ├── index.astro     # /
│   ├── contribute.astro # /contribute
│   ├── skillset/
│   │   └── [namespace]/
│   │       └── [name].astro  # /skillset/:ns/:name
│   └── api/            # API endpoints
│       └── stars.ts
├── styles/
│   └── global.css
├── types/
│   └── index.ts
└── utils/
    └── parseYAML.ts
```

---

## Performance Checklist

- [ ] Static pages use `export const prerender = true`
- [ ] React islands loaded with `client:load` or `client:visible` directives
- [ ] Images optimized with Astro's `<Image />` component
- [ ] Font preloading in layout
- [ ] Critical CSS inlined, non-critical deferred
- [ ] Build-time data fetching for static content
- [ ] Minimal JavaScript shipped (only interactive islands)

---

## Accessibility Checklist

- [ ] Semantic HTML (`<article>`, `<nav>`, `<main>`)
- [ ] ARIA labels on interactive elements
- [ ] Keyboard navigation support
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Alt text on all images
- [ ] Form labels associated with inputs

---

## Code Review Checklist

- [ ] TypeScript strict mode enabled, no `any` types
- [ ] Static pages prerendered, dynamic pages SSR
- [ ] Tailwind classes used, minimal custom CSS
- [ ] React islands used only for interactivity
- [ ] Error boundaries on interactive components
- [ ] Loading states for async operations
- [ ] No hardcoded URLs (use environment variables)
- [ ] Tests for interactive components
