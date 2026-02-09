# Execution Plan: CLI View Command + Sidebar Auth UI

## Overview
- **Objective**: Add a `view` CLI command for previewing skillset READMEs, and a sidebar auth status indicator showing login/logout state on the site.
- **Scope**:
  - Includes: `view` CLI command, `/api/me` API endpoint, `AuthStatus` React island in sidebar, tests, docs
  - Excludes: Rich terminal markdown rendering, user profile page, avatar display, CLI-side authentication
- **Dependencies**:
  - CLI: `chalk`, `ora`, `commander` (all existing)
  - Site: React, Astro API routes, `auth.ts`, `responses.ts` (all existing)
  - No new packages
- **Estimated Complexity**: Low — two independent features, each is a single file + wiring

### Test Framework Configuration
```
CLI:  Vitest (node environment, pool: forks, singleFork)
Site: Vitest (jsdom environment, @testing-library/react for components)
Structure: Tests in __tests__/ directories alongside source
```

### File Locations
```
Style Guides: .claude/resources/cli_styleguide.md, frontend_styleguide.md, workers_styleguide.md
Design Doc:   PROCESS_DOCS/design/cli-view-sidebar-auth.md
```

---

## Build Agent 1: CLI `view` Command

### Overview
- **Objective**: Add a `view` command that fetches and prints a skillset's README from GitHub raw content
- **Scope**: `cli/` directory only — constants, command implementation, CLI registration, tests, docs
- **Dependencies**: None on Agent 2 (fully independent, no shared files)
- **Complexity**: Low — single fetch-and-print command following existing patterns

### Technical Approach

#### Architecture Decisions
| Decision | Rationale | Alternative | Why Rejected |
|----------|-----------|-------------|--------------|
| Fetch from `raw.githubusercontent.com` | Public, no auth needed, same source as site | Fetch from site API | Site doesn't serve individual READMEs |
| Verify via search index first | Clear "not found" error using existing `fetchSkillsetMetadata` | Fetch README directly, handle 404 | Worse UX — user can't tell if ID is wrong vs README missing |
| Plain text output | Zero new dependencies; READMEs are readable as-is | `marked-terminal` | Adds dependency for marginal v1 benefit |

#### Data Flow
```
User: npx skillsets view @user/name
  → fetchSkillsetMetadata(id)  [existing api.ts]
  → Not found? throw Error("Skillset '@user/name' not found")
  → Construct URL: GITHUB_RAW_BASE/skillsets/{encoded}/content/README.md
  → fetch(url)
  → Failed? throw Error("Could not fetch README")
  → Print header + separator + raw README content
```

### Task Breakdown

#### Task 1: **Add `GITHUB_RAW_BASE` constant** (File: `cli/src/lib/constants.ts`)
- **Description**: Add the GitHub raw content base URL constant
- **Acceptance Criteria**:
  - [ ] `GITHUB_RAW_BASE` exported from `constants.ts`
  - [ ] Value is `` `https://raw.githubusercontent.com/${REGISTRY_REPO}/main` ``
  - [ ] Uses existing `REGISTRY_REPO` constant (already `'skillsets-cc/main'`)
- **Files to Modify**:
  ```
  cli/src/lib/constants.ts   # Add one line
  ```
