/**
 * Download tracking with nonce-based verification.
 *
 * Storage schema:
 * - downloads:{skillsetId}           → download count (number as string)
 * - nonce:{uuid}                     → JSON {skillset, ipHash, ts} (600s TTL)
 */
import { hashIp } from './rate-limit';

const NONCE_TTL_SECONDS = 600; // 10 minutes

/** Issue a download nonce. Called before degit install. */
export async function createDownloadNonce(
  kv: KVNamespace, skillsetId: string, ip: string
): Promise<string> {
  const nonce = crypto.randomUUID();
  const ipHash = await hashIp(ip);
  await kv.put(`nonce:${nonce}`, JSON.stringify({
    skillset: skillsetId,
    ipHash,
    ts: Date.now(),
  }), { expirationTtl: NONCE_TTL_SECONDS });
  return nonce;
}

/** Validate and consume a download nonce. Returns true if valid. */
export async function consumeDownloadNonce(
  kv: KVNamespace, nonce: string, skillsetId: string, ip: string
): Promise<boolean> {
  const raw = await kv.get(`nonce:${nonce}`);
  if (!raw) return false;

  const data = JSON.parse(raw);
  const ipHash = await hashIp(ip);
  if (data.skillset !== skillsetId || data.ipHash !== ipHash) return false;

  await kv.delete(`nonce:${nonce}`);
  return true;
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
