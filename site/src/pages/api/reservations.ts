/**
 * Reservations API endpoint.
 *
 * GET    /api/reservations - Get all slot states + config (public)
 * POST   /api/reservations - Reserve a slot (authenticated, rate-limited)
 * DELETE /api/reservations - Release user's reservation (authenticated, rate-limited)
 */
import type { APIRoute } from 'astro';
import { getSessionFromRequest, type Env } from '@/lib/auth';
import { jsonResponse, errorResponse } from '@/lib/responses';
import { getReservationStub } from '@/lib/reservation-do';

const RESERVATION_RATE_LIMIT = 5;
const SLOT_ID_REGEX = /^\d{1,3}\.\d{1,3}\.\d{3}$/;

/**
 * Check if user has exceeded reservation rate limit.
 * Hour-bucketed keys prevent TTL-reset bug.
 *
 * Key format: ratelimit:reserve:{userId}:{hour}
 * Limit: 5 operations per hour
 */
export async function isReservationRateLimited(
  kv: KVNamespace,
  userId: string
): Promise<boolean> {
  const hour = Math.floor(Date.now() / 3_600_000);
  const key = `ratelimit:reserve:${userId}:${hour}`;
  const current = parseInt((await kv.get(key)) ?? '0', 10);

  if (current >= RESERVATION_RATE_LIMIT) {
    return true;
  }

  // Increment counter with 2-hour TTL (ensures key survives past hour boundary)
  await kv.put(key, String(current + 1), { expirationTtl: 7200 });
  return false;
}

/**
 * GET /api/reservations
 *
 * Returns all slot states, config, and userSlot (if authenticated).
 * Cache-Control varies by session presence (private vs public).
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env as Env;
  const session = await getSessionFromRequest(env, request);
  const stub = getReservationStub(env);

  const doRequest = new Request('https://do/status', {
    headers: session ? { 'X-User-Id': session.userId } : {},
  });

  try {
    const response = await stub.fetch(doRequest);
    const data = await response.json();
    const cacheControl = session ? 'private, max-age=10' : 'public, max-age=10';

    return jsonResponse(data, {
      headers: { 'Cache-Control': cacheControl },
    });
  } catch (error) {
    console.error('[Reservations] DO fetch failed:', error);
    return errorResponse('Internal server error', 500);
  }
};

/**
 * POST /api/reservations
 *
 * Reserve a slot for the authenticated user.
 * Request body: { slotId: string }
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env as Env;

  const session = await getSessionFromRequest(env, request);
  if (!session) {
    return errorResponse('Authentication required', 401);
  }

  if (await isReservationRateLimited(env.DATA, session.userId)) {
    return errorResponse('Rate limit exceeded', 429, {
      message: 'Maximum 5 reservation operations per hour.',
    });
  }

  let body: { slotId?: string };
  try {
    body = (await request.json()) as { slotId?: string };
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const { slotId } = body;
  if (!slotId || !SLOT_ID_REGEX.test(slotId)) {
    return errorResponse('Invalid slot ID', 400);
  }

  const stub = getReservationStub(env);
  const doRequest = new Request('https://do/reserve', {
    method: 'POST',
    body: JSON.stringify({ slotId, userId: session.userId, githubLogin: session.login }),
  });

  try {
    const response = await stub.fetch(doRequest);
    const data = await response.json();
    return jsonResponse(data, { status: response.status });
  } catch (error) {
    console.error('[Reservations] DO reserve failed:', error);
    return errorResponse('Internal server error', 500);
  }
};

/**
 * DELETE /api/reservations
 *
 * Release the authenticated user's reservation.
 * No request body required (userId from session).
 */
export const DELETE: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env as Env;

  const session = await getSessionFromRequest(env, request);
  if (!session) {
    return errorResponse('Authentication required', 401);
  }

  if (await isReservationRateLimited(env.DATA, session.userId)) {
    return errorResponse('Rate limit exceeded', 429, {
      message: 'Maximum 5 reservation operations per hour.',
    });
  }

  const stub = getReservationStub(env);
  const doRequest = new Request('https://do/release', {
    method: 'DELETE',
    body: JSON.stringify({ userId: session.userId }),
  });

  try {
    const response = await stub.fetch(doRequest);
    const data = await response.json();
    return jsonResponse(data, { status: response.status });
  } catch (error) {
    console.error('[Reservations] DO release failed:', error);
    return errorResponse('Internal server error', 500);
  }
};
