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

    // Create parent directories
    await fs.mkdir(path.dirname(dest), { recursive: true });

    // Copy file or directory recursively
    const stats = await fs.stat(src);
    if (stats.isDirectory()) {
      await copyDirectory(src, dest);
    } else {
      await fs.copyFile(src, dest);
    }
  }
}

/**
 * Recursively copies a directory.
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Detects which skillset is installed in the given directory.
 * Returns the skillset ID or null if not found.
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
