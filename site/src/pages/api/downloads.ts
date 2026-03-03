/**
 * Download tracking API endpoint.
 * POST /api/downloads - Increment download count for a skillset.
 */
import type { APIRoute } from 'astro';
import type { Env } from '@/lib/auth';
import { incrementDownloads, isDownloadRateLimited, getDownloadCount } from '@/lib/downloads';
import { jsonResponse, errorResponse, parseJsonBody } from '@/lib/responses';
import { isValidSkillsetId } from '@/lib/validation';

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

  try {
    const count = await getDownloadCount(env.DATA, skillsetId);
    return jsonResponse({ skillsetId, count }, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  } catch (error) {
    console.error('[Downloads] Get count failed:', error);
    return errorResponse('Internal server error', 500);
  }
};

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;

  const ip = clientAddress;
  if (await isDownloadRateLimited(env.DATA, ip)) {
    return errorResponse('Rate limit exceeded', 429);
  }

  const body = await parseJsonBody<{ skillset: string }>(request);
  if (body instanceof Response) return body;

  if (!body.skillset) {
    return errorResponse('Missing skillset', 400);
  }

  if (!isValidSkillsetId(body.skillset)) {
    return errorResponse('Invalid skillset format', 400);
  }

  try {
    const count = await incrementDownloads(env.DATA, body.skillset);
    return jsonResponse({ skillset: body.skillset, count });
  } catch (error) {
    console.error('[Downloads] Increment failed:', error);
    return errorResponse('Internal server error', 500);
  }
};
