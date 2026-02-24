#!/usr/bin/env npx tsx
/**
 * Build Plugins
 *
 * Scans the skillsets/ directory and generates:
 *   plugins/@ns/name/.claude-plugin/plugin.json   (per-skillset)
 *   plugins/@ns/name/skills/install/SKILL.md      (per-skillset, from template)
 *   .claude-plugin/marketplace.json               (aggregate listing)
 *
 * Static plugins (plugins/contribute/) are never overwritten.
 *
 * Usage: npm run build:plugins
 */

import {
  readFileSync, writeFileSync, mkdirSync,
  existsSync, readdirSync, rmSync,
} from 'fs';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

// ── Paths ──────────────────────────────────────────────────────────

const DEFAULT_ROOT_DIR = join(process.cwd(), '..');
const STATIC_PLUGIN_DIRS = new Set(['contribute']);

// ── Interfaces ─────────────────────────────────────────────────────

interface SkillsetYaml {
  name: string;
  version: string;
  description: string;
  author: {
    handle: string;
    url?: string;
  };
  tags: string[];
}

interface PluginJson {
  name: string;
  description: string;
  version: string;
  author: { name: string; url?: string };
  repository: string;
  license: string;
  keywords: string[];
}

interface MarketplacePlugin {
  name: string;
  source: string;
  description: string;
  version: string;
  author: { name: string; url?: string };
  license: string;
  keywords: string[];
  category: string;
}

interface MarketplaceJson {
  name: string;
  metadata: { description: string; version: string };
  owner: { name: string; email: string };
  plugins: MarketplacePlugin[];
}

export interface BuildConfig {
  rootDir: string;
  skillsetsDir: string;
  pluginsDir: string;
  marketplaceFile: string;
}

// ── Config ─────────────────────────────────────────────────────────

export function getDefaultConfig(): BuildConfig {
  const rootDir = DEFAULT_ROOT_DIR;
  return {
    rootDir,
    skillsetsDir: join(rootDir, 'skillsets'),
    pluginsDir: join(rootDir, 'plugins'),
    marketplaceFile: join(rootDir, '.claude-plugin', 'marketplace.json'),
  };
}

// ── Templates ──────────────────────────────────────────────────────

export function generatePluginJson(manifest: SkillsetYaml, id: string): PluginJson {
  return {
    name: manifest.name,
    description: manifest.description,
    version: manifest.version,
    author: {
      name: manifest.author.handle.replace(/^@/, ''),
      ...(manifest.author.url && { url: manifest.author.url }),
    },
    repository: 'https://github.com/skillsets-cc/main',
    license: 'MIT',
    keywords: manifest.tags,
  };
}

export function generateInstallSkillMd(manifest: SkillsetYaml, id: string): string {
  const name = manifest.name;
  const description = manifest.description;
  return `---
name: install
description: "Install ${name} — ${description}"
allowed-tools: Bash(npx skillsets@latest install *), Read, Glob
---

# Install ${name}

Install ${name} from the skillsets.cc registry into the current project directory.

---

## Phase Tracking

Create ALL tasks upfront using \`TaskCreate\`. Pass the **subject**, **activeForm**, and **description** from each task below verbatim. Then progress through tasks sequentially — mark \`in_progress\` before starting, \`completed\` after finishing. Do not begin a task until the prior task is completed.

### Task 1: Install skillset

- **subject**: Install ${name} from registry
- **activeForm**: Installing ${name}
- **description**: Run \`npx skillsets@latest install ${id}\`. The CLI will interactively prompt for MCP server and runtime dependency consent if the skillset declares any. Ask the user whether to \`--force\` (overwrite) or \`--backup\` (preserve existing files) if they have conflicting files.

### Task 2: Read QUICKSTART.md

- **subject**: Read QUICKSTART.md
- **activeForm**: Reading quickstart guide
- **description**: Read the installed \`QUICKSTART.md\` — every skillset ships one. Identify each section that needs interactive walkthrough with the user. Sections vary by skillset but typically cover project configuration, style guides, agent tuning, templates, and infrastructure setup.

### Task 3: Walk through customization

- **subject**: Walk through customization with user
- **activeForm**: Walking through customization
- **description**: Walk the user through each QUICKSTART.md section interactively. For each section: explain what needs customizing and why, help the user make decisions for their project, apply the changes, and confirm before moving on. The goal is a customized, working skillset by the end of the conversation — not just extracted files.

---

## Command Reference

### install

\`\`\`
npx skillsets@latest install ${id} [options]
\`\`\`

| Flag | Description |
|------|-------------|
| \`-f, --force\` | Overwrite existing files without prompting |
| \`-b, --backup\` | Backup existing files before installation |
| \`--accept-mcp\` | Accept MCP servers without interactive prompt |
| \`--accept-deps\` | Accept runtime dependencies without interactive prompt |

The CLI handles:
1. Extraction via degit (no .git folder, no full clone)
2. SHA-256 checksum verification against the search index
3. MCP server and runtime dependency consent prompts
4. Download count tracking

---

## Error Handling

- If checksum verification fails, warn the user and do not proceed
- If the target directory already has conflicting files, suggest \`--force\` or \`--backup\`
`;
}

