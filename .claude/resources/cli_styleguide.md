# CLI Style Guide

## Node.js CLI Development Standards

---

## CLI Entry Point Pattern (Commander.js)

```typescript
#!/usr/bin/env node
// /src/index.ts

import { program } from 'commander';
import { search } from './commands/search.js';
import { list } from './commands/list.js';
import { install } from './commands/install.js';
import { init } from './commands/init.js';
import { audit } from './commands/audit.js';
import { submit } from './commands/submit.js';
import { handleError } from './lib/errors.js';

program
  .name('skillsets')
  .description('CLI tool for discovering and installing verified skillsets')
  .version('0.2.3');

// === Discovery Commands ===

program
  .command('list')
  .description('List all available skillsets')
  .option('-l, --limit <number>', 'Limit results')
  .option('-s, --sort <field>', 'Sort by: name, stars, downloads (default: name)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      await list(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('search')
  .description('Search for skillsets by name, description, or tags')
  .argument('<query>', 'Search query')
  .option('-t, --tags <tags...>', 'Filter by tags')
  .option('-l, --limit <number>', 'Limit results (default: 10)', '10')
  .action(async (query, options) => {
    try {
      await search(query, options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('install')
  .description('Install a skillset to the current directory')
  .argument('<skillsetId>', 'Skillset ID (e.g., @user/skillset-name)')
  .option('-f, --force', 'Overwrite existing files')
  .option('-b, --backup', 'Backup existing files before install')
  .action(async (skillsetId, options) => {
    try {
      await install(skillsetId, options);
    } catch (error) {
      handleError(error);
    }
  });

// === Contribution Commands ===

program
  .command('init')
  .description('Initialize a new skillset submission')
  .option('-y, --yes', 'Accept defaults without prompting')
  .action(async (options) => {
    try {
      await init(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('audit')
  .description('Validate skillset and generate audit report')
  .action(async () => {
    try {
      await audit();
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('submit')
  .description('Submit skillset to registry via GitHub PR')
  .action(async () => {
    try {
      await submit();
    } catch (error) {
      handleError(error);
    }
  });

program.parse();
```

---

## Constants Pattern

Centralize all configuration values to avoid hardcoded URLs scattered through the codebase.

```typescript
// /src/lib/constants.ts

export const CDN_BASE_URL = 'https://skillsets.cc';
export const SEARCH_INDEX_URL = `${CDN_BASE_URL}/search-index.json`;
export const STATS_URL = `${CDN_BASE_URL}/api/stats/counts`;
export const DOWNLOADS_URL = `${CDN_BASE_URL}/api/downloads`;
export const REGISTRY_REPO = 'skillsets-cc/main';
export const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
export const DEFAULT_SEARCH_LIMIT = 10;
export const BACKUP_DIR_NAME = '.claude.backup';
```

---

## Search Command Pattern (Fuse.js + Live Stats)

```typescript
// /src/commands/search.ts

import Fuse from 'fuse.js';
import chalk from 'chalk';
import { fetchSearchIndex, fetchStats, mergeStats } from '../lib/api.js';
import { DEFAULT_SEARCH_LIMIT } from '../lib/constants.js';

interface SearchOptions {
  tags?: string[];
  limit?: string;
}

export async function search(query: string, options: SearchOptions): Promise<void> {
  console.log(chalk.blue(`Searching for: ${query}`));

  // Fetch index and live stats in parallel
  const [index, stats] = await Promise.all([fetchSearchIndex(), fetchStats()]);

  // Merge live stats into skillsets
  const skillsetsWithStats = mergeStats(index.skillsets, stats);

  // Filter by tags if provided
  let filtered = skillsetsWithStats;
  if (options.tags && options.tags.length > 0) {
    filtered = filtered.filter((skillset) =>
      options.tags!.some((tag) => skillset.tags.includes(tag))
    );
  }

  // Fuzzy search
  const fuse = new Fuse(filtered, {
    keys: ['name', 'description', 'tags', 'author.handle'],
    threshold: 0.3,
    includeScore: true,
  });

  const results = fuse.search(query);
  const limit = parseInt(options.limit || DEFAULT_SEARCH_LIMIT.toString(), 10);

  if (results.length === 0) {
    console.log(chalk.yellow('No results found.'));
    return;
  }

  console.log(chalk.green(`\nFound ${results.length} result(s):\n`));

  results.slice(0, limit).forEach(({ item }) => {
    console.log(chalk.bold(item.name));
    console.log(`  ${item.description}`);
    console.log(`  ${chalk.gray(`by ${item.author.handle}`)}`);
    console.log(`  ${chalk.yellow(`★ ${item.stars}`)} ${chalk.gray(`↓ ${item.downloads ?? 0}`)} ${chalk.gray(`• v${item.version}`)}`);
    console.log(`  ${chalk.cyan(`npx skillsets install ${item.id}`)}`);
    console.log();
  });

  if (results.length > limit) {
    console.log(chalk.gray(`... and ${results.length - limit} more`));
  }
}
```

