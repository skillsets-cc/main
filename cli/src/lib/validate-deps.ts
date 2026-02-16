import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import yaml from 'js-yaml';
import { getErrorMessage } from './errors.js';

export interface DepsValidationResult {
  valid: boolean;
  errors: string[];
}

/** Known dependency file patterns and their managers */
const DEPENDENCY_PATTERNS: Array<{
  filename: string;
  manager: string;
  extractPackages: (content: string) => string[];
  detectInstallScripts: (content: string) => boolean;
}> = [
  {
    filename: 'package.json',
    manager: 'npm',
    extractPackages: (content) => {
      try {
        const pkg = JSON.parse(content);
        return [
          ...Object.keys(pkg.dependencies || {}),
          ...Object.keys(pkg.devDependencies || {}),
        ];
      } catch { return []; }
    },
    detectInstallScripts: (content) => {
      try {
        const pkg = JSON.parse(content);
        const scripts = pkg.scripts || {};
        return ['preinstall', 'install', 'postinstall', 'prepare'].some(s => s in scripts);
      } catch { return false; }
    },
  },
  {
    filename: 'requirements.txt',
    manager: 'pip',
    extractPackages: (content) =>
      content.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#') && !l.startsWith('-'))
        .map(l => l.split(/[>=<!\s]/)[0]),
    detectInstallScripts: () => false,
  },
  {
    filename: 'pyproject.toml',
    manager: 'pip',
    extractPackages: (content) => {
      const deps: string[] = [];
      const depMatch = content.match(/\[project\][\s\S]*?dependencies\s*=\s*\[([\s\S]*?)\]/);
      if (depMatch) {
        for (const line of depMatch[1].split('\n')) {
          const cleaned = line.replace(/[",]/g, '').trim();
          if (cleaned) deps.push(cleaned.split(/[>=<!\s]/)[0]);
        }
      }
      return deps;
    },
    detectInstallScripts: (content) => content.includes('[tool.setuptools') || content.includes('[build-system]'),
  },
  {
    filename: 'Cargo.toml',
    manager: 'cargo',
    extractPackages: (content) => {
      const deps: string[] = [];
      const sections = content.match(/\[(?:dev-)?dependencies\]([\s\S]*?)(?=\[|$)/g) || [];
      for (const section of sections) {
        for (const line of section.split('\n')) {
          const match = line.match(/^(\w[\w-]*)\s*=/);
          if (match) deps.push(match[1]);
        }
      }
      return deps;
    },
    detectInstallScripts: (content) => content.includes('[build]') || content.includes('build.rs'),
  },
  {
    filename: 'go.mod',
    manager: 'go',
    extractPackages: (content) => {
      const deps: string[] = [];
      const reqBlock = content.match(/require\s*\(([\s\S]*?)\)/);
      if (reqBlock) {
        for (const line of reqBlock[1].split('\n')) {
          const match = line.trim().match(/^(\S+)\s/);
          if (match && !match[1].startsWith('//')) deps.push(match[1]);
        }
      }
      return deps;
    },
    detectInstallScripts: () => false,
  },
  {
    filename: 'Gemfile',
    manager: 'bundler',
    extractPackages: (content) =>
      content.split('\n')
        .filter(l => l.trim().startsWith('gem '))
        .map(l => {
          const match = l.match(/gem\s+['"]([^'"]+)['"]/);
          return match ? match[1] : '';
        })
        .filter(Boolean),
    detectInstallScripts: () => false,
  },
];

export interface ContentDependency {
  path: string;
  manager: string;
  packages: string[];
  has_install_scripts: boolean;
}

interface ManifestDependency {
  path: string;
  manager: string;
  packages: string[];
  has_install_scripts?: boolean;
  evaluation: string;
  researched_at: string;
}

/**
 * Validates runtime dependency declarations between content files and skillset.yaml.
 * Bidirectional: content->manifest and manifest->content.
 */
export function validateRuntimeDeps(skillsetDir: string): DepsValidationResult {
  const errors: string[] = [];

  const contentDeps = collectContentDeps(skillsetDir);
  const manifestDeps = collectManifestDeps(skillsetDir, errors);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  if (contentDeps.length === 0 && manifestDeps.length === 0) {
    return { valid: true, errors: [] };
  }

  // Content -> manifest check
  for (const cd of contentDeps) {
    const match = manifestDeps.find(md => md.path === cd.path);
    if (!match) {
      errors.push(`Dependency file '${cd.path}' (${cd.manager}) found in content but not declared in skillset.yaml runtime_dependencies`);
      continue;
    }
    if (match.manager !== cd.manager) {
      errors.push(`Dependency '${cd.path}': manager mismatch — content is '${cd.manager}', manifest declares '${match.manager}'`);
    }
    // Check that all content packages appear in manifest
    for (const pkg of cd.packages) {
      if (!match.packages.includes(pkg)) {
        errors.push(`Dependency '${cd.path}': package '${pkg}' found in content but not listed in manifest`);
      }
    }
    // Check install scripts consistency
    if (cd.has_install_scripts && match.has_install_scripts === false) {
      errors.push(`Dependency '${cd.path}': content has lifecycle scripts but manifest declares has_install_scripts: false`);
    }
  }

  // Manifest -> content check
  for (const md of manifestDeps) {
    const match = contentDeps.find(cd => cd.path === md.path);
    if (!match) {
      errors.push(`Dependency '${md.path}' declared in skillset.yaml but not found in content`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Scan content/ for known dependency files (audit context).
 */
export function collectContentDeps(skillsetDir: string): ContentDependency[] {
  const deps: ContentDependency[] = [];
  const contentDir = join(skillsetDir, 'content');

  if (!existsSync(contentDir)) return deps;

  scanForDeps(contentDir, contentDir, deps);
  return deps;
}

function scanForDeps(dir: string, baseDir: string, deps: ContentDependency[]): void {
  if (!existsSync(dir)) return;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      scanForDeps(fullPath, baseDir, deps);
      continue;
    }

    const pattern = DEPENDENCY_PATTERNS.find(p => entry.name === p.filename);
    if (!pattern) continue;

    try {
      const content = readFileSync(fullPath, 'utf-8');
      const packages = pattern.extractPackages(content);
      if (packages.length === 0) continue;

      deps.push({
        path: relative(baseDir, fullPath),
        manager: pattern.manager,
        packages,
        has_install_scripts: pattern.detectInstallScripts(content),
      });
    } catch {
      // Skip unreadable files
    }
  }
}

function collectManifestDeps(skillsetDir: string, errors: string[]): ManifestDependency[] {
  const manifestPath = join(skillsetDir, 'skillset.yaml');

  if (!existsSync(manifestPath)) return [];

  try {
    const content = readFileSync(manifestPath, 'utf-8');
    const data = yaml.load(content) as Record<string, unknown>;

    if (!data.runtime_dependencies || !Array.isArray(data.runtime_dependencies)) {
      return [];
    }

    return data.runtime_dependencies as ManifestDependency[];
  } catch (error: unknown) {
    errors.push(`Failed to parse skillset.yaml: ${getErrorMessage(error)}`);
    return [];
  }
}
