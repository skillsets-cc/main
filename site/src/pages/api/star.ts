/**
 * Star/unstar API endpoint.
 * POST /api/star - Toggle star for authenticated user.
 * GET /api/star?skillsetId=x - Get star status for authenticated user.
 */
import type { APIRoute } from 'astro';
import { getSessionFromRequest } from '@/lib/auth';
import { toggleStar, isStarred, getStarCount } from '@/lib/stars';
import { jsonResponse, errorResponse, parseJsonBody, getEnv } from '@/lib/responses';
import { isValidSkillsetId } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);

  const session = await getSessionFromRequest(env, request);
  if (!session) {
    return errorResponse('Authentication required', 401);
  }

  const gate = await checkRateLimit(env.DATA, 'star', session.userId, 10, {
    threshold: 3,
    bucketType: 'day',
  });
  if (!gate.allowed) return gate.response!;

  const body = await parseJsonBody<{ skillsetId: string }>(request);
  if (body instanceof Response) return body;

  if (!body.skillsetId) {
    return errorResponse('Missing skillsetId', 400);
  }

  if (!isValidSkillsetId(body.skillsetId)) {
    return errorResponse('Invalid skillsetId format', 400);
  }

  try {
    const result = await toggleStar(env.DATA, session.userId, body.skillsetId);
    return jsonResponse(result);
  } catch (error) {
    console.error('[Stars] Toggle failed:', error);
    return errorResponse('Internal server error', 500);
  }
};

export const GET: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);
  const url = new URL(request.url);
  const skillsetId = url.searchParams.get('skillsetId');

  if (!skillsetId) {
    return errorResponse('Missing skillsetId parameter', 400);
  }

  if (!isValidSkillsetId(skillsetId)) {
    return errorResponse('Invalid skillsetId format', 400);
  }

  const count = await getStarCount(env.DATA, skillsetId);
  const session = await getSessionFromRequest(env, request);
  const starred = session
    ? await isStarred(env.DATA, session.userId, skillsetId)
    : false;

  return jsonResponse({
    skillsetId,
    count,
    starred,
    authenticated: !!session,
  });
};
