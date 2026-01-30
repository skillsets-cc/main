/**
 * Star/unstar API endpoint.
 * POST /api/star - Toggle star for authenticated user.
 * GET /api/star?skillsetId=x - Get star status for authenticated user.
 */
import type { APIRoute } from 'astro';
import { getSessionFromRequest, type Env } from '../../lib/auth';
import { toggleStar, isRateLimited, isStarred, getStarCount } from '../../lib/stars';

interface StarRequest {
  skillsetId: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;

  // Verify authentication
  const session = await getSessionFromRequest(env, request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check rate limit
  const rateLimited = await isRateLimited(env.STARS, session.userId);
  if (rateLimited) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'Maximum 10 star operations per minute. Please try again later.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
        },
      }
    );
  }

  // Parse request body
  let body: StarRequest;
  try {
    body = await request.json() as StarRequest;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body.skillsetId) {
    return new Response(JSON.stringify({ error: 'Missing skillsetId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate skillsetId format (prevent KV key injection)
  if (!/^@?[\w-]+\/[\w-]+$/.test(body.skillsetId)) {
    return new Response(JSON.stringify({ error: 'Invalid skillsetId format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await toggleStar(env.STARS, session.userId, body.skillsetId);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Stars] Toggle failed:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;
  const url = new URL(request.url);
  const skillsetId = url.searchParams.get('skillsetId');

  if (!skillsetId) {
    return new Response(JSON.stringify({ error: 'Missing skillsetId parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get star count (always available)
  const count = await getStarCount(env.STARS, skillsetId);

  // Check if user has starred (if authenticated)
  const session = await getSessionFromRequest(env, request);
  const starred = session
    ? await isStarred(env.STARS, session.userId, skillsetId)
    : false;

  return new Response(
    JSON.stringify({
      skillsetId,
      count,
      starred,
      authenticated: !!session,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
