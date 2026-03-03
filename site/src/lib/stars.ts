/**
 * Star functionality with KV-based rate limiting.
 *
 * Storage schema:
 * - stars:{skillsetId}              → star count (number as string)
 * - user:{userId}:stars             → JSON array of starred skillset IDs
 * - ratelimit:star:{userId}:{min}   → request count (minute-bucketed, 120s TTL)
 */

import { isMinuteRateLimited } from './rate-limit';

const RATE_LIMIT_MAX = 10; // Max operations per minute

/**
 * Check if user has exceeded rate limit.
 * Uses minute-bucketed KV keys (fixed window, no TTL-reset drift).
 */
export async function isRateLimited(
  kv: KVNamespace,
  userId: string
): Promise<boolean> {
  return isMinuteRateLimited(kv, 'star', userId, RATE_LIMIT_MAX);
}

/**
 * Toggle star status for a skillset.
 * Returns new star state and count.
 */
export async function toggleStar(
  kv: KVNamespace,
  userId: string,
  skillsetId: string
): Promise<{ starred: boolean; count: number }> {
  const userKey = `user:${userId}:stars`;
  const countKey = `stars:${skillsetId}`;

  // Get current user stars
  const userStars = await retryKVRead<string[]>(kv, userKey, []);
  const isCurrentlyStarred = userStars.includes(skillsetId);

  // Get current count
  const currentCount = await retryKVRead<number>(kv, countKey, 0);

  if (isCurrentlyStarred) {
    // Unstar
    const updatedStars = userStars.filter((id) => id !== skillsetId);
    const newCount = Math.max(0, currentCount - 1);

    await Promise.all([
      retryKVWrite(kv, userKey, JSON.stringify(updatedStars)),
      retryKVWrite(kv, countKey, newCount.toString()),
    ]);

    return { starred: false, count: newCount };
  } else {
    // Star
    userStars.push(skillsetId);
    const newCount = currentCount + 1;

    await Promise.all([
      retryKVWrite(kv, userKey, JSON.stringify(userStars)),
      retryKVWrite(kv, countKey, newCount.toString()),
    ]);

    return { starred: true, count: newCount };
  }
}

/**
 * Check if user has starred a specific skillset.
 */
export async function isStarred(
  kv: KVNamespace,
  userId: string,
  skillsetId: string
): Promise<boolean> {
  const userKey = `user:${userId}:stars`;
  const userStars = await retryKVRead<string[]>(kv, userKey, []);
  return userStars.includes(skillsetId);
}

/**
 * Get star count for a skillset.
 */
export async function getStarCount(
  kv: KVNamespace,
  skillsetId: string
): Promise<number> {
  const countKey = `stars:${skillsetId}`;
  return retryKVRead<number>(kv, countKey, 0);
}

// --- KV retry helpers with exponential backoff ---

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 100;

/**
 * Retry an async operation with exponential backoff on 429 errors.
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      if ((error as { status?: number })?.status === 429 && attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, BASE_DELAY_MS * Math.pow(2, attempt)));
        continue;
      }
      throw error;
    }
  }
  throw new Error('withRetry: unreachable');
}

async function retryKVRead<T>(kv: KVNamespace, key: string, defaultValue: T): Promise<T> {
  return withRetry(async () => {
    const value = await kv.get(key);
    if (value === null) return defaultValue;
    return typeof defaultValue === 'number'
      ? parseInt(value, 10) as T
      : JSON.parse(value) as T;
  });
}

async function retryKVWrite(kv: KVNamespace, key: string, value: string, options?: KVNamespacePutOptions): Promise<void> {
  return withRetry(() => kv.put(key, value, options));
}
