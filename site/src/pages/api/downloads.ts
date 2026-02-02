/**
 * Download tracking API endpoint.
 * POST /api/downloads - Increment download count for a skillset.
 */
import type { APIRoute } from 'astro';
import type { Env } from '../../lib/auth';
import { incrementDownloads } from '../../lib/downloads';

interface DownloadRequest {
  skillset: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;

  // Parse request body
  let body: DownloadRequest;
  try {
    body = (await request.json()) as DownloadRequest;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body.skillset) {
    return new Response(JSON.stringify({ error: 'Missing skillset' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate skillsetId format (prevent KV key injection)
  if (!/^@?[\w-]+\/[\w-]+$/.test(body.skillset)) {
    return new Response(JSON.stringify({ error: 'Invalid skillset format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const count = await incrementDownloads(env.STARS, body.skillset);
    return new Response(JSON.stringify({ skillset: body.skillset, count }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Downloads] Increment failed:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
