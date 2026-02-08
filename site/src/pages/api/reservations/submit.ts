/**
 * Reservation submit API endpoint.
 *
 * POST /api/reservations/submit - Transition slot to submitted state (maintainer-only)
 */
import type { APIRoute } from 'astro';
import { getSessionFromRequest, type Env } from '@/lib/auth';
import { jsonResponse, errorResponse } from '@/lib/responses';
import { getReservationStub } from '@/lib/reservation-do';
import { isMaintainer } from '@/lib/maintainer';

/**
 * POST /api/reservations/submit
 *
 * Mark a reserved slot as submitted (terminal state).
 * Called by maintainers after merging a PR.
 *
 * Request body:
 *   - batchId: The batch ID to mark as submitted
 *   - skillsetId: The skillset ID (e.g., @user/SkillName)
 *
 * Returns: { batchId, status: 'submitted', skillsetId }
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env as Env;

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

  const stub = getReservationStub(env);
  const doRequest = new Request('https://do/submit', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  try {
    const response = await stub.fetch(doRequest);
    const data = await response.json();
    return jsonResponse(data, { status: response.status });
  } catch (error) {
    console.error('[Submit] DO submit failed:', error);
    return errorResponse('Internal server error', 500);
  }
};
