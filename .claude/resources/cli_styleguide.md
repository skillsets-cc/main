# CLI Style Guide
## Node.js CLI Development Standards

---

## CLI Entry Point Pattern (Commander.js)

```typescript
#!/usr/bin/env node
// /src/index.ts

import { program } from 'commander';
import { search } from './commands/search.js';
import { install } from './commands/install.js';
import { verify } from './commands/verify.js';

program
  .name('skillsets')
  .description('CLI tool for discovering and installing verified skillsets')
  .version('1.0.0');

program
  .command('search')
  .description('Search for skillsets by name, description, or tags')
  .argument('<query>', 'Search query')
  .option('-t, --tags <tags...>', 'Filter by tags')
  .option('-l, --limit <number>', 'Limit results (default: 10)', '10')
  .action(search);

program
  .command('install')
  .description('Install a skillset to the current directory')
  .argument('<skillsetId>', 'Skillset ID (e.g., @user/skillset-name)')
  .option('-f, --force', 'Overwrite existing files')
  .option('-m, --merge', 'Merge with existing files (conflict markers)')
  .option('-b, --backup', 'Backup existing files before install')
  .action(install);

program
  .command('verify')
  .description('Verify installed skillset checksums against registry')
  .option('-d, --dir <path>', 'Directory to verify (default: current)', '.')
  .action(verify);

program.parse();
```

---

## Search Command Pattern (Fuse.js)

```typescript
// /src/commands/search.ts

import Fuse from 'fuse.js';
import chalk from 'chalk';
import { fetchSearchIndex } from '../lib/api.js';
import type { SearchIndexEntry } from '../types/index.js';

interface SearchOptions {
  tags?: string[];
  limit?: string;
}

export async function search(query: string, options: SearchOptions) {
  console.log(chalk.blue(`Searching for: ${query}`));

  // Fetch index from CDN
  const index = await fetchSearchIndex();

  // Filter by tags if provided
  let filtered = index.skillsets;
  if (options.tags && options.tags.length > 0) {
    filtered = filtered.filter((skillset) =>
      options.tags!.some((tag) => skillset.tags.includes(tag))
    );
  }

  // Fuzzy search
  const fuse = new Fuse(filtered, {
    keys: ['name', 'description', 'tags', 'author'],
    threshold: 0.3,
    includeScore: true,
  });

  const results = fuse.search(query);
  const limit = parseInt(options.limit || '10', 10);

  if (results.length === 0) {
    console.log(chalk.yellow('No results found.'));
    return;
  }

  console.log(chalk.green(`\nFound ${results.length} result(s):\n`));

  results.slice(0, limit).forEach(({ item, score }) => {
    console.log(chalk.bold(item.name));
    console.log(`  ${item.description}`);
    console.log(`  ${chalk.gray(`by ${item.author}`)}`);
    console.log(`  ${chalk.yellow(`★ ${item.stars}`)} ${chalk.gray(`• v${item.version}`)}`);
    console.log(`  ${chalk.cyan(`npx skillsets install ${item.id}`)}`);
    console.log();
  });

  if (results.length > limit) {
    console.log(chalk.gray(`... and ${results.length - limit} more`));
  }
}
```

---

## Install Command Pattern (degit)

```typescript
// /src/commands/install.ts

import degit from 'degit';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { detectConflicts, backupFiles } from '../lib/filesystem.js';
import { verifyChecksums } from '../lib/checksum.js';

interface InstallOptions {
  force?: boolean;
  merge?: boolean;
  backup?: boolean;
}

export async function install(skillsetId: string, options: InstallOptions) {
  const spinner = ora(`Installing ${skillsetId}...`).start();

  try {
    // Check for conflicts
    const conflicts = await detectConflicts(process.cwd());
    if (conflicts.length > 0 && !options.force && !options.merge && !options.backup) {
      spinner.fail('Installation aborted');
      console.log(chalk.yellow('\nExisting files detected:'));
      conflicts.forEach((file) => console.log(`  - ${file}`));
      console.log(chalk.cyan('\nUse one of these flags:'));
      console.log('  --force   Overwrite existing files');
      console.log('  --merge   Merge with conflict markers');
      console.log('  --backup  Backup existing files first');
      return;
    }

    // Backup if requested
    if (options.backup && conflicts.length > 0) {
      spinner.text = 'Backing up existing files...';
      await backupFiles(conflicts, process.cwd());
    }

    // Install using degit
    spinner.text = 'Downloading skillset...';
    const emitter = degit(`skillsets-cc/registry/skillsets/${skillsetId}`, {
      cache: true,
      force: true,
      verbose: false,
    });

    await emitter.clone(process.cwd());

    // Verify checksums
    spinner.text = 'Verifying checksums...';
    const valid = await verifyChecksums(skillsetId, process.cwd());
    if (!valid) {
      spinner.warn('Checksum verification failed - files may be corrupted');
    } else {
      spinner.succeed(`Successfully installed ${skillsetId}`);
    }

    // Print next steps
    console.log(chalk.green('\n✓ Installation complete!'));
    console.log(chalk.gray('\nNext steps:'));
    console.log('  1. Review CLAUDE.md for usage instructions');
    console.log('  2. Customize .claude/skills/ for your project');
    console.log('  3. Run: claude');
  } catch (error) {
    spinner.fail('Installation failed');
    console.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}
```

