/**
 * Bucketed KV rate limiters.
 *
 * Keys are bucketed by time period to avoid the TTL-reset drift problem
 * (re-putting a key with expirationTtl resets the TTL, extending the window).
 *
 * Key format: ratelimit:{prefix}:{id}:{bucket}
 * Keys auto-expire via TTL that survives past the bucket boundary.
 */

/**
 * Minute-bucketed rate limiter.
 * Key format: ratelimit:{prefix}:{id}:{minute}
 * TTL: 120s (survives past minute boundary).
 */
export async function isMinuteRateLimited(
  kv: KVNamespace,
  prefix: string,
  id: string,
  limit: number,
): Promise<boolean> {
  const minute = Math.floor(Date.now() / 60_000);
  const key = `ratelimit:${prefix}:${id}:${minute}`;
  const current = parseInt((await kv.get(key)) ?? '0', 10);

  if (current >= limit) {
    return true;
  }

  await kv.put(key, String(current + 1), { expirationTtl: 120 });
  return false;
}

/**
 * Hour-bucketed rate limiter.
 * Key format: ratelimit:{prefix}:{id}:{hour}
 * TTL: 7200s (survives past hour boundary).
 */
export async function isHourlyRateLimited(
  kv: KVNamespace,
  prefix: string,
  id: string,
  limit: number,
): Promise<boolean> {
  const hour = Math.floor(Date.now() / 3_600_000);
  const key = `ratelimit:${prefix}:${id}:${hour}`;
  const current = parseInt((await kv.get(key)) ?? '0', 10);

  if (current >= limit) {
    return true;
  }

  await kv.put(key, String(current + 1), { expirationTtl: 7200 });
  return false;
}
