/**
 * Star/unstar API endpoint.
 * POST /api/star - Toggle star for authenticated user.
 * GET /api/star?skillsetId=x - Get star status for authenticated user.
 */
import type { APIRoute } from 'astro';
import { getSessionFromRequest, type Env } from '../../lib/auth';
import { toggleStar, isRateLimited, isStarred, getStarCount } from '../../lib/stars';
import { jsonResponse, errorResponse } from '../../lib/responses';

interface StarRequest {
  skillsetId: string;
}

/** Validate skillsetId format to prevent KV key injection. */
function isValidSkillsetId(id: string): boolean {
  return /^@?[\w-]+\/[\w-]+$/.test(id);
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;

  const session = await getSessionFromRequest(env, request);
  if (!session) {
    return errorResponse('Unauthorized', 401);
  }

  const rateLimited = await isRateLimited(env.STARS, session.userId);
  if (rateLimited) {
    return errorResponse('Rate limit exceeded', 429, {
      message: 'Maximum 10 star operations per minute. Please try again later.',
    });
  }

  let body: StarRequest;
  try {
    body = await request.json() as StarRequest;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (!body.skillsetId) {
    return errorResponse('Missing skillsetId', 400);
  }

  if (!isValidSkillsetId(body.skillsetId)) {
    return errorResponse('Invalid skillsetId format', 400);
  }

  try {
    const result = await toggleStar(env.STARS, session.userId, body.skillsetId);
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

  const count = await getStarCount(env.STARS, skillsetId);
  const session = await getSessionFromRequest(env, request);
  const starred = session
    ? await isStarred(env.STARS, session.userId, skillsetId)
    : false;

  return jsonResponse({
    skillsetId,
    count,
    starred,
    authenticated: !!session,
  });
};