- **Dependencies**: None
- **Code Example**:
  ```typescript
  // Add after the existing constants (line 9 in current file):
  export const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${REGISTRY_REPO}/main`;
  ```

#### Task 2: **Implement `view` command** (File: `cli/src/commands/view.ts`)
- **Description**: Create the view command that fetches and displays a skillset's README
- **Acceptance Criteria**:
  - [ ] Exports `async function view(skillsetId: string): Promise<void>`
  - [ ] Shows spinner while fetching ("Fetching README...")
  - [ ] Calls `fetchSkillsetMetadata(skillsetId)` to verify existence
  - [ ] On not found: `spinner.fail()` + `throw new Error()`
  - [ ] Constructs URL with `encodeURIComponent` per path segment (namespace and name separately)
  - [ ] Fetches raw README from GitHub
  - [ ] On fetch failure: `spinner.fail()` + `throw new Error()`
  - [ ] Prints header with bold skillset ID, dim separator, then raw README content
- **Files to Create**:
  ```
  cli/src/commands/view.ts
  ```
- **Dependencies**: Task 1 (needs `GITHUB_RAW_BASE`)
- **Code Example** (implement exactly as specified in design doc):
  ```typescript
  import chalk from 'chalk';
  import ora from 'ora';
  import { fetchSkillsetMetadata } from '../lib/api.js';
  import { GITHUB_RAW_BASE } from '../lib/constants.js';

  export async function view(skillsetId: string): Promise<void> {
    const spinner = ora('Fetching README...').start();

    const metadata = await fetchSkillsetMetadata(skillsetId);
    if (!metadata) {
      spinner.fail(`Skillset '${skillsetId}' not found`);
      throw new Error(`Skillset '${skillsetId}' not found`);
    }

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

    console.log();
    console.log(chalk.bold(`  ${skillsetId}`));
    console.log();
    console.log(chalk.dim('  ' + '─'.repeat(50)));
    console.log();
    console.log(readme);
  }
  ```

#### Task 3: **Register `view` command in CLI entry point** (File: `cli/src/index.ts`)
- **Description**: Wire up the view command in the main CLI program
- **Acceptance Criteria**:
  - [ ] Import `view` from `./commands/view.js`
  - [ ] Register `view` command between `search` and `install` in the Discovery Commands section
  - [ ] Command takes `<skillsetId>` argument
  - [ ] Description: `'View a skillset README before installing'`
  - [ ] Error handling follows existing pattern (`try/catch` with `handleError`)
- **Files to Modify**:
  ```
  cli/src/index.ts
  ```
- **Dependencies**: Task 2
- **Code Example**:
  ```typescript
  // Add import at top (after existing command imports, line 7):
  import { view } from './commands/view.js';

  // Add between search command (ends ~line 45) and install command (starts ~line 47):
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

#### Task 4: **Write tests for `view` command** (File: `cli/src/commands/__tests__/view.test.ts`)
- **Description**: Unit tests for the view command covering all paths
- **Acceptance Criteria**:
  - [ ] All 5 test cases pass
  - [ ] Mocks `fetchSkillsetMetadata` from `../../lib/api.js` (partial mock pattern like `search.test.ts`)
  - [ ] Mocks `global.fetch` via `vi.stubGlobal('fetch', mockFetch)` (pattern from `install.test.ts`)
  - [ ] Suppresses console output
- **Files to Create**:
  ```
  cli/src/commands/__tests__/view.test.ts
  ```
- **Dependencies**: Task 2
- **Framework**: Vitest, node environment
- **Test Cases**:
  - `test_throws_when_skillset_not_found`: Mock `fetchSkillsetMetadata` returning `undefined` → `view('@user/nope')` rejects with `"Skillset '@user/nope' not found"`
  - `test_throws_when_readme_fetch_fails`: Mock `fetchSkillsetMetadata` returning metadata, mock `fetch` returning `{ ok: false }` → `view('@user/test')` rejects with `"Could not fetch README for '@user/test'"`
  - `test_prints_readme_on_success`: Mock both succeeding, `fetch` returns `{ ok: true, text: () => '# Hello' }` → `view('@user/test')` resolves, `console.log` called with `'# Hello'`
  - `test_prints_header_with_skillset_name`: After successful view → `console.log` called with string containing `'@user/test'` (the bold header)
  - `test_encodes_url_path_segments`: Mock both succeeding → verify `fetch` was called with URL containing `encodeURIComponent('@user')` (i.e., `%40user`) and `encodeURIComponent('test-name')`
