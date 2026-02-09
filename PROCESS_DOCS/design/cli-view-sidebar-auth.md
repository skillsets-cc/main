# Design: CLI View Command + Sidebar Auth UI

**Status:** Draft
**Date:** 2026-02-09

## Executive Summary

Two small features that round out the user experience: a `view` command that lets CLI users preview a skillset's README before installing, and a dynamic auth status in the site sidebar showing login/logout state. The CLI feature is a single fetch-and-print. The sidebar feature introduces a `/api/me` session endpoint and a React island, establishing the client-side auth primitive that the future user page will build on.

## Scope

- **Includes**: `view` CLI command, `/api/me` API endpoint, `AuthStatus` React island in sidebar
- **Excludes**: Rich terminal markdown rendering, user profile page, avatar display, CLI-side authentication
- **Dependencies**: None new — uses existing `chalk`, `ora`, `commander` (CLI) and React + Astro (site)

## Rationale

| Decision | Rationale | Alternative | Why Rejected |
|----------|-----------|-------------|--------------|
| Fetch README from GitHub raw content | Public, no auth needed, same source as site; `raw.githubusercontent.com` serves plain text | Fetch from CDN/site API | Site doesn't serve individual READMEs; would need a new endpoint for no benefit |
| Verify skillset exists via search index first | Gives a clear "not found" error using existing `fetchSkillsetMetadata`; avoids cryptic 404 from GitHub | Fetch README directly, handle 404 | Worse UX — user doesn't know if the ID is wrong or the README is missing |
| `/api/me` endpoint for session state | httpOnly JWT cookie can't be read client-side; endpoint returns user info or 401 | Duplicate session data in a non-httpOnly cookie | Weakens security; two cookies to manage; auth state can drift |
| React island (not SSR) for sidebar auth | Must work on prerendered pages (no Worker env at build time); stars and future user page need client-side auth awareness | SSR conditional render in Astro layout | Breaks on prerendered pages (`/`, `/about`, `/contribute`, `/cli`); auth would only work on SSR skillset detail pages |
| Empty space while loading (no skeleton) | Auth status is a small element; skeleton would draw more attention than the final state; loads fast from same-origin `/api/me` | Skeleton placeholder | Over-engineered for a one-line element |
| Plain text README (no markdown rendering) | Zero new dependencies; READMEs are written to be readable as plain text; `marked`/`marked-terminal` can be added later | `marked-terminal` for rich rendering | Adds dependency for marginal benefit in v1; non-goal per brief |
| Minimal header before README content | Confirms which skillset the user is viewing; separator visually distinguishes the metadata from content | No header | Disorienting if the README doesn't start with its own title |

## Technology Stack

No new dependencies for either feature.

**CLI side**: `fetch` (built-in), `chalk` (existing), `ora` (existing), `commander` (existing)
**Site side**: React (existing), Astro API routes (existing), `auth.ts` (existing)

## Architecture

### Feature A: CLI `view` Command

```
User runs: npx skillsets view @supercollectible/Valence
  │
  ├─ 1. fetchSkillsetMetadata(id)  ← existing api.ts
  │     └─ Not found? → "Skillset '@foo/bar' not found" (throws)
  │
  ├─ 2. Construct raw GitHub URL (encodeURIComponent per segment)
  │     https://raw.githubusercontent.com/skillsets-cc/main/main/
  │       skillsets/%40supercollectible/Valence/content/README.md
  │
  ├─ 3. fetch(url)
  │     └─ Failed? → "Could not fetch README for '@foo/bar'" (throws)
  │
  └─ 4. Print to stdout:
        ┌──────────────────────────────────────┐
        │  @supercollectible/Valence            │
        │                                       │
        │  ─────────────────────────────────── │
        │                                       │
        │  # Claude Code Workflow System        │
        │  ...raw README content...             │
        └──────────────────────────────────────┘
```

### Feature B: Sidebar Auth UI

```
Page loads (any page, prerendered or SSR)
  │
  ├─ BaseLayout.astro renders <AuthStatus client:load />
  │   └─ Initially renders nothing (empty container)
  │
  ├─ React island mounts, fetches GET /api/me
  │
  ├─ /api/me (SSR API route):
  │   ├─ Read 'session' httpOnly cookie from request
  │   ├─ Verify JWT via verifySessionToken(env, token)
  │   ├─ Valid → 200 { login: "username" }
  │   └─ Invalid/missing → 401
  │
  └─ AuthStatus renders:
      ├─ 401 → <a href="/login?returnTo={path}">Login</a>
      └─ 200 → <span>@username</span> · <a href="/logout">Logout</a>
```

## Implementation Details

### New Files

```
cli/src/commands/view.ts            ← view command implementation
site/src/pages/api/me.ts            ← session endpoint
site/src/components/AuthStatus.tsx   ← sidebar auth React island
```

### Modified Files

```
cli/src/index.ts                    ← register view command
cli/src/lib/constants.ts            ← add GITHUB_RAW_BASE constant
site/src/layouts/BaseLayout.astro   ← add AuthStatus island to sidebar
```

### File Details

#### `cli/src/lib/constants.ts`

Add one constant:

