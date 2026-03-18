export const CDN_BASE_URL = 'https://skillsets.cc';
export const SEARCH_INDEX_URL = `${CDN_BASE_URL}/search-index.json`;
export const DOWNLOADS_START_URL = `${CDN_BASE_URL}/api/downloads/start`;
export const DOWNLOADS_COMPLETE_URL = `${CDN_BASE_URL}/api/downloads/complete`;
export const REGISTRY_REPO = 'skillsets-cc/main';
export const GITHUB_BROWSE_BASE = `https://github.com/${REGISTRY_REPO}/tree/main/skillsets`;
export const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
export const BACKUP_DIR_NAME = '.claude.backup';