---

## List Command Pattern

```typescript
// /src/commands/list.ts

import chalk from 'chalk';
import ora from 'ora';
import { fetchSearchIndex, fetchStats, mergeStats } from '../lib/api.js';

interface ListOptions {
  limit?: string;
  sort?: 'name' | 'stars' | 'downloads';
  json?: boolean;
}

export async function list(options: ListOptions): Promise<void> {
  const spinner = ora('Fetching skillsets...').start();

  // Fetch index and live stats in parallel
  const [index, stats] = await Promise.all([fetchSearchIndex(), fetchStats()]);
  spinner.stop();

  // Merge live stats into skillsets
  let skillsets = mergeStats(index.skillsets, stats);

  // Sort
  const sortBy = options.sort || 'name';
  if (sortBy === 'stars') {
    skillsets.sort((a, b) => b.stars - a.stars);
  } else if (sortBy === 'downloads') {
    skillsets.sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));
  } else if (sortBy === 'name') {
    skillsets.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Limit
  const limit = parseInt(options.limit || '0', 10);
  if (limit > 0) {
    skillsets = skillsets.slice(0, limit);
  }

  // JSON output
  if (options.json) {
    console.log(JSON.stringify(skillsets, null, 2));
    return;
  }

  // Display table
  console.log(chalk.bold(`\n📦 Available Skillsets (${skillsets.length})\n`));
  // ... table formatting
}
```

---

## Install Command Pattern (degit + Checksum Verification)

```typescript
// /src/commands/install.ts

import degit from 'degit';
import chalk from 'chalk';
import ora from 'ora';
import { detectConflicts, backupFiles } from '../lib/filesystem.js';
import { verifyChecksums } from '../lib/checksum.js';
import { REGISTRY_REPO, DOWNLOADS_URL } from '../lib/constants.js';

interface InstallOptions {
  force?: boolean;
  backup?: boolean;
}

export async function install(skillsetId: string, options: InstallOptions): Promise<void> {
  const spinner = ora(`Installing ${skillsetId}...`).start();

  // Check for conflicts
  const conflicts = await detectConflicts(process.cwd());
  if (conflicts.length > 0 && !options.force && !options.backup) {
    spinner.fail('Installation aborted');
    console.log(chalk.yellow('\nExisting files detected:'));
    conflicts.forEach((file) => console.log(`  - ${file}`));
    console.log(chalk.cyan('\nUse one of these flags:'));
    console.log('  --force   Overwrite existing files');
    console.log('  --backup  Backup existing files before install');
    return;
  }

  // Backup if requested
  if (options.backup && conflicts.length > 0) {
    spinner.text = 'Backing up existing files...';
    await backupFiles(conflicts, process.cwd());
  }

  // Install using degit (extract content/ subdirectory)
  spinner.text = 'Downloading skillset...';
  const emitter = degit(`${REGISTRY_REPO}/skillsets/${skillsetId}/content`, {
    cache: true,
    force: true,
    verbose: false,
  });

  await emitter.clone(process.cwd());

  // Verify checksums (inline, no separate verify command)
  spinner.text = 'Verifying checksums...';
  const result = await verifyChecksums(skillsetId, process.cwd());
  if (!result.valid) {
    spinner.fail('Checksum verification failed - files may be corrupted');
    process.exit(1);
  }

  spinner.succeed(`Successfully installed ${skillsetId}`);

  // Track download (non-blocking, silent fail)
  fetch(DOWNLOADS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skillset: skillsetId }),
  }).catch(() => {});

  // Print next steps
  console.log(chalk.green('\n✓ Installation complete!'));
  console.log(chalk.gray('\nNext steps:'));
  console.log('  1. Review CLAUDE.md for usage instructions');
  console.log('  2. Customize .claude/skills/ for your project');
  console.log('  3. Run: claude');
}
```

