/**
 * Download tracking API endpoint.
 * POST /api/downloads - Increment download count for a skillset.
 */
import type { APIRoute } from 'astro';
import type { Env } from '../../lib/auth';
import { incrementDownloads } from '../../lib/downloads';
import { jsonResponse, errorResponse } from '../../lib/responses';

interface DownloadRequest {
  skillset: string;
}

/** Validate skillset ID format to prevent KV key injection. */
function isValidSkillsetId(id: string): boolean {
  return /^@?[\w-]+\/[\w-]+$/.test(id);
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;

  let body: DownloadRequest;
  try {
    body = (await request.json()) as DownloadRequest;
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (!body.skillset) {
    return errorResponse('Missing skillset', 400);
  }

  if (!isValidSkillsetId(body.skillset)) {
    return errorResponse('Invalid skillset format', 400);
  }

  try {
    const count = await incrementDownloads(env.STARS, body.skillset);
    return jsonResponse({ skillset: body.skillset, count });
  } catch (error) {
    console.error('[Downloads] Increment failed:', error);
    return errorResponse('Internal server error', 500);
  }
};
