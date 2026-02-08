/**
 * Reservation lookup API endpoint.
 *
 * GET /api/reservations/lookup - Look up active reservation by GitHub ID (public, rate-limited)
 */
import type { APIRoute } from 'astro';
import type { Env } from '@/lib/auth';
import { jsonResponse, errorResponse } from '@/lib/responses';
import { getReservationStub } from '@/lib/reservation-do';

const LOOKUP_RATE_LIMIT = 30;

/**
 * Check if IP has exceeded lookup rate limit.
 * Hour-bucketed keys prevent TTL-reset bug.
 *
 * Key format: ratelimit:lookup:{ip}:{hour}
 * Limit: 30 requests per hour
 */
async function isLookupRateLimited(kv: KVNamespace, ip: string): Promise<boolean> {
  const hour = Math.floor(Date.now() / 3_600_000);
  const key = `ratelimit:lookup:${ip}:${hour}`;
  const current = parseInt((await kv.get(key)) ?? '0', 10);
  if (current >= LOOKUP_RATE_LIMIT) return true;
  await kv.put(key, String(current + 1), { expirationTtl: 7200 });
  return false;
}

/**
 * GET /api/reservations/lookup
 *
 * Look up active reservation for a GitHub user.
 * Used by CLI to find the user's batch ID during init.
 *
 * Query params:
 *   - githubId: GitHub user ID (required)
 *
 * Returns: { batchId: string | null }
 */
export const GET: APIRoute = async ({ request, locals, clientAddress }) => {
  const env = locals.runtime.env as Env;

  if (await isLookupRateLimited(env.DATA, clientAddress)) {
    return errorResponse('Too many requests', 429, { message: 'Too many requests' });
  }

  const url = new URL(request.url);
  const githubId = url.searchParams.get('githubId');

  if (!githubId) {
    return jsonResponse({ batchId: null });
  }

  const stub = getReservationStub(env);
  const params = new URLSearchParams();
  params.set('githubId', githubId);

  try {
    const response = await stub.fetch(new Request(`https://do/lookup?${params}`));
    const data = await response.json();
    return jsonResponse(data);
  } catch (error) {
    console.error('[Lookup] DO fetch failed:', error);
    return errorResponse('Internal server error', 500);
  }
};