---

## API Utilities

```typescript
// /src/lib/api.ts

import type { SearchIndex, SearchIndexEntry, StatsResponse } from '../types/index.js';
import { SEARCH_INDEX_URL, STATS_URL, CACHE_TTL_MS } from './constants.js';

let cachedIndex: SearchIndex | null = null;
let cacheTime: number = 0;
let cachedStats: StatsResponse | null = null;
let statsCacheTime: number = 0;

/**
 * Fetches the search index from the CDN.
 * Implements 1-hour local cache to reduce network requests.
 */
export async function fetchSearchIndex(): Promise<SearchIndex> {
  const now = Date.now();

  if (cachedIndex && now - cacheTime < CACHE_TTL_MS) {
    return cachedIndex;
  }

  const response = await fetch(SEARCH_INDEX_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch search index: ${response.statusText}`);
  }

  const data = (await response.json()) as SearchIndex;
  cachedIndex = data;
  cacheTime = now;

  return data;
}

/**
 * Fetches metadata for a specific skillset by ID.
 */
export async function fetchSkillsetMetadata(skillsetId: string): Promise<SearchIndexEntry | undefined> {
  const index = await fetchSearchIndex();
  return index.skillsets.find((s) => s.id === skillsetId);
}

/**
 * Fetches live star and download counts from the API.
 * Implements 1-minute local cache. Fails silently with empty stats.
 */
export async function fetchStats(): Promise<StatsResponse> {
  const now = Date.now();
  const STATS_CACHE_TTL_MS = 60 * 1000; // 1 minute for stats

  if (cachedStats && now - statsCacheTime < STATS_CACHE_TTL_MS) {
    return cachedStats;
  }

  try {
    const response = await fetch(STATS_URL);
    if (!response.ok) {
      return { stars: {}, downloads: {} };
    }

    const data = (await response.json()) as StatsResponse;
    cachedStats = data;
    statsCacheTime = now;

    return data;
  } catch {
    return { stars: {}, downloads: {} };
  }
}

/**
 * Merges live stats into skillset entries.
 */
export function mergeStats(
  skillsets: SearchIndexEntry[],
  stats: StatsResponse
): SearchIndexEntry[] {
  return skillsets.map((s) => ({
    ...s,
    stars: stats.stars[s.id] ?? s.stars,
    downloads: stats.downloads[s.id] ?? 0,
  }));
}
```

---

## Checksum Utilities

```typescript
// /src/lib/checksum.ts

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fetchSkillsetMetadata } from './api.js';

/**
 * Computes SHA-256 checksum for a file.
 */
