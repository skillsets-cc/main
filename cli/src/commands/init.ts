import chalk from 'chalk';
import ora from 'ora';
import { input, confirm, checkbox } from '@inquirer/prompts';
import { existsSync, mkdirSync, copyFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import degit from 'degit';
import { execSync } from 'child_process';
import { CDN_BASE_URL } from '../lib/constants.js';

/** Marker files that indicate a directory is a self-contained support stack */
const SUPPORT_STACK_MARKERS = [
  // Dependency manifests
  'package.json', 'requirements.txt', 'pyproject.toml',
  'Cargo.toml', 'go.mod', 'Gemfile',
  // Config files
  'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
  'Makefile', '.env.example',
];

/** Directories to skip when scanning for support stacks */
const SCAN_SKIP = new Set([
  'node_modules', '.git', 'content', '.claude',
]);

/** Files/directories to exclude when copying support stacks */
const COPY_EXCLUSIONS = new Set([
  'node_modules', '.env',
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'Gemfile.lock', 'Cargo.lock', 'go.sum',
  '.git',
]);

interface InitOptions {
  yes?: boolean;
  name?: string;
  description?: string;
  handle?: string;
  authorUrl?: string;
  productionUrl?: string;
  tags?: string;
}

const SKILLSET_YAML_TEMPLATE = `schema_version: "1.0"
batch_id: "{{BATCH_ID}}"

# Identity
name: "{{NAME}}"
version: "1.0.0"
description: "{{DESCRIPTION}}"

author:
  handle: "{{AUTHOR_HANDLE}}"
  url: "{{AUTHOR_URL}}"

# Verification
verification:
  production_links:
    - url: "{{PRODUCTION_URL}}"
  audit_report: "./AUDIT_REPORT.md"

# Discovery
tags:
{{TAGS}}

compatibility:
  claude_code_version: ">=1.0.0"
  languages:
    - "any"

# Lifecycle
status: "active"

# Content
entry_point: "./content/CLAUDE.md"
`;

const README_TEMPLATE = `# {{NAME}}

{{DESCRIPTION}}

## Installation

\`\`\`bash
npx skillsets install {{AUTHOR_HANDLE}}/{{NAME}}
\`\`\`

## Usage

[Describe how to use your skillset]

## What's Included

[List the key files and their purposes]

## License

[Your license]
`;

const QUICKSTART_TEMPLATE = `# Quickstart

After installing via \`npx skillsets install {{AUTHOR_HANDLE}}/{{NAME}}\`, customize the workflow for your project.

---

## What Was Installed

\`\`\`
your-project/
├── .claude/          # Skills, agents, resources
├── CLAUDE.md         # Project config ← START HERE
└── README.md         # Documentation
\`\`\`

---

## Getting Started

1. **Edit CLAUDE.md** — Replace placeholder content with your project's specifics
2. **Customize .claude/** — Adapt skills, agents, and resources for your stack
3. **Run** — \`claude\` to start using the skillset

---

## Customization Checklist

- [ ] Update Identity & Constraints in CLAUDE.md
- [ ] Configure style guides in .claude/resources/
- [ ] Adapt agent definitions in .claude/agents/
- [ ] Set up any required infrastructure (Docker, API keys, etc.)

---

## Resources

[Add links to documentation, examples, or support channels]
`;

const INSTALL_NOTES_TEMPLATE = `# {{NAME}}

<!--
Install notes for pre-install display. Max 4000 characters total.
What does this skillset do? What should users know before installing?
The dependency section below is populated by /audit-skill during review.
-->

## Dependencies

<!-- Populated automatically by /audit-skill -->
`;

function copyDirRecursive(src: string, dest: string, exclusions?: Set<string>): void {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (exclusions?.has(entry.name)) continue;

    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, exclusions);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

/** Check if a directory tree contains any support stack marker file */
function hasMarkerDeep(dir: string): boolean {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (COPY_EXCLUSIONS.has(entry.name)) continue;
    if (entry.isFile() && SUPPORT_STACK_MARKERS.includes(entry.name)) return true;
    if (entry.isDirectory() && hasMarkerDeep(join(dir, entry.name))) return true;
  }
  return false;
}

