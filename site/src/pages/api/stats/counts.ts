/**
 * Bulk stats endpoint for CLI.
 * GET /api/stats/counts - Returns all star and download counts.
 */
import type { APIRoute } from 'astro';
import type { Env } from '../../../lib/auth';
import { jsonResponse, errorResponse } from '../../../lib/responses';

interface CountsResponse {
  stars: Record<string, number>;
  downloads: Record<string, number>;
}

/** Build a counts map from KV keys and values. */
function buildCountsMap(
  keys: string[],
  values: (string | null)[],
  prefix: string
): Record<string, number> {
  const counts: Record<string, number> = {};
  keys.forEach((key, i) => {
    const skillsetId = key.replace(prefix, '');
    counts[skillsetId] = parseInt(values[i] || '0', 10);
  });
  return counts;
}

export const GET: APIRoute = async ({ locals }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;

  try {
    const [starsList, downloadsList] = await Promise.all([
      env.STARS.list({ prefix: 'stars:' }),
      env.STARS.list({ prefix: 'downloads:' }),
    ]);

    const starKeys = starsList.keys.map((k) => k.name);
    const downloadKeys = downloadsList.keys.map((k) => k.name);

    const [starValues, downloadValues] = await Promise.all([
      Promise.all(starKeys.map((k) => env.STARS.get(k))),
      Promise.all(downloadKeys.map((k) => env.STARS.get(k))),
    ]);

    const response: CountsResponse = {
      stars: buildCountsMap(starKeys, starValues, 'stars:'),
      downloads: buildCountsMap(downloadKeys, downloadValues, 'downloads:'),
    };

    return jsonResponse(response, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  } catch (error) {
    console.error('[Stats] Failed to fetch counts:', error);
    return errorResponse('Internal server error', 500);
  }
};