- **Code Example** (setup pattern):
  ```typescript
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { view } from '../view.js';
  import * as api from '../../lib/api.js';

  vi.mock('../../lib/api.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../lib/api.js')>();
    return {
      ...actual,
      fetchSkillsetMetadata: vi.fn(),
    };
  });

  const mockFetch = vi.fn();
  vi.stubGlobal('fetch', mockFetch);

  describe('view command', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    it('test_throws_when_skillset_not_found', async () => {
      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(undefined);
      await expect(view('@user/nope')).rejects.toThrow("Skillset '@user/nope' not found");
    });

    it('test_throws_when_readme_fetch_fails', async () => {
      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue({
        id: '@user/test', name: 'Test', description: '', tags: [],
        author: { handle: '@user' }, stars: 0, version: '1.0.0', checksum: '', files: {},
      });
      mockFetch.mockResolvedValue({ ok: false });
      await expect(view('@user/test')).rejects.toThrow("Could not fetch README for '@user/test'");
    });

    it('test_prints_readme_on_success', async () => {
      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue({
        id: '@user/test', name: 'Test', description: '', tags: [],
        author: { handle: '@user' }, stars: 0, version: '1.0.0', checksum: '', files: {},
      });
      mockFetch.mockResolvedValue({ ok: true, text: async () => '# Hello' });
      await view('@user/test');
      expect(console.log).toHaveBeenCalledWith('# Hello');
    });

    it('test_prints_header_with_skillset_name', async () => {
      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue({
        id: '@user/test', name: 'Test', description: '', tags: [],
        author: { handle: '@user' }, stars: 0, version: '1.0.0', checksum: '', files: {},
      });
      mockFetch.mockResolvedValue({ ok: true, text: async () => '# Hello' });
      await view('@user/test');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('@user/test'));
    });

    it('test_encodes_url_path_segments', async () => {
      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue({
        id: '@user/test-name', name: 'Test', description: '', tags: [],
        author: { handle: '@user' }, stars: 0, version: '1.0.0', checksum: '', files: {},
      });
      mockFetch.mockResolvedValue({ ok: true, text: async () => '' });
      await view('@user/test-name');
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('%40user'));
    });
  });
  ```

#### Task 5: **Update CLI documentation** (Files: `cli/README.md`, `cli/docs_cli/ARC_cli.md`, `cli/docs_cli/commands/view.md`)
- **Description**: Add view command to README table, ARC architecture doc, and create per-file doc
- **Acceptance Criteria**:
  - [ ] `cli/README.md`: `view.ts` row added to Commands table (between `search.ts` and `install.ts`)
  - [ ] `cli/docs_cli/ARC_cli.md`: `view.ts` row added to Commands table (between `search.ts` and `install.ts`), `view` added to Consumer Data Flow
  - [ ] `cli/docs_cli/commands/view.md`: New per-file doc with Purpose, Public API, Dependencies, Key Logic
- **Files to Modify**:
  ```
  cli/README.md                        # Add row to Commands table
  cli/docs_cli/ARC_cli.md              # Add row to Commands table, update data flow
  ```
- **Files to Create**:
  ```
  cli/docs_cli/commands/view.md        # Per-file doc
  ```
- **Dependencies**: Task 2 (need to know exact API)
- **Specific Changes**:

  **`cli/README.md`** — add row after `search.ts`:
  ```markdown
  | `view.ts` | View a skillset README before installing | [Docs](./docs_cli/commands/view.md) |
  ```

  **`cli/docs_cli/ARC_cli.md`** — add row after `commands/search.ts`:
  ```markdown
  | `commands/view.ts` | View skillset README from GitHub raw content | [Docs](./commands/view.md) |
  ```
  Update Consumer Data Flow to include `view`:
  ```markdown
  view → api.ts → fetchSkillsetMetadata → GitHub raw content → Print to terminal
  ```

  **`cli/docs_cli/commands/view.md`** — new file:
  ```markdown
  # view.ts

  ## Purpose
  Fetches and displays a skillset's README from GitHub raw content, allowing users to preview before installing.

  ## Public API
  | Export | Signature | Description |
  |--------|-----------|-------------|
  | `view` | `(skillsetId: string) => Promise<void>` | Fetch and print skillset README |

  ## Dependencies
  - **Internal**: `lib/api.ts` (fetchSkillsetMetadata), `lib/constants.ts` (GITHUB_RAW_BASE)
  - **External**: `chalk` (formatting), `ora` (spinner)

  ## Key Logic
  1. Verify skillset exists via search index (`fetchSkillsetMetadata`)
  2. Construct raw GitHub URL with encoded path segments
  3. Fetch README content
  4. Print with bold header, dim separator, and raw content
  ```

