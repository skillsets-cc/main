/**
 * Reservation verification API endpoint.
 *
 * GET /api/reservations/verify - Verify batch ID reservation for CI validation (public, rate-limited)
 */
import type { APIRoute } from 'astro';
import type { Env } from '@/lib/auth';
import { jsonResponse, errorResponse } from '@/lib/responses';
import { getReservationStub } from '@/lib/reservation-do';

const BATCH_ID_REGEX = /^\d{1,3}\.\d{1,3}\.\d{3}$/;
const VERIFY_RATE_LIMIT = 30;

/**
 * Check if IP has exceeded verification rate limit.
 * Hour-bucketed keys prevent TTL-reset bug.
 *
 * Key format: ratelimit:verify:{ip}:{hour}
 * Limit: 30 requests per hour
 */
async function isVerifyRateLimited(kv: KVNamespace, ip: string): Promise<boolean> {
  const hour = Math.floor(Date.now() / 3_600_000);
  const key = `ratelimit:verify:${ip}:${hour}`;
  const current = parseInt((await kv.get(key)) ?? '0', 10);
  if (current >= VERIFY_RATE_LIMIT) return true;
  await kv.put(key, String(current + 1), { expirationTtl: 7200 });
  return false;
}

/**
 * GET /api/reservations/verify
 *
 * Verify a batch ID reservation matches the given login/userId.
 * Used by CI to validate PR submissions.
 *
 * Query params:
 *   - batchId: The batch ID to verify (required)
 *   - login: GitHub login to match (optional)
 *   - userId: GitHub user ID to match (optional)
 *
 * Returns: { valid: boolean, reason?: string, batchId?: string }
 */
export const GET: APIRoute = async ({ request, locals, clientAddress }) => {
  const env = locals.runtime.env as Env;

  if (await isVerifyRateLimited(env.DATA, clientAddress)) {
    return errorResponse('Too many requests', 429, { message: 'Too many requests' });
  }

  const url = new URL(request.url);
  const batchId = url.searchParams.get('batchId');
  const login = url.searchParams.get('login');
  const userId = url.searchParams.get('userId');

  if (!batchId || !BATCH_ID_REGEX.test(batchId)) {
    return jsonResponse({ valid: false, reason: 'invalid_batch_id' });
  }

  const stub = getReservationStub(env);
  const params = new URLSearchParams();
  params.set('batchId', batchId);
  if (login) params.set('login', login);
  if (userId) params.set('userId', userId);

  try {
    const response = await stub.fetch(new Request(`https://do/verify?${params}`));
    const data = await response.json();
    return jsonResponse(data);
  } catch (error) {
    console.error('[Verify] DO fetch failed:', error);
    return errorResponse('Internal server error', 500);
  }
};
