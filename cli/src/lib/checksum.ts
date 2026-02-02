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
 * Verifies checksums of installed skillset against registry.
 * Returns validation result with list of mismatches.
 */
/**
 * Strips algorithm prefix from checksum (e.g., "sha256:abc123" -> "abc123").
 */
function stripChecksumPrefix(checksum: string): string {
  const colonIndex = checksum.indexOf(':');
  return colonIndex !== -1 ? checksum.slice(colonIndex + 1) : checksum;
}

/**
 * Verifies checksums of installed skillset against registry.
 * Returns validation result with list of mismatches.
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
    // Only verify files from content/ folder (those are the ones installed)
    if (!file.startsWith('content/')) {
      continue;
    }
    // Strip 'content/' prefix since degit extracts content folder's contents directly
    const relativePath = file.slice(8);
    const filePath = path.join(dir, relativePath);

    try {
      const actualChecksum = await computeFileChecksum(filePath);
      // Strip sha256: prefix from expected checksum for comparison
      const expectedHex = stripChecksumPrefix(expectedChecksum);
      if (actualChecksum !== expectedHex) {
        mismatches.push({ file, expected: expectedHex, actual: actualChecksum });
      }
    } catch (error) {
      // File missing or unreadable
      mismatches.push({
        file,
        expected: stripChecksumPrefix(expectedChecksum),
        actual: 'MISSING',
      });
    }
  }

  return { valid: mismatches.length === 0, mismatches };
}
