import { defineMiddleware } from 'astro:middleware';

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':
    "frame-ancestors 'self'; base-uri 'self'; form-action 'self' https://github.com",
};

export const onRequest = defineMiddleware(async (_ctx, next) => {
  const response = await next();

  // Response.redirect() returns an immutable Response in Workers —
  // clone into a mutable Response before setting headers.
  const mutable = new Response(response.body, response);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    mutable.headers.set(key, value);
  }
  return mutable;
});
