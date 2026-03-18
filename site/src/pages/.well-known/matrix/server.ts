import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = () => {
  return new Response(
    JSON.stringify({ 'm.server': 'matrix.skillsets.cc:443' }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
};