### Testing Strategy
- **Framework**: Vitest (node environment)
- **Pattern**: Mock `fetchSkillsetMetadata` via partial `vi.mock`, mock `global.fetch` via `vi.stubGlobal` (matches `install.test.ts` pattern)
- **Coverage**: All code paths — not found, fetch failure, success
- **Location**: `cli/src/commands/__tests__/view.test.ts`

### Risk Mitigation
| Risk | Probability | Impact | Mitigation | Detection |
|------|-------------|--------|------------|-----------|
| GitHub raw content URL format changes | Low | Medium | URL constructed from `REGISTRY_REPO` constant — single place to update | Tests mock fetch, manual smoke test |
| `encodeURIComponent` double-encodes `@` | Low | Low | `@` encodes to `%40` which is correct for the URL path | Test `test_encodes_url_path_segments` verifies |
| `fetchSkillsetMetadata` API changes | Low | Medium | Function signature is stable; returns `SearchIndexEntry \| undefined` | TypeScript compilation catches |

### Success Criteria
- [ ] `npx skillsets view @supercollectible/Valence` shows README content
- [ ] `npx skillsets view @nonexistent/foo` shows "not found" error
- [ ] All 5 tests pass (`cd cli && npm test -- src/commands/__tests__/view.test.ts`)
- [ ] `view` appears in `npx skillsets --help` between `search` and `install`

---

## Build Agent 2: Sidebar Auth Status UI

### Overview
- **Objective**: Add a session endpoint and auth status React island to the site sidebar
- **Scope**: `site/` directory only — API endpoint, React component, layout wiring, tests, docs
- **Dependencies**: None on Agent 1 (fully independent, no shared files)
- **Complexity**: Low — one API endpoint, one React island, layout insertion

### Technical Approach

#### Architecture Decisions
| Decision | Rationale | Alternative | Why Rejected |
|----------|-----------|-------------|--------------|
| `/api/me` endpoint for session state | httpOnly JWT can't be read client-side; returns user info or 401 | Non-httpOnly cookie | Weakens security |
| React island (not SSR) | Must work on prerendered pages; `client:load` ensures hydration | SSR conditional | Breaks on prerendered pages |
| Empty space while loading | Small element; skeleton draws more attention than final state | Skeleton | Over-engineered |

#### Data Flow
```
Page loads (any page, prerendered or SSR)
  → BaseLayout.astro renders <AuthStatus client:load />
  → React island mounts, renders null (loading)
  → fetch('/api/me')
  → /api/me reads 'session' httpOnly cookie
  → verifySessionToken(env, token)
  → Valid: 200 { login: "username" } → render "@username · Logout"
  → Invalid/missing: 401 → render "Login" link with returnTo
  → Fetch error: render "Login" link (graceful degradation)
```

#### Integration Points
- **Existing**: `getSessionFromRequest(env, request)` in `site/src/lib/auth.ts` — already parses cookies + verifies JWT
- **Existing**: `jsonResponse`, `errorResponse` in `site/src/lib/responses.ts` — standard response helpers
- **Existing**: `createMockEnv`, `createMockKV` in `site/src/lib/__tests__/test-utils.ts` — test helpers for API route tests
- **Layout**: `site/src/layouts/BaseLayout.astro` — sidebar structure with nav + social links