// ── Discovery ──────────────────────────────────────────────────────

export function discoverSkillsets(config: BuildConfig): string[] {
  const skillsets: string[] = [];

  if (!existsSync(config.skillsetsDir)) {
    console.error(`[Plugins] Skillsets directory not found: ${config.skillsetsDir}`);
    return skillsets;
  }

  const namespaces = readdirSync(config.skillsetsDir, { withFileTypes: true });

  for (const ns of namespaces) {
    if (!ns.isDirectory()) continue;

    const nsPath = join(config.skillsetsDir, ns.name);
    const entries = readdirSync(nsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const yamlPath = join(nsPath, entry.name, 'skillset.yaml');
      if (existsSync(yamlPath)) {
        skillsets.push(`${ns.name}/${entry.name}`);
      }
    }
  }

  return skillsets;
}

// ── Cleanup ────────────────────────────────────────────────────────

export function cleanGeneratedPlugins(config: BuildConfig, activeIds: Set<string>): void {
  if (!existsSync(config.pluginsDir)) return;

  const topLevel = readdirSync(config.pluginsDir, { withFileTypes: true });

  for (const entry of topLevel) {
    if (!entry.isDirectory()) continue;
    if (STATIC_PLUGIN_DIRS.has(entry.name)) continue;

    // This is a namespace dir (e.g., @supercollectible)
    const nsPath = join(config.pluginsDir, entry.name);
    const plugins = readdirSync(nsPath, { withFileTypes: true });

    for (const plugin of plugins) {
      if (!plugin.isDirectory()) continue;
      const pluginId = `${entry.name}/${plugin.name}`;
      if (!activeIds.has(pluginId)) {
        console.log(`  Removing stale plugin: ${pluginId}`);
        rmSync(join(nsPath, plugin.name), { recursive: true, force: true });
      }
    }

    // Remove empty namespace dirs
    const remaining = readdirSync(nsPath);
    if (remaining.length === 0) {
      rmSync(nsPath, { recursive: true, force: true });
    }
  }
}

// ── Generation ─────────────────────────────────────────────────────

export function generateSkillsetPlugin(
  config: BuildConfig,
  id: string,
  manifest: SkillsetYaml
): MarketplacePlugin {
  // id is "ns/Name" (e.g., "@supercollectible/Valence")
  // Plugin dir preserves original casing: "plugins/@supercollectible/Valence"
  const [ns, name] = id.split('/');
  const pluginDir = join(config.pluginsDir, ns, name);

  // Write plugin.json
  const pluginJsonDir = join(pluginDir, '.claude-plugin');
  mkdirSync(pluginJsonDir, { recursive: true });
  const pluginJson = generatePluginJson(manifest, id);
  writeFileSync(
    join(pluginJsonDir, 'plugin.json'),
    JSON.stringify(pluginJson, null, 2) + '\n',
  );

  // Write install SKILL.md
  const skillDir = join(pluginDir, 'skills', 'install');
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, 'SKILL.md'), generateInstallSkillMd(manifest, id));

  // Return marketplace entry
  return {
    name: manifest.name,
    source: `./plugins/${ns}/${name}`,
    description: manifest.description,
    version: manifest.version,
    author: {
      name: manifest.author.handle.replace(/^@/, ''),
      ...(manifest.author.url && { url: manifest.author.url }),
    },
    license: 'MIT',
    keywords: manifest.tags,
    category: 'development',
  };
}