export async function computeFileChecksum(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Strips algorithm prefix from checksum (e.g., "sha256:abc123" -> "abc123").
 */
function stripChecksumPrefix(checksum: string): string {
  const colonIndex = checksum.indexOf(':');
  return colonIndex !== -1 ? checksum.slice(colonIndex + 1) : checksum;
}

/**
 * Verifies checksums of installed skillset against registry.
 * Only verifies files from content/ folder (those are the ones installed).
 * Strips 'content/' prefix since degit extracts content folder's contents directly.
 */
export async function verifyChecksums(
  skillsetId: string,
  dir: string
): Promise<{ valid: boolean; mismatches: Array<{ file: string; expected: string; actual: string }> }> {
  const metadata = await fetchSkillsetMetadata(skillsetId);
  if (!metadata) {
    throw new Error(`Skillset ${skillsetId} not found in registry`);
  }

  const mismatches: Array<{ file: string; expected: string; actual: string }> = [];

  for (const [file, expectedChecksum] of Object.entries(metadata.files)) {
    // Only verify files from content/ folder
    if (!file.startsWith('content/')) {
      continue;
    }
    // Strip 'content/' prefix since degit extracts directly
    const relativePath = file.slice(8);
    const filePath = path.join(dir, relativePath);

    try {
      const actualChecksum = await computeFileChecksum(filePath);
      const expectedHex = stripChecksumPrefix(expectedChecksum);
      if (actualChecksum !== expectedHex) {
        mismatches.push({ file, expected: expectedHex, actual: actualChecksum });
      }
    } catch (error) {
      mismatches.push({
        file,
        expected: stripChecksumPrefix(expectedChecksum),
        actual: 'MISSING',
      });
    }
  }

  return { valid: mismatches.length === 0, mismatches };
}
```

---

## Filesystem Utilities

```typescript
// /src/lib/filesystem.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import yaml from 'js-yaml';
import type { Skillset } from '../types/index.js';
import { BACKUP_DIR_NAME } from './constants.js';

const CONFLICT_CHECK_PATHS = ['.claude/', 'CLAUDE.md', 'skillset.yaml'];

/**
 * Detects conflicts with existing files that would be overwritten during installation.
 */
export async function detectConflicts(dir: string): Promise<string[]> {
  const conflicts: string[] = [];

  for (const checkPath of CONFLICT_CHECK_PATHS) {
    const fullPath = path.join(dir, checkPath);
    try {
      await fs.access(fullPath);
      conflicts.push(checkPath);
    } catch {
      // File doesn't exist, no conflict
    }
  }

  return conflicts;
}

/**
 * Backs up existing files to .claude.backup directory.
 */
export async function backupFiles(files: string[], dir: string): Promise<void> {
  const backupDir = path.join(dir, BACKUP_DIR_NAME);
  await fs.mkdir(backupDir, { recursive: true });

  for (const file of files) {
    const src = path.join(dir, file);
    const dest = path.join(backupDir, file);

    await fs.mkdir(path.dirname(dest), { recursive: true });

    const stats = await fs.stat(src);
    if (stats.isDirectory()) {
      await copyDirectory(src, dest);
    } else {
      await fs.copyFile(src, dest);
    }
  }
}

/**
 * Detects which skillset is installed in the given directory.
 */
export async function detectSkillset(dir: string): Promise<string | null> {
  try {
    const yamlPath = path.join(dir, 'skillset.yaml');
    const content = await fs.readFile(yamlPath, 'utf-8');
    const data = yaml.load(content) as Skillset;

    return `${data.author.handle}/${data.name}`;
  } catch {
    return null;
  }
}
```

---

## Error Handling Pattern

```typescript
// /src/lib/errors.ts

import chalk from 'chalk';

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
  author: {
    handle: string;
    url?: string;
  };
  stars: number;
  downloads?: number;
  version: string;
  status: 'active' | 'deprecated' | 'archived';
  verification: {
    production_links: Array<{ url: string; label?: string }>;
    production_proof?: string;
    audit_report: string;
  };
  compatibility: {
    claude_code_version: string;
    languages: string[];
  };
  entry_point: string;
  checksum: string;
  files: Record<string, string>; // file path -> SHA-256
}

export interface StatsResponse {
  stars: Record<string, number>;
  downloads: Record<string, number>;
}

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
```

```typescript
// /src/types/degit.d.ts

declare module 'degit' {
  interface DegitOptions {
    cache?: boolean;
    force?: boolean;
    verbose?: boolean;
  }

  interface Emitter {
    clone(dest: string): Promise<void>;
    on(event: string, callback: (info: unknown) => void): void;
  }

  function degit(src: string, opts?: DegitOptions): Emitter;
  export default degit;
}
```

---

## Testing Pattern (Vitest)

```typescript
// /src/commands/__tests__/search.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { search } from '../search.js';
import * as api from '../../lib/api.js';

vi.mock('../../lib/api.js');

