/**
 * Reservations config API endpoint.
 *
 * POST /api/reservations/config - Update ghost slot configuration (maintainer-only)
 */
import type { APIRoute } from 'astro';
import { getSessionFromRequest, type Env } from '@/lib/auth';
import { jsonResponse, errorResponse } from '@/lib/responses';
import { getReservationStub } from '@/lib/reservation-do';
import { isMaintainer } from '@/lib/maintainer';

/**
 * POST /api/reservations/config
 *
 * Update reservation configuration (totalGhostSlots, ttlDays).
 * Requires authentication and maintainer authorization.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;

  const session = await getSessionFromRequest(env, request);
  if (!session) {
    return errorResponse('Authentication required', 401);
  }

  if (!isMaintainer(env, session.userId)) {
    return errorResponse('Forbidden', 403);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  // Validate field types
  if (body.totalGhostSlots !== undefined && typeof body.totalGhostSlots !== 'number') {
    return errorResponse('totalGhostSlots must be a number', 400);
  }
  if (body.ttlDays !== undefined && typeof body.ttlDays !== 'number') {
    return errorResponse('ttlDays must be a number', 400);
  }
  if (body.cohort !== undefined && typeof body.cohort !== 'number') {
    return errorResponse('cohort must be a number', 400);
  }

  const stub = getReservationStub(env);
  const doRequest = new Request('https://do/config', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  try {
    const response = await stub.fetch(doRequest);
    const data = await response.json();
    return jsonResponse(data, { status: response.status });
  } catch (error) {
    console.error('[Reservations] DO config update failed:', error);
    return errorResponse('Internal server error', 500);
  }
};
