import type { APIRoute } from 'astro';
import { getSessionFromRequest, getTokenFromRequest, createLogoutCookie, revokeSessionToken, type Env } from '@/lib/auth';
import { isHourlyRateLimited } from '@/lib/rate-limit';
import { jsonResponse, errorResponse } from '@/lib/responses';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;
  const session = await getSessionFromRequest(env, request);

  if (!session) {
    return errorResponse('Authentication required', 401);
  }

  // Fetch user's starred skillsets for GDPR data export
  const starsJson = await env.DATA.get(`user:${session.userId}:stars`);
  const stars: string[] = starsJson ? JSON.parse(starsJson) : [];

  return jsonResponse({ login: session.login, stars }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;
  const session = await getSessionFromRequest(env, request);

  if (!session) {
    return errorResponse('Authentication required', 401);
  }

  // Rate limit: 5 deletion attempts per hour per user
  if (await isHourlyRateLimited(env.DATA, 'delete', session.userId, 5)) {
    return errorResponse('Rate limit exceeded', 429);
  }

  // Delete user's starred skillsets list from KV
  await env.DATA.delete(`user:${session.userId}:stars`);

  console.log('[GDPR] User data deleted', { userId: session.userId });

  // Revoke the current JWT
  const token = getTokenFromRequest(request);
  if (token) {
    await revokeSessionToken(env, token);
  }

  // Return success with logout cookie
  return jsonResponse({ deleted: true }, {
    headers: {
      'Set-Cookie': createLogoutCookie(),
      'Cache-Control': 'private, no-store',
    },
  });
};