### Task Breakdown

#### Task 1: **Create `/api/me` endpoint** (File: `site/src/pages/api/me.ts`)
- **Description**: Session introspection endpoint that returns the authenticated user's login or 401
- **Acceptance Criteria**:
  - [ ] Exports `GET: APIRoute`
  - [ ] Reads env from `locals.runtime.env` (Cloudflare Workers binding pattern)
  - [ ] Calls `getSessionFromRequest(env, request)` from `@/lib/auth`
  - [ ] No session → returns `errorResponse('Unauthorized', 401)`
  - [ ] Valid session → returns `jsonResponse({ login: session.login })` with `Cache-Control: private, no-store`
  - [ ] Returns only `login` field (no avatar, no userId) — minimal surface
- **Files to Create**:
  ```
  site/src/pages/api/me.ts
  ```
- **Dependencies**: None
- **Code Example** (implement exactly):
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

#### Task 2: **Create `AuthStatus` React island** (File: `site/src/components/AuthStatus.tsx`)
- **Description**: Client-side React component that displays auth state in the sidebar
- **Acceptance Criteria**:
  - [ ] Default export `AuthStatus` (function component)
  - [ ] On mount, fetches `GET /api/me`
  - [ ] Loading state: returns `null` (renders nothing)
  - [ ] Authenticated (200): renders `@{login}` + `·` separator + `Logout` link to `/logout`
  - [ ] Unauthenticated (non-200 or error): renders `Login` link to `/login?returnTo={current path}`
  - [ ] Login link uses `encodeURIComponent(window.location.pathname)` for `returnTo`
  - [ ] Fetch error handled gracefully (catch → show Login link)
  - [ ] Styling: `text-sm`, `text-text-secondary`, `hover:text-orange-500 hover:underline transition-colors` (matches sidebar nav links)
- **Files to Create**:
  ```
  site/src/components/AuthStatus.tsx
  ```
- **Dependencies**: Task 1 (component fetches from `/api/me`)
- **Code Example** (implement exactly):
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

#### Task 3: **Add `AuthStatus` island to sidebar layout** (File: `site/src/layouts/BaseLayout.astro`)
- **Description**: Wire the AuthStatus React island into the sidebar, between the nav and social links
- **Acceptance Criteria**:
  - [ ] Import `AuthStatus` from `@/components/AuthStatus.tsx`
  - [ ] `<AuthStatus client:load />` renders in sidebar
  - [ ] Auth status and social links both pushed to bottom with `mt-auto`
  - [ ] Auth status is above social links, with `space-y-4` gap
  - [ ] Existing social links structure preserved exactly
- **Files to Modify**:
  ```
  site/src/layouts/BaseLayout.astro
  ```
- **Dependencies**: Task 2
- **Specific Changes**:
  Add import in frontmatter:
  ```astro
  ---
  import AuthStatus from '@/components/AuthStatus.tsx';
  import '@/styles/global.css';
  // ... rest of existing frontmatter
  ---
  ```

  Replace the existing social links wrapper (lines 92-107 in current file):
  ```astro
  <!-- Currently: -->
  <div class="mt-auto pt-6">
    <div class="flex items-center justify-center gap-6">
      <!-- social links -->
    </div>
  </div>

  <!-- Replace with: -->
  <div class="mt-auto pt-6 space-y-4">
    <div class="px-0">
      <AuthStatus client:load />
    </div>
    <div class="flex items-center justify-center gap-6">
      <!-- existing social links unchanged -->
    </div>
  </div>
  ```

  Specifically: change `<div class="mt-auto pt-6">` (line 92) to `<div class="mt-auto pt-6 space-y-4">`, and add the `<div class="px-0"><AuthStatus client:load /></div>` block before the social links div.

