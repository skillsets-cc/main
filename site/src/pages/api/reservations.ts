/**
 * Reservations API endpoint.
 *
 * GET    /api/reservations - Get all slot states + config (public)
 * POST   /api/reservations - Reserve a slot (authenticated, rate-limited)
 * DELETE /api/reservations - Release user's reservation (authenticated, rate-limited)
 */
import type { APIRoute } from 'astro';
import { getSessionFromRequest, type Env } from '@/lib/auth';
import { jsonResponse, errorResponse, parseJsonBody, getEnv } from '@/lib/responses';
import { getReservationStub, BATCH_ID_REGEX } from '@/lib/reservation-do';
import { checkRateLimit, type BreachPolicy } from '@/lib/rate-limit';

const RESERVATION_POLICY: BreachPolicy = { threshold: 0, bucketType: 'day' };
const BREACH_WARNING = 'You have reached your daily reservation limit (2/day). Any further attempt today will result in a permanent suspension.';

async function forwardToDO(
  env: Env,
  path: string,
  method: string,
  body: Record<string, unknown>,
  gate: Awaited<ReturnType<typeof checkRateLimit>>,
  logTag: string,
): Promise<Response> {
  const stub = getReservationStub(env);
  const doRequest = new Request(`https://do/${path}`, {
    method,
    body: JSON.stringify(body),
  });

  try {
    const response = await stub.fetch(doRequest);
    const data = await response.json() as Record<string, unknown>;
    if (gate.warning) {
      data.warning = BREACH_WARNING;
    }
    return jsonResponse(data, { status: response.status });
  } catch (error) {
    console.error(`[Reservations] DO ${logTag} failed:`, error);
    return errorResponse('Internal server error', 500);
  }
}

export const GET: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);
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

export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);

  const session = await getSessionFromRequest(env, request);
  if (!session) {
    return errorResponse('Authentication required', 401);
  }

  const gate = await checkRateLimit(env.DATA, 'reserve', session.userId, 2, RESERVATION_POLICY);
  if (!gate.allowed) return gate.response!;

  const body = await parseJsonBody<{ batchId?: string }>(request);
  if (body instanceof Response) return body;

  const { batchId } = body;
  if (!batchId || !BATCH_ID_REGEX.test(batchId)) {
    return errorResponse('Invalid slot ID', 400);
  }

  return forwardToDO(
    env, 'reserve', 'POST',
    { batchId, userId: session.userId, githubLogin: session.login },
    gate, 'reserve',
  );
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);

  const session = await getSessionFromRequest(env, request);
  if (!session) {
    return errorResponse('Authentication required', 401);
  }

  const gate = await checkRateLimit(env.DATA, 'reserve', session.userId, 2, RESERVATION_POLICY);
  if (!gate.allowed) return gate.response!;

  return forwardToDO(
    env, 'release', 'DELETE',
    { userId: session.userId },
    gate, 'release',
  );
};
