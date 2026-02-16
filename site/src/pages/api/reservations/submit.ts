/**
 * Reservation submit API endpoint.
 *
 * POST /api/reservations/submit - Transition slot to submitted state (maintainer-only)
 */
import type { APIRoute } from 'astro';
import { getSessionFromRequest, type Env } from '@/lib/auth';
import { jsonResponse, errorResponse, parseJsonBody } from '@/lib/responses';
import { getReservationStub, BATCH_ID_REGEX } from '@/lib/reservation-do';
import { isMaintainer } from '@/lib/maintainer';
import { isValidSkillsetId } from '@/lib/validation';

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
  const env = (locals as { runtime: { env: Env } }).runtime.env;

  const session = await getSessionFromRequest(env, request);
  if (!session) {
    return errorResponse('Authentication required', 401);
  }

  if (!isMaintainer(env, session.userId)) {
    return errorResponse('Forbidden', 403);
  }

  const body = await parseJsonBody<Record<string, unknown>>(request);
  if (body instanceof Response) return body;

  // Validate input before forwarding to DO
  const { batchId, skillsetId } = body;
  if (!batchId || typeof batchId !== 'string' || !BATCH_ID_REGEX.test(batchId)) {
    return errorResponse('Invalid batch ID', 400);
  }
  if (!skillsetId || typeof skillsetId !== 'string' || !isValidSkillsetId(skillsetId)) {
    return errorResponse('Invalid skillset ID', 400);
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