describe('search command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('searches skillsets by name', async () => {
    const mockIndex = {
      version: '1.0',
      generated_at: '2024-01-01',
      skillsets: [
        {
          id: '@user/test-skillset',
          name: 'Test Skillset',
          description: 'A test skillset',
          tags: ['test'],
          author: { handle: '@user' },
          stars: 10,
          version: '1.0.0',
          status: 'active',
          verification: { production_links: [{ url: 'https://example.com' }], audit_report: './AUDIT_REPORT.md' },
          compatibility: { claude_code_version: '>=1.0.0', languages: ['any'] },
          entry_point: './content/CLAUDE.md',
          checksum: 'abc123',
          files: {},
        },
      ],
    };

    vi.mocked(api.fetchSearchIndex).mockResolvedValue(mockIndex);
    vi.mocked(api.fetchStats).mockResolvedValue({ stars: {}, downloads: {} });

    await search('test', { limit: '10' });

    expect(api.fetchSearchIndex).toHaveBeenCalledOnce();
    expect(api.fetchStats).toHaveBeenCalledOnce();
  });
});
```

---

## Vitest Configuration

```typescript
// vitest.config.ts

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

---

## Package Configuration

```json
// package.json
{
  "name": "skillsets",
  "version": "0.2.3",
  "description": "CLI tool for discovering and installing verified skillsets",
  "type": "module",
  "bin": {
    "skillsets": "./dist/index.js"
  },
  "files": [
    "dist"
  ],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/skillsets-cc/skillsets.cc.git",
    "directory": "cli"
  },
  "homepage": "https://skillsets.cc",
  "scripts": {
    "build": "tsc",
    "dev": "tsc && node dist/index.js",
    "test": "vitest",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@inquirer/prompts": "^7.0.0",
    "chalk": "^5.3.0",
    "commander": "^11.1.0",
    "degit": "^2.8.4",
    "fuse.js": "^7.0.0",
    "js-yaml": "^4.1.0",
    "ora": "^7.0.1"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [
    "cli",
    "skillsets",
    "claude-code",
    "agents"
  ],
  "author": "skillsets.cc",
  "license": "MIT"
}
```

---

## File Structure

```
cli/
├── src/
│   ├── commands/
│   │   ├── search.ts        # Fuzzy search with Fuse.js
│   │   ├── list.ts          # Browse all with sorting
│   │   ├── install.ts       # degit + checksum verification
│   │   ├── init.ts          # Scaffold skillset submission
│   │   ├── audit.ts         # Validate before submission
│   │   ├── submit.ts        # Open PR via gh CLI
│   │   └── __tests__/
│   ├── lib/
│   │   ├── api.ts           # Fetch index, stats, metadata
│   │   ├── checksum.ts      # SHA-256 verification
│   │   ├── constants.ts     # URLs, config values
│   │   ├── errors.ts        # Error handling
│   │   ├── filesystem.ts    # Conflict detection, backups
│   │   └── __tests__/
│   ├── types/
│   │   ├── index.ts         # SearchIndex, Skillset, etc.
│   │   └── degit.d.ts       # Type declarations
│   └── index.ts             # CLI entry point
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
| `list` | Browse all skillsets | Sorting, JSON output, live stats |
| `search <query>` | Fuzzy search | Tag filtering, Fuse.js |
| `install <id>` | Install skillset | degit, checksum verification, download tracking |
| `init` | Scaffold submission | Interactive prompts, template generation |
| `audit` | Validate skillset | Schema check, secret scan, size limits |
| `submit` | Open registry PR | Fork, branch, PR via gh CLI |

---

## Publishing Checklist

- [ ] Build succeeds (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] `bin` field points to correct entry point
- [ ] Shebang (`#!/usr/bin/env node`) at top of entry file
- [ ] Version bumped according to semver
- [ ] README.md includes installation and usage examples
- [ ] No hardcoded URLs (use constants.ts)
- [ ] Error messages are actionable

---

## Code Review Checklist

- [ ] TypeScript strict mode enabled
- [ ] All commands have help text
- [ ] Errors handled gracefully with clear messages
- [ ] Spinners used for long operations
- [ ] Colors used consistently (chalk)
- [ ] File operations use async/await
- [ ] Checksums verified after download
- [ ] Cache implemented for API calls
- [ ] No global state (except cache)
- [ ] Tests cover happy path and error cases
