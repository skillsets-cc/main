/**
 * Hour-bucketed KV rate limiter.
 *
 * Key format: ratelimit:{prefix}:{id}:{hour}
 * Keys auto-expire via 2-hour TTL (survives past hour boundary).
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