#### Task 4: **Write tests for `/api/me` endpoint** (File: `site/src/pages/api/__tests__/me.test.ts`)
- **Description**: Unit tests for the session introspection endpoint
- **Acceptance Criteria**:
  - [ ] All 3 test cases pass
  - [ ] Uses existing `createMockEnv` from `../../../lib/__tests__/test-utils`
  - [ ] Mocks `@/lib/auth` module (`getSessionFromRequest`)
  - [ ] Follows `createAPIContext` pattern from `reservations.test.ts`
- **Files to Create**:
  ```
  site/src/pages/api/__tests__/me.test.ts
  ```
- **Dependencies**: Task 1
- **Framework**: Vitest, jsdom environment
- **Test Cases**:
  - `test_returns_401_when_no_session`: Mock `getSessionFromRequest` returning `null` → GET returns 401 with `{ error: 'Unauthorized' }`
  - `test_returns_401_when_jwt_invalid`: Same as above (both cases return null from `getSessionFromRequest`) — mock returning `null` → 401
  - `test_returns_login_when_session_valid`: Mock `getSessionFromRequest` returning `{ userId: '123', login: 'testuser', avatar: '' }` → GET returns 200 with `{ login: 'testuser' }`, `Cache-Control: private, no-store`
- **Code Example**:
  ```typescript
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { createMockEnv } from '../../../lib/__tests__/test-utils';

  vi.mock('@/lib/auth', () => ({
    getSessionFromRequest: vi.fn(),
  }));

  import { GET } from '../me';
  import { getSessionFromRequest } from '@/lib/auth';

  const mockGetSession = getSessionFromRequest as ReturnType<typeof vi.fn>;

  function createAPIContext(request: Request, envOverrides = {}) {
    const env = createMockEnv(envOverrides);
    return {
      request,
      locals: { runtime: { env } },
      params: {},
      redirect: (url: string) => new Response(null, { status: 302, headers: { Location: url } }),
      url: new URL(request.url),
      site: new URL('https://skillsets.cc'),
      generator: 'test',
      props: {},
      cookies: {} as any,
      preferredLocale: undefined,
      preferredLocaleList: undefined,
      currentLocale: undefined,
      rewrite: vi.fn() as any,
      originPathname: '/',
      isPrerendered: false,
      getActionResult: vi.fn() as any,
      callAction: vi.fn() as any,
      routePattern: '',
      clientAddress: '127.0.0.1',
      ResponseWithEncoding: Response as any,
    } as any;
  }

  describe('GET /api/me', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('test_returns_401_when_no_session', async () => {
      mockGetSession.mockResolvedValue(null);
      const ctx = createAPIContext(new Request('https://skillsets.cc/api/me'));
      const response = await GET(ctx);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('test_returns_401_when_jwt_invalid', async () => {
      mockGetSession.mockResolvedValue(null);
      const ctx = createAPIContext(
        new Request('https://skillsets.cc/api/me', {
          headers: { Cookie: 'session=invalid-token' },
        })
      );
      const response = await GET(ctx);

      expect(response.status).toBe(401);
    });

    it('test_returns_login_when_session_valid', async () => {
      mockGetSession.mockResolvedValue({ userId: '123', login: 'testuser', avatar: '' });
      const ctx = createAPIContext(new Request('https://skillsets.cc/api/me'));
      const response = await GET(ctx);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ login: 'testuser' });
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    });
  });
  ```

#### Task 5: **Write tests for `AuthStatus` component** (File: `site/src/components/__tests__/AuthStatus.test.tsx`)
- **Description**: Unit tests for the React island covering all render states
- **Acceptance Criteria**:
  - [ ] All 5 test cases pass
  - [ ] Mocks `globalThis.fetch` (pattern from `StarButton.test.tsx`)
  - [ ] Uses `@testing-library/react` (`render`, `screen`, `waitFor`)
  - [ ] Tests async state transitions
- **Files to Create**:
  ```
  site/src/components/__tests__/AuthStatus.test.tsx
  ```
