import type { APIRoute } from 'astro';
import { checkRateLimit, hashIp, IP_FREEZE_TTL } from '@/lib/rate-limit';
import { createDownloadNonce, getDownloadCount } from '@/lib/downloads';
import { jsonResponse, errorResponse, parseJsonBody, getEnv } from '@/lib/responses';
import { isValidSkillsetId } from '@/lib/validation';

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
  const env = getEnv(locals);
  const ipHash = await hashIp(clientAddress);

  const gate = await checkRateLimit(env.DATA, 'dl', ipHash, 5, {
    threshold: 3,
    bucketType: 'day',
    freezeTtl: IP_FREEZE_TTL,
  });
  if (!gate.allowed) return gate.response!;

  const body = await parseJsonBody<{ skillset: string }>(request);
  if (body instanceof Response) return body;

  if (!body.skillset) {
    return errorResponse('Missing skillset', 400);
  }

  if (!isValidSkillsetId(body.skillset)) {
    return errorResponse('Invalid skillset format', 400);
  }

  const nonce = await createDownloadNonce(env.DATA, body.skillset, clientAddress);
  return jsonResponse({ nonce });
};
