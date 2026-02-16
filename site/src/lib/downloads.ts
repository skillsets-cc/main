/**
 * Download tracking with KV storage.
 *
 * Storage schema:
 * - downloads:{skillsetId}           → download count (number as string)
 * - ratelimit:dl:{ip}:{hour}         → request count (hour-bucketed, 7200s TTL)
 */
import { isHourlyRateLimited } from './rate-limit';

const DL_RATE_LIMIT_MAX = 30; // Max downloads per hour per IP

/**
 * Check if an IP has exceeded the download rate limit.
 * Uses hour-bucketed pattern to prevent TTL-reset bug.
 */
export async function isDownloadRateLimited(
  kv: KVNamespace,
  ip: string
): Promise<boolean> {
  return isHourlyRateLimited(kv, 'dl', ip, DL_RATE_LIMIT_MAX);
}

/**
 * Increment download count for a skillset.
 * Returns new count.
 */
export async function incrementDownloads(
  kv: KVNamespace,
  skillsetId: string
): Promise<number> {
  const key = `downloads:${skillsetId}`;
  const current = await kv.get(key);
  const newCount = (current ? parseInt(current, 10) : 0) + 1;
  await kv.put(key, newCount.toString());
  return newCount;
}

/**
 * Get download count for a skillset.
 */
export async function getDownloadCount(
  kv: KVNamespace,
  skillsetId: string
): Promise<number> {
  const key = `downloads:${skillsetId}`;
  const value = await kv.get(key);
  return value ? parseInt(value, 10) : 0;
}
