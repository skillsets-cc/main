# CLI Style Guide

## Node.js CLI Development Standards

---

## CLI Entry Point Pattern (Commander.js)

Load version from `package.json` at runtime — never hardcode. Use `createRequire` for JSON imports in ESM.

Wrap all command actions with a generic `run<T>()` helper that catches errors and routes to `handleError`. Never write per-command `try/catch` blocks.

```typescript
#!/usr/bin/env node
// /src/index.ts

import { createRequire } from 'node:module';
import { program } from 'commander';
import { handleError } from './lib/errors.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

/** Wraps an async command action with unified error handling. */
function run<T extends unknown[]>(fn: (...args: T) => Promise<void>) {
  return (...args: T) => fn(...args).catch(handleError);
}

program
  .name('skillsets')
  .description('CLI tool for discovering and installing verified skillsets')
  .version(version);

// Register commands with: .action(run(commandFn))
program
  .command('search')
  .argument('<query>', 'Search query')
  .option('-l, --limit <number>', 'Limit results (default: 10)', '10')
  .action(run(search));
```

**Rules:**
- Every command gets `.description()` for `--help` output
- Group commands with `// === Discovery Commands ===` / `// === Contribution Commands ===` comments
- Arguments use `<required>` angle brackets
- Options with defaults pass the default as the third `.option()` argument

---

## Constants Pattern

Centralize all configuration in `/src/lib/constants.ts`. No hardcoded URLs or magic numbers in command files.

