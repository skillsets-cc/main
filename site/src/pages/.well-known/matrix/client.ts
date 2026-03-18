import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = () => {
  return new Response(
    JSON.stringify({
      'm.homeserver': { base_url: 'https://matrix.skillsets.cc' },
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
};
