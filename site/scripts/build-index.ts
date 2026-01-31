#!/usr/bin/env npx tsx
/**
 * Build Search Index
 *
 * Scans the skillsets/ directory and generates search-index.json for CDN delivery.
 * Used by both the CLI (fuzzy search) and site (browse page).
 *
 * Usage: npm run build:index
 *
 * Environment variables (optional, for star counts):
 *   CLOUDFLARE_ACCOUNT_ID - Cloudflare account ID
 *   CLOUDFLARE_API_TOKEN  - Cloudflare API token with KV read access
 *   KV_NAMESPACE_ID       - KV namespace ID for stars
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { createHash } from 'crypto';
import { parse as parseYaml } from 'yaml';

const SKILLSETS_DIR = join(process.cwd(), '..', 'skillsets');
const OUTPUT_FILE = join(process.cwd(), 'public', 'search-index.json');

interface SkillsetYaml {
  schema_version: string;
  name: string;
  version: string;
  description: string;
  author: {
    handle: string;
    url?: string;
  };
  verification: {
    production_url: string;
    production_proof?: string;
    audit_report: string;
  };
  tags: string[];
  compatibility?: {
    claude_code_version?: string;
    languages?: string[];
  };
  status?: 'active' | 'deprecated' | 'archived';
  entry_point?: string;
}

interface SearchIndexEntry {
  id: string;
  name: string;
  description: string;
  tags: string[];
  author: {
    handle: string;
    url?: string;
  };
  stars: number;
  version: string;
  status: 'active' | 'deprecated' | 'archived';
  verification: {
    production_url: string;
    production_proof?: string;
    audit_report: string;
  };
  compatibility: {
    claude_code_version: string;
    languages: string[];
  };
  entry_point: string;
  checksum: string;
  files: Record<string, string>;
}

interface SearchIndex {
  version: string;
  generated_at: string;
  skillsets: SearchIndexEntry[];
}

function computeSha256(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex');
}

function getAllFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];

  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else {
      files.push(relative(baseDir, fullPath));
    }
  }

  return files;
}

function computeSkillsetChecksum(skillsetDir: string): { checksum: string; files: Record<string, string> } {
  const files = getAllFiles(skillsetDir);
  const fileChecksums: Record<string, string> = {};
  const allChecksums: string[] = [];

  for (const file of files.sort()) {
    const content = readFileSync(join(skillsetDir, file));
    const hash = computeSha256(content);
    fileChecksums[file] = `sha256:${hash}`;
    allChecksums.push(hash);
  }

  // Overall checksum is hash of all file hashes concatenated
  const overallChecksum = computeSha256(allChecksums.join(''));

  return {
    checksum: `sha256:${overallChecksum}`,
    files: fileChecksums,
  };
}

async function fetchStarCounts(): Promise<Record<string, number>> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const namespaceId = process.env.KV_NAMESPACE_ID;

  if (!accountId || !apiToken || !namespaceId) {
    console.log('  Cloudflare credentials not set, using 0 for all star counts');
    return {};
  }

  try {
    // List all keys with prefix "stars:"
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/keys?prefix=stars:`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.log(`  Failed to fetch KV keys: ${response.status}`);
      return {};
    }

    const data = await response.json() as { result: Array<{ name: string }> };
    const starCounts: Record<string, number> = {};

    // Fetch each star count
    for (const key of data.result || []) {
      const skillsetId = key.name.replace('stars:', '');
      const valueResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key.name)}`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
          },
        }
      );

      if (valueResponse.ok) {
        const value = await valueResponse.text();
        starCounts[skillsetId] = parseInt(value, 10) || 0;
      }
    }

    console.log(`  Fetched star counts for ${Object.keys(starCounts).length} skillsets`);
    return starCounts;
  } catch (error) {
    console.log(`  Error fetching star counts: ${error}`);
    return {};
  }
}

function discoverSkillsets(): string[] {
  const skillsets: string[] = [];

  if (!existsSync(SKILLSETS_DIR)) {
    console.error(`Skillsets directory not found: ${SKILLSETS_DIR}`);
    return skillsets;
  }

  // Scan for @namespace/skillset-name structure
  const namespaces = readdirSync(SKILLSETS_DIR, { withFileTypes: true });

  for (const ns of namespaces) {
    if (!ns.isDirectory()) continue;

    const nsPath = join(SKILLSETS_DIR, ns.name);
    const entries = readdirSync(nsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillsetPath = join(nsPath, entry.name);
      const yamlPath = join(skillsetPath, 'skillset.yaml');

      if (existsSync(yamlPath)) {
        skillsets.push(`${ns.name}/${entry.name}`);
      }
    }
  }

  return skillsets;
}

async function buildIndex(): Promise<void> {
  console.log('Building search index...');
  console.log(`  Skillsets directory: ${SKILLSETS_DIR}`);
  console.log(`  Output file: ${OUTPUT_FILE}`);

  const skillsetIds = discoverSkillsets();
  console.log(`  Found ${skillsetIds.length} skillset(s)`);

  if (skillsetIds.length === 0) {
    console.log('  No skillsets found, creating empty index');
  }

  const starCounts = await fetchStarCounts();
  const entries: SearchIndexEntry[] = [];

  for (const id of skillsetIds) {
    const skillsetDir = join(SKILLSETS_DIR, id);
    const yamlPath = join(skillsetDir, 'skillset.yaml');

    try {
      const yamlContent = readFileSync(yamlPath, 'utf-8');
      const manifest = parseYaml(yamlContent) as SkillsetYaml;

      const { checksum, files } = computeSkillsetChecksum(skillsetDir);

      entries.push({
        id,
        name: manifest.name,
        description: manifest.description,
        tags: manifest.tags,
        author: {
          handle: manifest.author.handle,
          url: manifest.author.url,
        },
        stars: starCounts[id] || 0,
        version: manifest.version,
        status: manifest.status || 'active',
        verification: {
          production_url: manifest.verification.production_url,
          production_proof: manifest.verification.production_proof,
          audit_report: manifest.verification.audit_report,
        },
        compatibility: {
          claude_code_version: manifest.compatibility?.claude_code_version || '>=1.0.0',
          languages: manifest.compatibility?.languages || ['any'],
        },
        entry_point: manifest.entry_point || './content/CLAUDE.md',
        checksum,
        files,
      });

      console.log(`  ✓ ${id} (v${manifest.version})`);
    } catch (error) {
      console.error(`  ✗ ${id}: ${error}`);
    }
  }

  const index: SearchIndex = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    skillsets: entries,
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2));
  console.log(`\nIndex written to ${OUTPUT_FILE}`);
  console.log(`  ${entries.length} skillset(s) indexed`);
}

buildIndex().catch((error) => {
  console.error('Failed to build index:', error);
  process.exit(1);
});
