import type { APIRoute } from 'astro';
import { getSessionFromRequest, type Env } from '../../lib/auth';
import { jsonResponse, errorResponse } from '../../lib/responses';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;
  const session = await getSessionFromRequest(env, request);

  if (!session) {
    return errorResponse('Unauthorized', 401);
  }

  return jsonResponse({ login: session.login }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
};