/** Scan top-level directories for self-contained support stacks */
function detectSupportStacks(cwd: string): string[] {
  const stacks: string[] = [];

  for (const entry of readdirSync(cwd, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.') || SCAN_SKIP.has(entry.name)) continue;

    if (hasMarkerDeep(join(cwd, entry.name))) {
      stacks.push(entry.name + '/');
    }
  }

  return stacks;
}

export async function init(options: InitOptions): Promise<void> {
  console.log(chalk.blue('\n📦 Initialize a new skillset submission\n'));

  // 1. Verify gh CLI is available and authenticated
  try {
    execSync('gh auth status', { stdio: 'pipe' });
  } catch {
    throw new Error('gh CLI not authenticated.\n  Install: https://cli.github.com\n  Then run: gh auth login');
  }

  // 2. Get GitHub user info (verified identity)
  let login: string;
  let id: number;
  try {
    const userJson = execSync('gh api user', { encoding: 'utf-8' });
    const userData = JSON.parse(userJson);
    login = userData.login;
    id = userData.id;
  } catch {
    throw new Error('Failed to get GitHub user info. Please ensure gh CLI is properly authenticated.');
  }

  // 3. Look up reservation
  let batchId: string;
  try {
    const res = await fetch(
      `${CDN_BASE_URL}/api/reservations/lookup?githubId=${encodeURIComponent(String(id))}`
    );
    const lookupData = await res.json() as { batchId: string | null };

    if (!lookupData.batchId) {
      throw new Error(`No active reservation found. Visit ${CDN_BASE_URL} to claim a slot first.`);
    }

    batchId = lookupData.batchId;
    console.log(chalk.green(`\nReservation found: ${batchId}`));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('No active reservation')) throw error;
    throw new Error('Failed to look up reservation. Please check your network connection and try again.');
  }

  const cwd = process.cwd();

  // Check if already initialized
  const hasAllFlags = options.name && options.description && options.handle
    && options.productionUrl && options.tags;

  if (existsSync(join(cwd, 'skillset.yaml'))) {
    if (hasAllFlags) {
      console.log(chalk.yellow('⚠ skillset.yaml already exists — overwriting (flags provided).'));
    } else {
      console.log(chalk.yellow('⚠ skillset.yaml already exists in this directory.'));
      const overwrite = await confirm({
        message: 'Overwrite existing files?',
        default: false,
      });
      if (!overwrite) {
        console.log(chalk.gray('Aborted.'));
        return;
      }
    }
  }

  // Gather information — skip prompts when flags are provided
  let name: string;
  let description: string;
  let authorHandle: string;
  let authorUrl: string;
  let productionUrl: string;
  let tags: string[];

  if (hasAllFlags) {
    name = options.name!;
    description = options.description!;
    authorHandle = options.handle!.startsWith('@') ? options.handle! : `@${options.handle!}`;
    authorUrl = options.authorUrl || `https://github.com/${authorHandle.slice(1)}`;
    productionUrl = options.productionUrl!;
    tags = options.tags!.split(',').map((t) => t.trim());

    // Validate
    if (!/^[A-Za-z0-9_-]+$/.test(name) || name.length < 1 || name.length > 100) {
      throw new Error('Name must be 1-100 alphanumeric characters with hyphens/underscores');
    }
    if (description.length < 10 || description.length > 200) {
      throw new Error('Description must be 10-200 characters');
    }
    if (!/^@[A-Za-z0-9_-]+$/.test(authorHandle)) {
      throw new Error('Handle must start with @ followed by alphanumeric characters');
    }
    try { new URL(authorUrl); } catch { throw new Error(`Invalid author URL: ${authorUrl}`); }
    try { new URL(productionUrl); } catch { throw new Error(`Invalid production URL: ${productionUrl}`); }
    if (tags.length < 1 || tags.length > 10) throw new Error('Must have 1-10 tags');
    for (const tag of tags) {
      if (!/^[a-z0-9-]+$/.test(tag)) throw new Error(`Tag "${tag}" must be lowercase alphanumeric with hyphens`);
    }

    console.log(chalk.green(`\n✓ Using provided values:`));
    console.log(`  Name: ${name}`);
    console.log(`  Description: ${description}`);
    console.log(`  Handle: ${authorHandle}`);
    console.log(`  Production: ${productionUrl}`);
    console.log(`  Tags: ${tags.join(', ')}`);
  } else {
    name = await input({
      message: 'Skillset name (alphanumeric, hyphens, underscores):',
      validate: (value) => {
        if (!/^[A-Za-z0-9_-]+$/.test(value)) {
          return 'Name must be alphanumeric with hyphens/underscores only';
        }
        if (value.length < 1 || value.length > 100) {
          return 'Name must be 1-100 characters';
        }
        return true;
      },
    });

    description = await input({
      message: 'Description (10-200 characters):',
      validate: (value) => {
        if (value.length < 10 || value.length > 200) {
          return 'Description must be 10-200 characters';
        }
        return true;
      },
    });

    authorHandle = await input({
      message: 'GitHub handle (e.g., @username):',
      default: `@${login}`,
      validate: (value) => {
        if (!/^@[A-Za-z0-9_-]+$/.test(value)) {
          return 'Handle must start with @ followed by alphanumeric characters';
        }
        return true;
      },
    });

    authorUrl = await input({
      message: 'Author URL (GitHub profile or website):',
      default: `https://github.com/${authorHandle.slice(1)}`,
      validate: (value) => {
        try {
          new URL(value);
          return true;
        } catch {
          return 'Must be a valid URL';
        }
      },
    });

    productionUrl = await input({
      message: 'Production URL (live deployment, repo, or case study):',
      validate: (value) => {
        try {
          new URL(value);
          return true;
        } catch {
          return 'Must be a valid URL';
        }
      },
    });

    const tagsInput = await input({
      message: 'Tags (comma-separated, lowercase, e.g., sdlc,planning,multi-agent):',
      validate: (value) => {
        const t = value.split(',').map((s) => s.trim());
        if (t.length < 1 || t.length > 10) {
          return 'Must have 1-10 tags';
        }
        for (const tag of t) {
          if (!/^[a-z0-9-]+$/.test(tag)) {
            return `Tag "${tag}" must be lowercase alphanumeric with hyphens only`;
          }
        }
        return true;
      },
    });

    tags = tagsInput.split(',').map((t) => t.trim());
  }

  // Auto-detect existing files — core skillset files and primitives
  const coreFiles = [
    'CLAUDE.md', 'README.md', 'QUICKSTART.md', 'INSTALL_NOTES.md',
    '.claude/', '.mcp.json',
  ];
  const detectedCore = coreFiles.filter((f) => {
    const checkPath = f.endsWith('/') ? f.slice(0, -1) : f;
    return existsSync(join(cwd, checkPath));
  });

  // Scan top-level directories for self-contained support stacks
  const detectedStacks = detectSupportStacks(cwd);

  const allDetected = [...detectedCore, ...detectedStacks];

  let filesToCopy: string[] = [];
  if (allDetected.length > 0) {
    if (detectedCore.length > 0) {
      console.log(chalk.green('\n✓ Detected skillset files:'));
      detectedCore.forEach((f) => console.log(`  - ${f}`));
    }
    if (detectedStacks.length > 0) {
      console.log(chalk.green('\n✓ Detected support stacks:'));
      detectedStacks.forEach((f) => console.log(`  - ${f}`));
    }

    if (hasAllFlags) {
      filesToCopy = allDetected;
      console.log(chalk.green('\n✓ Auto-selecting all detected files'));
    } else {
      filesToCopy = await checkbox({
        message: 'Select files to copy to content/:',
        choices: allDetected.map((f) => ({ name: f, value: f, checked: true })),
      });
    }
  }

  // Create structure
  const spinner = ora('Creating skillset structure...').start();

  try {
    // Create content directory
    mkdirSync(join(cwd, 'content'), { recursive: true });

    // Copy selected files to content/
    for (const file of filesToCopy) {
      const src = join(cwd, file);
      const dest = join(cwd, 'content', file);

      if (file.endsWith('/')) {
        // Directory — apply exclusions (node_modules, .env, lock files)
        copyDirRecursive(src.slice(0, -1), dest.slice(0, -1), COPY_EXCLUSIONS);
      } else {
        // File
        copyFileSync(src, dest);
      }
    }

    // Generate skillset.yaml
    const tagsYaml = tags.map((t) => `  - "${t}"`).join('\n');
    const skillsetYaml = SKILLSET_YAML_TEMPLATE
      .replace('{{BATCH_ID}}', batchId)
      .replace('{{NAME}}', name)
      .replace('{{DESCRIPTION}}', description)
      .replace('{{AUTHOR_HANDLE}}', authorHandle)
      .replace('{{AUTHOR_URL}}', authorUrl)
      .replace('{{PRODUCTION_URL}}', productionUrl)
      .replace('{{TAGS}}', tagsYaml);

    writeFileSync(join(cwd, 'skillset.yaml'), skillsetYaml);

    // Generate content/README.md (if not copying existing)
    if (!existsSync(join(cwd, 'content', 'README.md'))) {
      const readme = README_TEMPLATE
        .replace(/\{\{NAME\}\}/g, name)
        .replace(/\{\{DESCRIPTION\}\}/g, description)
        .replace(/\{\{AUTHOR_HANDLE\}\}/g, authorHandle);

      writeFileSync(join(cwd, 'content', 'README.md'), readme);
    }

    // Generate content/QUICKSTART.md (if not copying existing)
    if (!existsSync(join(cwd, 'content', 'QUICKSTART.md'))) {
      const quickstart = QUICKSTART_TEMPLATE
        .replace(/\{\{NAME\}\}/g, name)
        .replace(/\{\{AUTHOR_HANDLE\}\}/g, authorHandle);

      writeFileSync(join(cwd, 'content', 'QUICKSTART.md'), quickstart);
    }

    // Generate content/INSTALL_NOTES.md (if not copying existing)
    if (!existsSync(join(cwd, 'content', 'INSTALL_NOTES.md'))) {
      const installNotes = INSTALL_NOTES_TEMPLATE
        .replace(/\{\{NAME\}\}/g, name);
      writeFileSync(join(cwd, 'content', 'INSTALL_NOTES.md'), installNotes);
    }

    // Install audit-skill from registry
    spinner.text = 'Fetching audit-skill...';
    const skillDir = join(cwd, '.claude', 'skills', 'audit-skill');
    const emitter = degit('skillsets-cc/main/tools/audit-skill', {
      cache: false,
      force: true,
      verbose: false,
    });
    await emitter.clone(skillDir);

    spinner.succeed('Skillset structure created');

    // Summary
    console.log(chalk.green('\n✓ Initialized skillset submission:\n'));
    console.log('  skillset.yaml     - Manifest (edit as needed)');
    console.log('  content/          - Installable files');
    console.log('    ├── README.md       - Documentation');
    console.log('    ├── QUICKSTART.md   - Post-install guide');
    console.log('    ├── INSTALL_NOTES.md - Pre-install notes');
    if (filesToCopy.length > 0) {
      filesToCopy.forEach((f) => console.log(`    └── ${f}`));
    } else {
      console.log('    └── (add your .claude/ and/or CLAUDE.md here)');
    }
    console.log('  .claude/skills/   - Audit skill installed');
    console.log('    └── audit-skill/');

    console.log(chalk.cyan('\nNext steps:'));
    console.log('  1. Edit content/INSTALL_NOTES.md with install notes');
    console.log('  2. Ensure content/ has your skillset files');
    console.log('  3. Run: npx skillsets audit');
    console.log('  4. Run: /audit-skill [AUDIT_REPORT.md] [path/to/reference-repo]');
  } catch (error) {
    spinner.fail('Failed to create structure');
    throw error;
  }
}