```typescript
export const CDN_BASE_URL = 'https://skillsets.cc';
export const SEARCH_INDEX_URL = `${CDN_BASE_URL}/search-index.json`;
export const STATS_URL = `${CDN_BASE_URL}/api/stats/counts`;
export const DOWNLOADS_URL = `${CDN_BASE_URL}/api/downloads`;
export const REGISTRY_REPO = 'skillsets-cc/main';
export const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${REGISTRY_REPO}/main`;
export const CACHE_TTL_MS = 60 * 60 * 1000;       // 1 hour (search index)
export const STATS_CACHE_TTL_MS = 60 * 1000;       // 1 minute (live stats)
export const DEFAULT_SEARCH_LIMIT = 10;
export const BACKUP_DIR_NAME = '.claude.backup';
```

---

## Error Handling

### Two-tier error model

| Tier | When | Mechanism | Example |
|------|------|-----------|---------|
| **User-correctable** | Bad input, conflicts, missing prerequisites | `spinner.fail()` + guidance + `return` | Invalid ID format, file conflicts without flags |
| **System failure** | Network errors, checksum mismatch, unexpected state | `throw` (caught by `run()` → `handleError`) | Fetch failure, corrupted download |

### `handleError` (the catch-all)

```typescript
// /src/lib/errors.ts
export function handleError(error: unknown): void {
  if (error instanceof Error) {
    console.error(chalk.red(`Error: ${error.message}`));
  } else {
    console.error(chalk.red('Unexpected error:'));
    console.error(error);
  }
  process.exit(1);
}
```

### Spinner-fail-throw helper

For commands using spinners, define a local `fail()` that stops the spinner and throws in one call:

```typescript
function fail(spinner: ReturnType<typeof ora>, message: string): never {
  spinner.fail(message);
  throw new Error(message);
}
```

### Error messages must be actionable

When aborting, print what went wrong AND what the user can do about it:

```typescript
spinner.fail('Installation aborted');
console.log(chalk.yellow('\nExisting files detected:'));
conflicts.forEach((file) => console.log(`  - ${file}`));
console.log(chalk.cyan('\nUse one of these flags:'));
console.log('  --force   Overwrite existing files');
console.log('  --backup  Backup existing files before install');
```

---

## Output Formatting

### Chalk color conventions

| Color | Usage |
|-------|-------|
| `chalk.blue()` | Status messages ("Searching for: ...") |
| `chalk.green()` | Success messages ("Found N results", "Installation complete!") |
| `chalk.yellow()` | Warnings (star counts `★ 10`, existing files, MCP warnings) |
| `chalk.red()` | Errors |
| `chalk.cyan()` | Actionable hints (install commands, flag suggestions) |
| `chalk.gray()` / `chalk.dim()` | Metadata, secondary info (author, version, separators) |
| `chalk.bold()` | Headings and primary identifiers |

### Spinner pattern (ora)

Use spinners for any operation that makes network requests or writes files. Update `.text` as phases progress. Never use a spinner for pure computation (Fuse.js search is fast enough without one).

```typescript
const spinner = ora('Fetching skillsets...').start();
// ... network call ...
spinner.text = 'Verifying checksums...';
// ... verification ...
spinner.succeed('Successfully installed @user/skillset');
```

Stop the spinner before printing interactive prompts or multi-line output. Resume with `spinner.start()` afterward.

---

## Command Patterns

### Parallel fetch pattern

Always fetch the search index and live stats in parallel. Merge stats into entries before further processing.

```typescript
const [index, stats] = await Promise.all([fetchSearchIndex(), fetchStats()]);
const skillsets = mergeStats(index.skillsets, stats);
```

### Search (Fuse.js)

Fuse.js config: `threshold: 0.3`, `includeScore: true`, keys: `['name', 'description', 'tags', 'author.handle']`. Filter by tags before fuzzy search (reduces search space). Apply limit after search.

### List

Sort options: `name` (alphabetical, default), `stars` (descending), `downloads` (descending). Support `--json` for machine-readable output via `JSON.stringify(data, null, 2)`. Use inline `padEnd`/`truncate` helpers for column-aligned text tables.

### View

Fetch the README from GitHub raw CDN. Encode the skillset ID path segments separately (namespace and name each get `encodeURIComponent`). Print with a dimmed separator line.

### Install (temp dir + verify + copy)

**Download to a temp directory first, verify checksums there, then copy to cwd.** This prevents leaving corrupted files in the user's project.

```
1. Validate @author/name format (regex)
2. Detect conflicts → abort with guidance unless --force or --backup
3. Check for MCP servers in metadata → prompt consent
4. degit clone to mkdtemp() temp dir (cache: false, force: true)
5. Verify checksums against registry
6. Copy verified content to cwd
7. Clean up temp dir (always, even on error)
8. Track download (fire-and-forget POST)
```

**degit options:** Always use `cache: false` (ensures fresh download), `force: true`, `verbose: false`.

**Cleanup:** Wrap the temp dir lifecycle in `try/finally` — always `rm(tempDir, { recursive: true, force: true })`.

### MCP consent flow

When a skillset declares MCP servers, warn the user before installing. The flow:

1. Fetch metadata from search index before degit
2. If `mcp_servers` exist, stop spinner, show formatted warning, prompt with `@inquirer/prompts` `confirm()`
3. Non-TTY environments: require `--accept-mcp` flag or exit with error
4. Fallback: if metadata fetch fails, inspect downloaded content for `.mcp.json` / `.claude/settings.json` post-download

### Download tracking

Fire-and-forget POST after successful install. Always `.catch(() => {})` — never block on analytics.

```typescript
fetch(DOWNLOADS_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ skillset: skillsetId }),
}).catch(() => {});
```

---

## API Utilities

### Module-level caching

Cache the search index (1-hour TTL) and stats (1-minute TTL) in module-level variables. Use `Date.now()` comparison for expiration. Import TTL constants from `constants.ts`.

```typescript
let cachedIndex: SearchIndex | null = null;
let cacheTime: number = 0;
const EMPTY_STATS: StatsResponse = { stars: {}, downloads: {} };
```

### Graceful degradation

| Function | On error |
|----------|----------|
| `fetchSearchIndex` | Throws — callers must handle (search index is required) |
| `fetchStats` | Returns `EMPTY_STATS` — stats are optional, never block the command |
| `fetchSkillsetMetadata` | Returns `undefined` — callers check before using |

### Stats merging

`mergeStats()` overlays live stats onto index entries. Stars fall back to the index value; downloads fall back to `0`.

---

## Checksum Utilities

### Path mapping

The search index stores paths as `content/CLAUDE.md` but degit extracts the `content/` folder's contents directly. Verification must:

1. Skip any file not starting with `content/`
2. Strip the `content/` prefix before resolving the local path
3. Strip algorithm prefixes from checksums (`sha256:abc123` → `abc123`)

### Missing files

Record missing files as `actual: 'MISSING'` in the mismatches array. Don't short-circuit — report all mismatches.

---

## Filesystem Utilities

### Conflict detection

Check for `.claude/`, `CLAUDE.md`, `skillset.yaml` using `fs.access()`. These are the paths degit would overwrite.

### Backup

Copy conflicting files to `.claude.backup/`, preserving directory structure. Use recursive `cp` for directories.

### Skillset detection

Parse `skillset.yaml` with `js-yaml`, extract `@{author.handle}/{name}`. Return `null` on any error (file missing, invalid YAML).

---

## MCP Validation (`validate-mcp.ts`)

Bidirectional check between content files and manifest:

| Direction | Rule |
|-----------|------|
| Content → Manifest | Every MCP server in `.mcp.json`, `.claude/settings.json`, or `docker/*.yaml` must be declared in `skillset.yaml` `mcp_servers` |
| Manifest → Content | Every `mcp_servers` entry must exist in content (or as a nested server in a Docker config) |

**Sources:** Native servers from JSON files (`mcpServers` key), Docker servers from YAML files in `docker/` (`mcp_servers` key). First found by name+source wins (deduplication).

---

## Type Definitions

### Shared sub-interfaces

Extract repeated shapes into named interfaces. Both `Skillset` (manifest) and `SearchIndexEntry` (index) share verification, compatibility, and status types:

```typescript
export type SkillsetStatus = 'active' | 'deprecated' | 'archived';

export interface SkillsetVerification {
  production_links: Array<{ url: string; label?: string }>;
  production_proof?: string;
  audit_report: string;
}

export interface SkillsetCompatibility {
  claude_code_version: string;
  languages: string[];
}
```

### MCP types

```typescript
export interface McpServer {
  name: string;
  type: 'stdio' | 'http' | 'docker';
  command?: string;       // stdio
  args?: string[];        // stdio
  url?: string;           // http
  image?: string;         // docker
  servers?: McpNestedServer[];  // docker (inner servers)
  mcp_reputation: string;
  researched_at: string;
}

export interface McpNestedServer {
  name: string;
  command: string;
  args?: string[];
  mcp_reputation: string;
  researched_at: string;
}
```

### Core types

- `SearchIndex`: `{ version, generated_at, skillsets: SearchIndexEntry[] }`
- `SearchIndexEntry`: Index entry with runtime stats (`stars`, `downloads?`, `files`, `checksum`, `mcp_servers?`)
- `StatsResponse`: `{ stars: Record<string, number>, downloads: Record<string, number> }`
- `Skillset`: Parsed `skillset.yaml` manifest (no `files`/`checksum`/`downloads` — those are index-only)

---

## Testing Pattern (Vitest)

### Partial mocks with `importOriginal`

Prefer partial mocks that preserve real implementations. Only stub the functions you need to control:

```typescript
vi.mock('../../lib/api.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api.js')>();
  return {
    ...actual,
    fetchSearchIndex: vi.fn(),
    fetchStats: vi.fn(),
  };
});
```

### Global stubs

Use `vi.stubGlobal` for `fetch` and `vi.spyOn` for `console`:

```typescript
vi.stubGlobal('fetch', vi.fn());
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
```

### Process mocking

```typescript
process.cwd = vi.fn().mockReturnValue('/test/dir');
process.exit = vi.fn() as never;
Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });
```

### Temp directories for filesystem tests

Create isolated temp dirs per test. Clean up in `afterEach`:

```typescript
let tempDir: string;
beforeEach(() => { tempDir = mkdtempSync(join(tmpdir(), 'test-')); });
afterEach(() => { rmSync(tempDir, { recursive: true, force: true }); });
```

### Module cache bypass

When testing cached modules (like `api.ts`), re-import to get a fresh module instance:

```typescript
const { fetchSearchIndex: freshFetch } = await import('../api.js');
```

### Test structure

- `describe()` groups by feature area
- Nested `describe()` for sub-features (e.g., "MCP server warning" within install tests)
- `beforeEach`: `vi.clearAllMocks()` + save originals
- `afterEach`: restore originals + clean up temp files
- Assert with `expect.stringContaining()` for partial output matching

---

## Vitest Configuration

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    fileParallelism: false,
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**', 'src/**/*.test.ts'],
    },
  },
});
```

**Key settings:**
- `globals: true` — no need to import `describe`/`it`/`expect`
- `pool: 'forks'` + `fileParallelism: false` — tests share module-level state (caches), so run sequentially
- Coverage counts source files only, excludes test files

---

## Package Configuration

```json
{
  "name": "skillsets",
  "type": "module",
  "bin": { "skillsets": "./dist/index.js" },
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc && node dist/index.js",
    "test": "vitest --run",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build"
  },
  "engines": { "node": ">=18.0.0" }
}
```

**Dependencies:**

| Package | Purpose |
|---------|---------|
| `commander` | CLI framework |
| `chalk` | Colored terminal output |
| `ora` | Spinners for long operations |
| `@inquirer/prompts` | Interactive prompts (confirm, input, checkbox) |
| `degit` | Git repo extraction without `.git` folder |
| `fuse.js` | Client-side fuzzy search |
| `js-yaml` | YAML parsing for `skillset.yaml` |

**Dev dependencies:** `typescript`, `vitest`, `@vitest/coverage-v8`, `@types/js-yaml`, `@types/node`

---

## File Structure

```
cli/
├── src/
│   ├── commands/
│   │   ├── search.ts        # Fuzzy search with Fuse.js
│   │   ├── list.ts          # Browse all with sorting + JSON output
│   │   ├── view.ts          # Display README before install
│   │   ├── install.ts       # degit + MCP consent + checksum verification
│   │   ├── init.ts          # Scaffold skillset submission
│   │   ├── audit.ts         # Validate before submission
│   │   ├── submit.ts        # Open PR via gh CLI
│   │   └── __tests__/
│   ├── lib/
│   │   ├── api.ts           # Fetch index, stats, metadata (cached)
│   │   ├── checksum.ts      # SHA-256 verification
│   │   ├── constants.ts     # URLs, TTLs, config values
│   │   ├── errors.ts        # Unified error handler
│   │   ├── filesystem.ts    # Conflict detection, backups
│   │   ├── validate-mcp.ts  # Bidirectional MCP declaration check
│   │   ├── versions.ts      # Semver comparison
│   │   └── __tests__/
│   ├── types/
│   │   ├── index.ts         # All shared types
│   │   └── degit.d.ts       # Type declarations for degit
│   └── index.ts             # CLI entry point (run() wrapper)
├── docs_cli/                # Module documentation
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## Command Summary

