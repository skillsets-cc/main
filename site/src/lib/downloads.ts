/**
 * Download tracking with KV storage.
 *
 * Storage schema:
 * - downloads:{skillsetId} → download count (number as string)
 */

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