- **Dependencies**: Task 2
- **Framework**: Vitest, jsdom environment, @testing-library/react
- **Test Cases**:
  - `test_renders_nothing_during_loading`: Render `<AuthStatus />`, immediately check → container is empty (component returns null before fetch resolves)
  - `test_renders_login_when_unauthenticated`: Mock fetch returning `{ ok: false, status: 401 }` → `waitFor` → "Login" link present with `href` containing `/login?returnTo=`
  - `test_renders_username_and_logout_when_authenticated`: Mock fetch returning `{ ok: true, json: () => ({ login: 'testuser' }) }` → `waitFor` → `@testuser` text visible, "Logout" link present with `href="/logout"`
  - `test_login_link_includes_returnTo`: Mock 401 → Login link href includes `returnTo=%2F` (encoded `/`)
  - `test_handles_fetch_error_gracefully`: Mock fetch rejecting → `waitFor` → "Login" link rendered (not crash/empty)
- **Code Example**:
  ```tsx
  import { render, screen, waitFor } from '@testing-library/react';
  import { describe, it, expect, vi, afterEach } from 'vitest';
  import AuthStatus from '../AuthStatus';

  describe('AuthStatus', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('test_renders_nothing_during_loading', () => {
      // Never-resolving fetch to keep loading state
      globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {})) as typeof fetch;
      const { container } = render(<AuthStatus />);
      expect(container.innerHTML).toBe('');
    });

    it('test_renders_login_when_unauthenticated', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }) as typeof fetch;

      render(<AuthStatus />);

      await waitFor(() => {
        const link = screen.getByText('Login');
        expect(link).toBeDefined();
        expect(link.getAttribute('href')).toContain('/login?returnTo=');
      });
    });

    it('test_renders_username_and_logout_when_authenticated', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ login: 'testuser' }),
      }) as typeof fetch;

      render(<AuthStatus />);

      await waitFor(() => {
        expect(screen.getByText('@testuser')).toBeDefined();
        const logoutLink = screen.getByText('Logout');
        expect(logoutLink.getAttribute('href')).toBe('/logout');
      });
    });

    it('test_login_link_includes_returnTo', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }) as typeof fetch;

      render(<AuthStatus />);

      await waitFor(() => {
        const link = screen.getByText('Login');
        expect(link.getAttribute('href')).toContain('returnTo=%2F');
      });
    });

    it('test_handles_fetch_error_gracefully', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as typeof fetch;

      render(<AuthStatus />);

      await waitFor(() => {
        expect(screen.getByText('Login')).toBeDefined();
      });
    });
  });
  ```

#### Task 6: **Write documentation** (Files: `site/src/components/docs_components/AuthStatus.md`, `site/src/pages/api/docs_api/me.md`)
- **Description**: Per-file docs for the new component and endpoint
- **Acceptance Criteria**:
  - [ ] `AuthStatus.md`: Purpose, Public API, Dependencies, Key Logic
  - [ ] `me.md`: Purpose, Public API (GET endpoint), Dependencies, Key Logic
- **Files to Create**:
  ```
  site/src/components/docs_components/AuthStatus.md
  site/src/pages/api/docs_api/me.md
  ```
