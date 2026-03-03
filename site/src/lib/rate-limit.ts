/**
 * Bucketed KV rate limiters.
 *
 * Keys are bucketed by time period to avoid the TTL-reset drift problem
 * (re-putting a key with expirationTtl resets the TTL, extending the window).
 *
 * Key format: ratelimit:{prefix}:{id}:{bucket}
 * Keys auto-expire via TTL that survives past the bucket boundary.
 */

async function isBucketedRateLimited(
  kv: KVNamespace,
  prefix: string,
  id: string,
  limit: number,
  bucketMs: number,
  ttlSeconds: number,
): Promise<boolean> {
  const bucket = Math.floor(Date.now() / bucketMs);
  const key = `ratelimit:${prefix}:${id}:${bucket}`;
  const current = parseInt((await kv.get(key)) ?? '0', 10);

  if (current >= limit) {
    return true;
  }

  await kv.put(key, String(current + 1), { expirationTtl: ttlSeconds });
  return false;
}

/** Minute-bucketed rate limiter (TTL: 120s). */
export function isMinuteRateLimited(
  kv: KVNamespace,
  prefix: string,
  id: string,
  limit: number,
): Promise<boolean> {
  return isBucketedRateLimited(kv, prefix, id, limit, 60_000, 120);
}

/** Hour-bucketed rate limiter (TTL: 7200s). */
export function isHourlyRateLimited(
  kv: KVNamespace,
  prefix: string,
  id: string,
  limit: number,
): Promise<boolean> {
  return isBucketedRateLimited(kv, prefix, id, limit, 3_600_000, 7200);
}
