/**
 * Reservation lookup API endpoint.
 *
 * GET /api/reservations/lookup - Look up active reservation by GitHub ID (public, rate-limited)
 */
import type { APIRoute } from 'astro';
import type { Env } from '@/lib/auth';
import { jsonResponse, errorResponse } from '@/lib/responses';
import { getReservationStub } from '@/lib/reservation-do';
import { checkRateLimit } from '@/lib/rate-limit';

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
  const env = (locals as { runtime: { env: Env } }).runtime.env;

  // Trust gate: 720/day per IP (≈ 30/hour), freeze after 7 consecutive days of abuse
  const gate = await checkRateLimit(env.DATA, 'lookup', clientAddress, 720, {
    threshold: 7,
    bucketType: 'day',
  });
  if (!gate.allowed) {
    return errorResponse('Too many requests', gate.response?.status === 403 ? 403 : 429, { message: 'Too many requests' });
  }

  const url = new URL(request.url);
  const githubId = url.searchParams.get('githubId');

  if (!githubId || !/^\d+$/.test(githubId)) {
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
