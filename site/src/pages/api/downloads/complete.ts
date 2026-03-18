import type { APIRoute } from 'astro';
import { consumeDownloadNonce, incrementDownloads } from '@/lib/downloads';
import { jsonResponse, errorResponse, parseJsonBody, getEnv } from '@/lib/responses';
import { isValidSkillsetId } from '@/lib/validation';

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const env = getEnv(locals);

  const body = await parseJsonBody<{ skillset: string; nonce: string }>(request);
  if (body instanceof Response) return body;

  if (!body.skillset || !body.nonce) {
    return errorResponse('Missing skillset or nonce', 400);
  }

  if (!isValidSkillsetId(body.skillset)) {
    return errorResponse('Invalid skillset format', 400);
  }

  const valid = await consumeDownloadNonce(env.DATA, body.nonce, body.skillset, clientAddress);
  if (!valid) {
    return errorResponse('Invalid or expired nonce', 400);
  }

  try {
    const count = await incrementDownloads(env.DATA, body.skillset);
    return jsonResponse({ skillset: body.skillset, count });
  } catch (error) {
    console.error('[Downloads] Increment failed:', error);
    return errorResponse('Internal server error', 500);
  }
};
