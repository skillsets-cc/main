/**
 * Star/unstar API endpoint.
 * POST /api/star - Toggle star for authenticated user.
 * GET /api/star?skillsetId=x - Get star status for authenticated user.
 */
import type { APIRoute } from 'astro';
import { getSessionFromRequest, type Env } from '../../lib/auth';
import { toggleStar, isRateLimited, isStarred, getStarCount } from '../../lib/stars';
import { jsonResponse, errorResponse, parseJsonBody } from '../../lib/responses';
import { isValidSkillsetId } from '../../lib/validation';

interface StarRequest {
  skillsetId: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;

  const session = await getSessionFromRequest(env, request);
  if (!session) {
    return errorResponse('Authentication required', 401);
  }

  const rateLimited = await isRateLimited(env.DATA, session.userId);
  if (rateLimited) {
    return errorResponse('Rate limit exceeded', 429, {
      message: 'Maximum 10 star operations per minute. Please try again later.',
    });
  }

  const body = await parseJsonBody<StarRequest>(request);
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
  const env = (locals as { runtime: { env: Env } }).runtime.env;
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
