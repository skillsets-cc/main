/**
 * Download tracking with KV storage.
 *
 * Storage schema:
 * - downloads:{skillsetId}   → download count (number as string)
 * - dl-rate:{ip}             → request count (with 3600s TTL)
 */

const DL_RATE_LIMIT_MAX = 30; // Max downloads per hour per IP
const DL_RATE_LIMIT_WINDOW = 3600; // 1 hour in seconds

/**
 * Check if an IP has exceeded the download rate limit.
 */
export async function isDownloadRateLimited(
  kv: KVNamespace,
  ip: string
): Promise<boolean> {
  const key = `dl-rate:${ip}`;
  const currentCount = await kv.get(key);

  if (!currentCount) {
    await kv.put(key, '1', { expirationTtl: DL_RATE_LIMIT_WINDOW });
    return false;
  }

  const count = parseInt(currentCount, 10);
  if (count >= DL_RATE_LIMIT_MAX) {
    return true;
  }

  await kv.put(key, (count + 1).toString(), {
    expirationTtl: DL_RATE_LIMIT_WINDOW,
  });
  return false;
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