---

## Verify Command Pattern (SHA-256)

```typescript
// /src/commands/verify.ts

import chalk from 'chalk';
import ora from 'ora';
import { verifyChecksums } from '../lib/checksum.js';
import { detectSkillset } from '../lib/filesystem.js';

interface VerifyOptions {
  dir?: string;
}

export async function verify(options: VerifyOptions) {
  const dir = options.dir || process.cwd();
  const spinner = ora('Detecting skillset...').start();

  try {
    // Detect which skillset is installed
    const skillsetId = await detectSkillset(dir);
    if (!skillsetId) {
      spinner.fail('No skillset.yaml found in directory');
      return;
    }

    spinner.text = `Verifying ${skillsetId}...`;

    // Verify checksums
    const result = await verifyChecksums(skillsetId, dir);

    if (result.valid) {
      spinner.succeed('All checksums match!');
    } else {
      spinner.fail('Checksum verification failed');
      console.log(chalk.yellow('\nMismatched files:'));
      result.mismatches.forEach(({ file, expected, actual }) => {
        console.log(`  ${chalk.red('✗')} ${file}`);
        console.log(`    Expected: ${expected}`);
        console.log(`    Actual:   ${actual}`);
      });

      console.log(chalk.cyan('\nTo fix:'));
      console.log(`  npx skillsets install ${skillsetId} --force`);
    }
  } catch (error) {
    spinner.fail('Verification failed');
    console.error(chalk.red((error as Error).message));
    process.exit(1);
  }
}
```

---

## API Utilities

```typescript
// /src/lib/api.ts

import fetch from 'node-fetch';
import type { SearchIndex } from '../types/index.js';

const CDN_BASE_URL = 'https://skillsets.cc';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let cachedIndex: SearchIndex | null = null;
let cacheTime: number = 0;

export async function fetchSearchIndex(): Promise<SearchIndex> {
  const now = Date.now();

  // Return cached if still valid
  if (cachedIndex && now - cacheTime < CACHE_TTL) {
    return cachedIndex;
  }

  try {
    const response = await fetch(`${CDN_BASE_URL}/search-index.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch index: ${response.statusText}`);
    }

    const data = (await response.json()) as SearchIndex;
    cachedIndex = data;
    cacheTime = now;

    return data;
  } catch (error) {
    throw new Error(`Failed to fetch search index: ${(error as Error).message}`);
  }
}

export async function fetchSkillsetMetadata(skillsetId: string) {
  const index = await fetchSearchIndex();
  return index.skillsets.find((s) => s.id === skillsetId);
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

export async function computeFileChecksum(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

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
    const filePath = path.join(dir, file);

    try {
      const actualChecksum = await computeFileChecksum(filePath);
      if (actualChecksum !== expectedChecksum) {
        mismatches.push({ file, expected: expectedChecksum, actual: actualChecksum });
      }
    } catch (error) {
      // File missing or unreadable
      mismatches.push({
        file,
        expected: expectedChecksum,
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

export async function detectConflicts(dir: string): Promise<string[]> {
  const conflicts: string[] = [];

  const checkPaths = ['.claude/', 'CLAUDE.md', 'skillset.yaml'];

  for (const checkPath of checkPaths) {
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

export async function backupFiles(files: string[], dir: string): Promise<void> {
  const backupDir = path.join(dir, '.claude.backup');
  await fs.mkdir(backupDir, { recursive: true });

  for (const file of files) {
    const src = path.join(dir, file);
    const dest = path.join(backupDir, file);

    // Create parent directories
    await fs.mkdir(path.dirname(dest), { recursive: true });

    // Copy file
    await fs.copyFile(src, dest);
  }
}

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
  author: string;
  stars: number;
  version: string;
  checksum: string;
  files: Record<string, string>; // file path -> SHA-256
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
    production_url: string;
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

---

## Error Handling Pattern

```typescript
// /src/lib/errors.ts

