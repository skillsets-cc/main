# vitest.config.ts

## Overview
**Purpose**: Test runner configuration — jsdom environment for React component testing, path alias resolution, and Cloudflare Workers module mocking.

## Key Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| `test.environment` | `'jsdom'` | DOM simulation for React component tests |
| `test.globals` | `true` | `describe`, `it`, `expect` available without import |

### Path Aliases
| Alias | Maps To | Purpose |
|-------|---------|---------|
| `cloudflare:workers` | `vitest-mocks/cloudflare-workers.ts` | Mocks `DurableObject` base class for unit tests |
| `@/` | `src/` | Mirrors tsconfig `@/*` alias |
| `@components/` | `src/components/` | Mirrors tsconfig `@components/*` alias |

## Dependencies
- **vitest-mocks/cloudflare-workers.ts**: Provides stub `DurableObject` class so `reservation-do.ts` can be tested without Cloudflare runtime
- **jsdom**: DOM implementation for React Testing Library

## Integration Points
- **package.json**: `npm test` runs `vitest`
- **tsconfig.json**: Path aliases must stay in sync
- **vitest-mocks/**: Module-level mocks for Cloudflare APIs