export function readContributePlugin(config: BuildConfig): MarketplacePlugin {
  const contributePluginJson = join(config.pluginsDir, 'contribute', '.claude-plugin', 'plugin.json');
  if (!existsSync(contributePluginJson)) {
    throw new Error(`Static contribute plugin not found at ${contributePluginJson}`);
  }
  const raw = JSON.parse(readFileSync(contributePluginJson, 'utf-8'));
  return {
    name: raw.name,
    source: './plugins/contribute',
    description: raw.description,
    version: raw.version,
    author: raw.author,
    license: raw.license || 'MIT',
    keywords: raw.keywords || ['skillsets', 'contribute', 'submission'],
    category: 'development',
  };
}

export function generateMarketplace(config: BuildConfig, plugins: MarketplacePlugin[]): void {
  const marketplace: MarketplaceJson = {
    name: 'skillsets-cc',
    metadata: {
      description: 'Curated registry of production-verified Claude Code workflows.',
      version: '2.0.0',
    },
    owner: {
      name: 'supercollectible',
      email: 'hello@supercollectible.dev',
    },
    plugins,
  };

  mkdirSync(join(config.rootDir, '.claude-plugin'), { recursive: true });
  writeFileSync(config.marketplaceFile, JSON.stringify(marketplace, null, 2) + '\n');
}

// ── Main ───────────────────────────────────────────────────────────

export function buildPlugins(config: BuildConfig = getDefaultConfig()): void {
  console.log('[Plugins] Building plugin directories...');
  console.log(`  Skillsets directory: ${config.skillsetsDir}`);
  console.log(`  Plugins directory: ${config.pluginsDir}`);

  const skillsetIds = discoverSkillsets(config);
  console.log(`  Found ${skillsetIds.length} skillset(s)`);

  // Track active plugin IDs for cleanup
  const activePluginIds = new Set<string>();
  const marketplacePlugins: MarketplacePlugin[] = [];

  // 1. Read static contribute plugin
  try {
    const contributeEntry = readContributePlugin(config);
    marketplacePlugins.push(contributeEntry);
    console.log('  ✓ contribute (static)');
  } catch (error) {
    console.error(`  ✗ contribute: ${error}`);
    process.exit(1);
  }

  // 2. Generate per-skillset plugins
  for (const id of skillsetIds) {
    const yamlPath = join(config.skillsetsDir, id, 'skillset.yaml');

    try {
      const yamlContent = readFileSync(yamlPath, 'utf-8');
      const manifest = parseYaml(yamlContent) as SkillsetYaml;
      const entry = generateSkillsetPlugin(config, id, manifest);
      marketplacePlugins.push(entry);

      const [ns, name] = id.split('/');
      activePluginIds.add(`${ns}/${name}`);
      console.log(`  ✓ ${id} (v${manifest.version})`);
    } catch (error) {
      console.error(`  ✗ ${id}: ${error}`);
    }
  }

  // 3. Clean stale generated plugins
  cleanGeneratedPlugins(config, activePluginIds);

  // 4. Generate marketplace.json
  generateMarketplace(config, marketplacePlugins);
  console.log(`\n[Plugins] Marketplace written to ${config.marketplaceFile}`);
  console.log(`  ${marketplacePlugins.length} plugin(s) listed`);
}

// Auto-run when executed as script
const isDirectRun = process.argv[1]?.endsWith('build-plugins.ts');
if (isDirectRun) {
  buildPlugins();
}
