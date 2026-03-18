import type { APIRoute } from 'astro';
import { getSessionFromRequest, getTokenFromRequest, createLogoutCookie, revokeSessionToken } from '@/lib/auth';
import { checkDailyLimit, recordBreach, PREFIX_REGISTRY } from '@/lib/rate-limit';
import { jsonResponse, errorResponse, getEnv } from '@/lib/responses';

const DAY_MS = 86_400_000;

export const GET: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);
  const session = await getSessionFromRequest(env, request);

  if (!session) {
    return errorResponse('Authentication required', 401);
  }

  const starsJson = await env.DATA.get(`user:${session.userId}:stars`);
  const stars: string[] = starsJson ? JSON.parse(starsJson) : [];

  return jsonResponse({ login: session.login, stars }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);

  const session = await getSessionFromRequest(env, request);
  if (!session) {
    return errorResponse('Authentication required', 401);
  }

  // No freeze gate — GDPR Art. 17 right to erasure cannot be blocked.
  // Daily limit (1/day) + immediate freeze on breach.
  try {
    const { limited } = await checkDailyLimit(env.DATA, 'delete', session.userId, 1);
    if (limited) {
      await recordBreach(env.DATA, 'delete', session.userId, {
        threshold: 0,
        bucketType: 'day',
      });
      return errorResponse('Deletion limit exceeded. Try again tomorrow.', 429);
    }
  } catch (err) {
    console.error('[RateLimit] KV error on deletion limit check, allowing through', err);
  }

  // Purge user data (breach trackers, daily counters, stars)
  const currentDay = Math.floor(Date.now() / DAY_MS);
  const deleteOps: Promise<void>[] = [
    env.DATA.delete(`user:${session.userId}:stars`),
  ];

  for (const entry of PREFIX_REGISTRY) {
    if (entry.identity !== 'userId') continue;
    deleteOps.push(env.DATA.delete(`breaches:${entry.prefix}:${session.userId}`));
    deleteOps.push(env.DATA.delete(`ratelimit:${entry.prefix}:${session.userId}:${currentDay}`));
    // NOTE: freeze keys are intentionally NOT deleted (Art. 17(3))
  }

  await Promise.all(deleteOps);
  console.log('[GDPR] User data deleted, freeze flags preserved', { userId: session.userId });

  const token = getTokenFromRequest(request);
  if (token) {
    await revokeSessionToken(env, token);
  }

  return jsonResponse({ deleted: true }, {
    headers: {
      'Set-Cookie': createLogoutCookie(),
      'Cache-Control': 'private, no-store',
    },
  });
};