- **Dependencies**: Tasks 1, 2

  **`site/src/components/docs_components/AuthStatus.md`**:
  ```markdown
  # AuthStatus.tsx

  ## Purpose
  React island that displays the user's authentication state in the sidebar. Fetches session info from `/api/me` and renders either a Login link or username with Logout link.

  ## Public API
  | Export | Type | Description |
  |--------|------|-------------|
  | `default` | React component | Auth status display (used as `<AuthStatus client:load />`) |

  ## Dependencies
  - **Internal**: `/api/me` endpoint (fetched client-side)
  - **External**: React (`useState`, `useEffect`)

  ## Key Logic
  1. Mounts and fetches `GET /api/me`
  2. Returns `null` during loading (no layout shift)
  3. 200 response: shows `@{login} · Logout`
  4. 401/error: shows `Login` link with `returnTo` query param
  ```

  **`site/src/pages/api/docs_api/me.md`**:
  ```markdown
  # me.ts

  ## Purpose
  Session introspection endpoint. Returns the authenticated user's GitHub login or 401 if not authenticated. Used by the `AuthStatus` React island to determine client-side auth state.

  ## Public API
  | Export | Method | Response | Description |
  |--------|--------|----------|-------------|
  | `GET` | GET | `200 { login }` or `401 { error }` | Check session state |

  ## Dependencies
  - **Internal**: `lib/auth.ts` (`getSessionFromRequest`), `lib/responses.ts` (`jsonResponse`, `errorResponse`)

  ## Key Logic
  1. Read env from `locals.runtime.env` (Cloudflare Workers binding)
  2. Call `getSessionFromRequest(env, request)` — parses session cookie + verifies JWT
  3. No session → `errorResponse('Unauthorized', 401)`
  4. Valid session → `jsonResponse({ login }, { headers: { 'Cache-Control': 'private, no-store' } })`
  ```

### Testing Strategy
- **Framework**: Vitest (jsdom environment)
- **API Tests**: Mock `getSessionFromRequest`, use `createAPIContext` pattern from `reservations.test.ts`
- **Component Tests**: Mock `globalThis.fetch`, use `@testing-library/react` (pattern from `StarButton.test.tsx`)
- **Coverage**: All code paths — unauthenticated, authenticated, fetch error, loading
- **Locations**: `site/src/pages/api/__tests__/me.test.ts`, `site/src/components/__tests__/AuthStatus.test.tsx`

### Risk Mitigation
| Risk | Probability | Impact | Mitigation | Detection |
|------|-------------|--------|------------|-----------|
| `AuthStatus` flickers on prerendered pages | Low | Low | Returns `null` during loading — no visible element | Manual test on prerendered page (`/about`) |
| `/api/me` called on every page load | Medium | Low | Same-origin fetch is fast; `Cache-Control: private, no-store` prevents stale auth | Browser DevTools network tab |
| `window.location` undefined in SSR context | Low | Medium | Component only runs client-side (`client:load`); window is always available | Component test with jsdom |
| `getSessionFromRequest` return type changes | Low | High | TypeScript strict mode catches at compile time | CI build |

### Success Criteria
- [ ] Unauthenticated users see "Login" link in sidebar on all pages
- [ ] Authenticated users see "@username · Logout" in sidebar
- [ ] Login link includes `returnTo` with current page path
- [ ] Auth status renders below nav, above social links
- [ ] All 8 tests pass (`cd site && npm test -- src/pages/api/__tests__/me.test.ts src/components/__tests__/AuthStatus.test.tsx`)

---

## Implementation Notes

### Agent Independence
These two agents have **zero file overlap** and can execute fully in parallel:
- Agent 1 touches only `cli/` files
- Agent 2 touches only `site/` files

### Running Tests
```bash
# Agent 1 (CLI)
cd cli && npm test -- src/commands/__tests__/view.test.ts

# Agent 2 (Site)
cd site && npm test -- src/pages/api/__tests__/me.test.ts src/components/__tests__/AuthStatus.test.tsx

# Full suite after both agents complete
cd cli && npm test
cd site && npm test
```

### Key Existing Utilities
- **CLI mock pattern**: `vi.mock('../../lib/api.js', async (importOriginal) => ...)` for partial mocks; `vi.stubGlobal('fetch', mockFetch)` for global fetch
- **Site API test pattern**: `createAPIContext(request, envOverrides)` helper with full `APIContext` mock (from `reservations.test.ts`)
- **Site component test pattern**: Replace `globalThis.fetch` directly, restore in `afterEach` (from `StarButton.test.tsx`)
- **Response helpers**: `jsonResponse(data, options)` and `errorResponse(msg, status)` in `site/src/lib/responses.ts`
- **Auth helpers**: `getSessionFromRequest(env, request)` returns `{ userId, login, avatar } | null`
