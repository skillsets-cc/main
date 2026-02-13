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
import { isHourlyRateLimited } from '@/lib/rate-limit';

const SLOT_ID_REGEX = /^\d{1,3}\.\d{1,3}\.\d{3}$/;

/** Check if user has exceeded reservation rate limit (5 ops/hour). */
export async function isReservationRateLimited(
  kv: KVNamespace,
  userId: string,
): Promise<boolean> {
  return isHourlyRateLimited(kv, 'reserve', userId, 5);
}

/**
 * GET /api/reservations
 *
 * Returns all slot states, config, and userSlot (if authenticated).
 * Cache-Control varies by session presence (private vs public).
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;
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
  const env = (locals as { runtime: { env: Env } }).runtime.env;

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
  const env = (locals as { runtime: { env: Env } }).runtime.env;

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
