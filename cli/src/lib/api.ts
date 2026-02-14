import type { SearchIndex, SearchIndexEntry, StatsResponse } from '../types/index.js';
import { SEARCH_INDEX_URL, STATS_URL, CACHE_TTL_MS, STATS_CACHE_TTL_MS } from './constants.js';

let cachedIndex: SearchIndex | null = null;
let cacheTime: number = 0;
let cachedStats: StatsResponse | null = null;
let statsCacheTime: number = 0;

const EMPTY_STATS: StatsResponse = { stars: {}, downloads: {} };

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
 * Implements 1-minute local cache.
 */
export async function fetchStats(): Promise<StatsResponse> {
  const now = Date.now();

  if (cachedStats && now - statsCacheTime < STATS_CACHE_TTL_MS) {
    return cachedStats;
  }

  try {
    const response = await fetch(STATS_URL);
    if (!response.ok) {
      return EMPTY_STATS;
    }

    const data = (await response.json()) as StatsResponse;
    cachedStats = data;
    statsCacheTime = now;

    return data;
  } catch {
    return EMPTY_STATS;
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
