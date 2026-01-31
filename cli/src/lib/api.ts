import type { SearchIndex, SearchIndexEntry } from '../types/index.js';
import { SEARCH_INDEX_URL, CACHE_TTL_MS } from './constants.js';

let cachedIndex: SearchIndex | null = null;
let cacheTime: number = 0;

/**
 * Fetches the search index from the CDN.
 * Implements 1-hour local cache to reduce network requests.
 */
export async function fetchSearchIndex(): Promise<SearchIndex> {
  const now = Date.now();

  // Return cached if still valid
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
