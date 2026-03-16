import { defineMiddleware } from 'astro:middleware';

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' https: data:",
    "connect-src 'self'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self' https://github.com",
  ].join('; '),
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