```typescript
export const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${REGISTRY_REPO}/main`;
```

#### `cli/src/commands/view.ts`

```typescript
import chalk from 'chalk';
import ora from 'ora';
import { fetchSkillsetMetadata } from '../lib/api.js';
import { GITHUB_RAW_BASE } from '../lib/constants.js';

export async function view(skillsetId: string): Promise<void> {
  const spinner = ora('Fetching README...').start();

  // Verify skillset exists via index (handles invalid IDs with "not found")
  const metadata = await fetchSkillsetMetadata(skillsetId);
  if (!metadata) {
    spinner.fail(`Skillset '${skillsetId}' not found`);
    throw new Error(`Skillset '${skillsetId}' not found`);
  }

  // Encode path segments to match site's [name].astro pattern
  const [namespace, name] = skillsetId.split('/');
  const encodedPath = encodeURIComponent(namespace) + '/' + encodeURIComponent(name);
  const url = `${GITHUB_RAW_BASE}/skillsets/${encodedPath}/content/README.md`;
  const response = await fetch(url);

  if (!response.ok) {
    spinner.fail(`Could not fetch README for '${skillsetId}'`);
    throw new Error(`Could not fetch README for '${skillsetId}'`);
  }

  spinner.stop();

  const readme = await response.text();

  // Print with minimal header
  console.log();
  console.log(chalk.bold(`  ${skillsetId}`));
  console.log();
  console.log(chalk.dim('  ' + '─'.repeat(50)));
  console.log();
  console.log(readme);
}
```

#### `cli/src/index.ts`

Add between search and install (discovery commands section):

```typescript
import { view } from './commands/view.js';

// ... existing commands ...

program
  .command('view')
  .description('View a skillset README before installing')
  .argument('<skillsetId>', 'Skillset ID (e.g., @user/skillset-name)')
  .action(async (skillsetId) => {
    try {
      await view(skillsetId);
    } catch (error) {
      handleError(error);
    }
  });
```

#### `site/src/pages/api/me.ts`

```typescript
import type { APIRoute } from 'astro';
import { getSessionFromRequest, type Env } from '../../lib/auth';
import { jsonResponse, errorResponse } from '../../lib/responses';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;
  const session = await getSessionFromRequest(env, request);

  if (!session) {
    return errorResponse('Unauthorized', 401);
  }

  return jsonResponse({ login: session.login }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
};
```

Deliberately minimal — returns only `login`. Avatar and other fields added when the user page needs them.

#### `site/src/components/AuthStatus.tsx`

```tsx
import { useState, useEffect } from 'react';

export default function AuthStatus() {
  const [login, setLogin] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/me')
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.login) setLogin(data.login);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  if (login) {
    return (
      <div className="text-sm">
        <span className="text-text-secondary">@{login}</span>
        <span className="text-text-tertiary mx-1">·</span>
        <a
          href="/logout"
          className="text-text-secondary hover:text-orange-500 hover:underline transition-colors"
        >
          Logout
        </a>
      </div>
    );
  }

  return (
    <a
      href={`/login?returnTo=${encodeURIComponent(window.location.pathname)}`}
      className="text-sm text-text-secondary hover:text-orange-500 hover:underline transition-colors"
    >
      Login
    </a>
  );
}
```

#### `site/src/layouts/BaseLayout.astro`

Add the import and island placement. The `AuthStatus` island goes between the `</nav>` and the social links div, in its own container:

```astro
---
import AuthStatus from '@/components/AuthStatus.tsx';
// ... existing imports
---

<!-- In sidebar, after </nav> and before social links div -->
<div class="mt-auto pt-6 space-y-4">
  <div class="px-0">
    <AuthStatus client:load />
  </div>
  <div class="flex items-center justify-center gap-6">
    <!-- existing social links -->
  </div>
</div>
```

The `mt-auto` pushes both auth status and social links to the bottom of the sidebar.

### Tests

#### CLI: `cli/src/commands/__tests__/view.test.ts`

- Throws when skillset doesn't exist in index
- Throws when README fetch fails (404)
- Prints README content on success
- Prints header with skillset name
- Encodes URL path segments

Mock `fetchSkillsetMetadata` and `global.fetch` (for the raw GitHub request). Errors throw (caught by `handleError` in `index.ts`).

#### Site: `site/src/components/__tests__/AuthStatus.test.tsx`

- Renders nothing during loading
- Renders "Login" link when `/api/me` returns 401
- Renders "@username · Logout" when `/api/me` returns 200
- Login link includes `returnTo` with current path
- Handles fetch error gracefully (renders Login)

#### Site: `site/src/pages/api/__tests__/me.test.ts`

- Returns 401 when no session cookie
- Returns 401 when JWT is expired/invalid
- Returns `{ login }` when session is valid

### Documentation Updates

| File | Update |
|------|--------|
| `cli/README.md` | Add `view` to command table |
| `cli/docs_cli/ARC_cli.md` | Add view command to architecture |
| `cli/docs_cli/commands/view.md` | New per-file doc |
| `site/src/components/docs_components/AuthStatus.md` | New per-file doc |
| `site/src/pages/api/docs_api/me.md` | New per-file doc |