| Command | Purpose | Key Features |
|---------|---------|--------------|
| `list` | Browse all skillsets | Sorting, JSON output, live stats, table formatting |
| `search <query>` | Fuzzy search | Tag filtering, Fuse.js, parallel fetch |
| `view <id>` | Preview README | GitHub raw CDN fetch, URL encoding |
| `install <id>` | Install skillset | Temp dir, checksum verification, MCP consent, download tracking |
| `init` | Scaffold submission | gh CLI auth, reservation lookup, degit audit-skill fetch |
| `audit` | Validate skillset | Manifest check, secret scan, binary detection, MCP validation |
| `submit` | Open registry PR | Fork, branch, force push, PR template |

---

## Publishing Checklist

- [ ] Build succeeds (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] `bin` field points to `./dist/index.js`
- [ ] Shebang (`#!/usr/bin/env node`) at top of entry file
- [ ] Version bumped in `package.json` (read dynamically by CLI)
- [ ] No hardcoded URLs (use `constants.ts`)
- [ ] Error messages are actionable with next steps

---

## Code Review Checklist

- [ ] TypeScript strict mode, no `any` types
- [ ] All commands registered with `run()` wrapper (no manual try/catch)
- [ ] Spinners for network/filesystem operations, not for fast computation
- [ ] Chalk colors follow the convention table above
- [ ] Temp directories cleaned up in `finally` blocks
- [ ] API fetches use parallel `Promise.all` where independent
- [ ] Checksums verified before writing to user's project
- [ ] MCP servers prompt for consent before install
- [ ] Cache TTLs imported from `constants.ts`, not hardcoded
- [ ] Tests use partial mocks (`importOriginal`), not full mocks
