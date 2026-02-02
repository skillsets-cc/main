/**
 * Bulk stats endpoint for CLI.
 * GET /api/stats/counts - Returns all star and download counts.
 */
import type { APIRoute } from 'astro';
import type { Env } from '../../../lib/auth';

interface CountsResponse {
  stars: Record<string, number>;
  downloads: Record<string, number>;
}

export const GET: APIRoute = async ({ locals }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;

  try {
    const [starsList, downloadsList] = await Promise.all([
      env.STARS.list({ prefix: 'stars:' }),
      env.STARS.list({ prefix: 'downloads:' }),
    ]);

    // Fetch all values in parallel
    const starKeys = starsList.keys.map((k) => k.name);
    const downloadKeys = downloadsList.keys.map((k) => k.name);

    const [starValues, downloadValues] = await Promise.all([
      Promise.all(starKeys.map((k) => env.STARS.get(k))),
      Promise.all(downloadKeys.map((k) => env.STARS.get(k))),
    ]);

    // Build response objects
    const stars: Record<string, number> = {};
    const downloads: Record<string, number> = {};

    starKeys.forEach((key, i) => {
      const skillsetId = key.replace('stars:', '');
      stars[skillsetId] = parseInt(starValues[i] || '0', 10);
    });

    downloadKeys.forEach((key, i) => {
      const skillsetId = key.replace('downloads:', '');
      downloads[skillsetId] = parseInt(downloadValues[i] || '0', 10);
    });

    const response: CountsResponse = { stars, downloads };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
    });
  } catch (error) {
    console.error('[Stats] Failed to fetch counts:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
