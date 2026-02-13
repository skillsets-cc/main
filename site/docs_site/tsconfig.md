# tsconfig.json

## Overview
**Purpose**: TypeScript configuration — extends Astro's strict preset, configures React JSX, and defines path aliases for clean imports.

## Key Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| `extends` | `astro/tsconfigs/strict` | Strict mode with Astro-specific settings |
| `jsx` | `react-jsx` | React 17+ JSX transform (no `import React`) |
| `jsxImportSource` | `react` | Use React for JSX |

### Path Aliases
| Alias | Maps To | Example |
|-------|---------|---------|
| `@/*` | `src/*` | `import { Env } from '@/lib/auth'` |
| `@components/*` | `src/components/*` | `import StarButton from '@components/StarButton'` |
| `@layouts/*` | `src/layouts/*` | `import BaseLayout from '@layouts/BaseLayout.astro'` |
| `@pages/*` | `src/pages/*` | `import type { ... } from '@pages/...'` |
| `@styles/*` | `src/styles/*` | `import '@styles/global.css'` |

### Include/Exclude
- Includes: `.astro/types.d.ts` (generated Astro types) + all files
- Excludes: `dist/` (build output)

## Integration Points
- **vitest.config.ts**: Mirrors `@/` and `@components/` aliases for test resolution
- **astro.config.mjs**: Astro uses this config for type checking during build
- **IDE**: Powers autocomplete, error checking, and go-to-definition