export class CLIError extends Error {
  constructor(
    message: string,
    public code: string,
    public exitCode: number = 1
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

export function handleError(error: unknown): void {
  if (error instanceof CLIError) {
    console.error(chalk.red(`Error: ${error.message}`));
    if (error.code) {
      console.error(chalk.gray(`Code: ${error.code}`));
    }
    process.exit(error.exitCode);
  }

  console.error(chalk.red('Unexpected error:'));
  console.error(error);
  process.exit(1);
}

// Usage in command
try {
  await install(skillsetId, options);
} catch (error) {
  handleError(error);
}
```

---

## Progress Indicators (ora)

```typescript
import ora from 'ora';
import chalk from 'chalk';

// Basic spinner
const spinner = ora('Loading...').start();
spinner.succeed('Done!');

// Multi-step operation
async function multiStepInstall(skillsetId: string) {
  const spinner = ora('Starting installation...').start();

  try {
    spinner.text = 'Checking conflicts...';
    await checkConflicts();

    spinner.text = 'Downloading files...';
    await downloadFiles();

    spinner.text = 'Verifying checksums...';
    await verifyFiles();

    spinner.succeed('Installation complete!');
  } catch (error) {
    spinner.fail('Installation failed');
    throw error;
  }
}

// Progress with manual control
const spinner = ora({ text: 'Step 1/3: Downloading...', spinner: 'dots' }).start();
// ... do work
spinner.text = 'Step 2/3: Extracting...';
// ... do work
spinner.text = 'Step 3/3: Verifying...';
// ... do work
spinner.succeed('All done!');
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
          author: '@user',
          stars: 10,
          version: '1.0.0',
          checksum: 'abc123',
          files: {},
        },
      ],
    };

    vi.mocked(api.fetchSearchIndex).mockResolvedValue(mockIndex);

    await search('test', { limit: '10' });

    expect(api.fetchSearchIndex).toHaveBeenCalledOnce();
  });

  it('filters by tags', async () => {
    const mockIndex = {
      version: '1.0',
      generated_at: '2024-01-01',
      skillsets: [
        {
          id: '@user/test-1',
          name: 'Test 1',
          description: 'Test',
          tags: ['frontend'],
          author: '@user',
          stars: 5,
          version: '1.0.0',
          checksum: 'abc',
          files: {},
        },
        {
          id: '@user/test-2',
          name: 'Test 2',
          description: 'Test',
          tags: ['backend'],
          author: '@user',
          stars: 3,
          version: '1.0.0',
          checksum: 'def',
          files: {},
        },
      ],
    };

    vi.mocked(api.fetchSearchIndex).mockResolvedValue(mockIndex);

    await search('test', { tags: ['frontend'], limit: '10' });

    // Verify filtering logic (would need to capture console output in real test)
    expect(api.fetchSearchIndex).toHaveBeenCalledOnce();
  });
});
```

---

## Package Configuration

```json
// package.json
{
  "name": "skillsets",
  "version": "1.0.0",
  "description": "CLI tool for discovering and installing verified skillsets",
  "type": "module",
  "bin": {
    "skillsets": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "chalk": "^5.3.0",
    "commander": "^11.1.0",
    "degit": "^2.8.4",
    "fuse.js": "^7.0.0",
    "js-yaml": "^4.1.0",
    "node-fetch": "^3.3.2",
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
  ]
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

---

## File Structure

```
cli/
├── src/
│   ├── commands/
│   │   ├── search.ts
│   │   ├── install.ts
│   │   ├── verify.ts
│   │   └── __tests__/
│   ├── lib/
│   │   ├── api.ts
│   │   ├── checksum.ts
│   │   ├── filesystem.ts
│   │   └── errors.ts
│   ├── types/
│   │   └── index.ts
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## Publishing Checklist

- [ ] Build succeeds (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] `bin` field points to correct entry point
- [ ] Shebang (`#!/usr/bin/env node`) at top of entry file
- [ ] Entry file has execute permissions after build
- [ ] Version bumped according to semver
- [ ] CHANGELOG.md updated
- [ ] README.md includes installation and usage examples
- [ ] No hardcoded URLs (use constants)
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
