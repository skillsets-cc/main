/**
 * Trust gate rate limiting with freeze, daily limits, and breach tracking.
 *
 * KV key patterns:
 * - freeze:{prefix}:{id}                    → "1" (permanent or 3-month TTL)
 * - ratelimit:{prefix}:{id}:{dayBucket}     → count string (25h TTL)
 * - breaches:{prefix}:{id}                  → JSON {count, lastBucket} (permanent or 3-month TTL)
 */

import { errorResponse, frozenResponse } from './responses';

const DAY_MS = 86_400_000;
const COUNTER_TTL = 90_000; // 25h in seconds
export const IP_FREEZE_TTL = 7_776_000; // 3 months in seconds

// --- IP Hashing ---

export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).slice(0, 8)
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Freeze ---

export async function isFrozen(kv: KVNamespace, prefix: string, id: string): Promise<boolean> {
  const val = await kv.get(`freeze:${prefix}:${id}`);
  return val !== null;
}

export async function freeze(kv: KVNamespace, prefix: string, id: string, ttl?: number): Promise<void> {
  const options = ttl ? { expirationTtl: ttl } : undefined;
  await kv.put(`freeze:${prefix}:${id}`, '1', options);
}

// --- Daily Limit ---

export async function checkDailyLimit(
  kv: KVNamespace, prefix: string, id: string, limit: number
): Promise<{limited: boolean; count: number}> {
  const bucket = Math.floor(Date.now() / DAY_MS);
  const key = `ratelimit:${prefix}:${id}:${bucket}`;
  const current = parseInt((await kv.get(key)) ?? '0', 10);

  if (current >= limit) {
    return { limited: true, count: current };
  }

  await kv.put(key, String(current + 1), { expirationTtl: COUNTER_TTL });
  return { limited: false, count: current + 1 };
}

// --- Breach Tracking ---

export interface BreachPolicy {
  threshold: number;       // 0 = immediate freeze
  bucketType: 'day';
  freezeTtl?: number;      // omit for permanent
}

export async function recordBreach(
  kv: KVNamespace, prefix: string, id: string, policy: BreachPolicy
): Promise<{frozen: boolean}> {
  if (policy.threshold === 0) {
    await freeze(kv, prefix, id, policy.freezeTtl);
    console.log(`[RateLimit] FREEZE ${prefix}:${id} — immediate on first breach`);
    return { frozen: true };
  }

  const key = `breaches:${prefix}:${id}`;
  const raw = await kv.get(key);
  const tracker = raw ? JSON.parse(raw) : { count: 0, lastBucket: 0 };
  const currentBucket = Math.floor(Date.now() / DAY_MS);

  if (tracker.lastBucket === currentBucket - 1) {
    tracker.count += 1;
  } else if (tracker.lastBucket === currentBucket) {
    return { frozen: false };
  } else {
    tracker.count = 1;
  }
  tracker.lastBucket = currentBucket;

  if (tracker.count >= policy.threshold) {
    await freeze(kv, prefix, id, policy.freezeTtl);
    console.log(`[RateLimit] FREEZE ${prefix}:${id} — ${tracker.count} consecutive breaches`);
    return { frozen: true };
  }

  const putOptions = policy.freezeTtl ? { expirationTtl: policy.freezeTtl } : undefined;
  await kv.put(key, JSON.stringify(tracker), putOptions);
  console.log(`[RateLimit] BREACH ${prefix}:${id} — ${tracker.count}/${policy.threshold} consecutive`);
  return { frozen: false };
}

// --- Prefix Registry ---

export const PREFIX_REGISTRY = [
  { prefix: 'star', identity: 'userId' },
  { prefix: 'dl', identity: 'ip' },
  { prefix: 'reserve', identity: 'userId' },
  { prefix: 'delete', identity: 'userId' },
] as const;

// --- Orchestrator ---

export async function checkRateLimit(
  kv: KVNamespace,
  prefix: string,
  id: string,
  limit: number,
  policy: BreachPolicy,
): Promise<{allowed: boolean; response?: Response; warning?: string}> {
  try {
    // 1. Freeze check
    if (await isFrozen(kv, prefix, id)) {
      console.log(`[RateLimit] REJECTED ${prefix}:${id} — frozen`);
      return { allowed: false, response: frozenResponse() };
    }

    // 2. Daily limit check
    const { limited, count } = await checkDailyLimit(kv, prefix, id, limit);

    if (limited) {
      console.log(`[RateLimit] HIT ${prefix}:${id} — ${count}/${limit}`);
      const { frozen } = await recordBreach(kv, prefix, id, policy);
      if (frozen) {
        return { allowed: false, response: frozenResponse() };
      }
      return {
        allowed: false,
        response: errorResponse('Rate limit exceeded', 429, {
          message: 'Daily limit exceeded. Resets tomorrow.',
        }),
      };
    }

    // 3. Warning on last allowed action
    const warning = count === limit
      ? `You have reached your daily limit (${limit}/day). Any further attempt today will result in a suspension.`
      : undefined;

    return { allowed: true, warning };
  } catch (err) {
    console.error(`[RateLimit] KV error for ${prefix}:${id}, allowing through`, err);
    return { allowed: true };
  }
}
