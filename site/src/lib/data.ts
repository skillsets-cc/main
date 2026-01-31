/**
 * Data loading utilities for skillsets.
 * Loads from search-index.json (generated at build time from skillsets folder).
 */

import type { SearchIndex, SearchIndexEntry } from '@/types';

// Import the search index at build time
import searchIndexData from '../../public/search-index.json';

const searchIndex = searchIndexData as SearchIndex;

/**
 * Get all skillsets, sorted by stars (descending).
 */
export function getSkillsets(): SearchIndexEntry[] {
  const skillsets = searchIndex.skillsets || [];
  return skillsets.sort((a, b) => b.stars - a.stars);
}

/**
 * Get a single skillset by ID.
 * Returns undefined if not found.
 */
export function getSkillsetById(id: string): SearchIndexEntry | undefined {
  return searchIndex.skillsets?.find((s) => s.id === id);
}

/**
 * Get unique tags from all skillsets.
 */
export function getAllTags(): string[] {
  const skillsets = getSkillsets();
  const tagSet = new Set<string>();
  for (const s of skillsets) {
    for (const tag of s.tags) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet).sort();
}

/**
 * Get the search index metadata.
 */
export function getSearchIndexMeta(): { version: string; generatedAt: string } {
  return {
    version: searchIndex.version,
    generatedAt: searchIndex.generated_at,
  };
}
