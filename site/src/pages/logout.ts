/**
 * Logout endpoint.
 * Clears session cookie and redirects to home.
 */
import type { APIRoute } from 'astro';
import { createLogoutCookie, getTokenFromRequest, revokeSessionToken, type Env } from '../lib/auth';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;

  // Revoke the current token server-side before clearing the cookie
  const token = getTokenFromRequest(request);
  if (token) {
    await revokeSessionToken(env, token);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: env.SITE_URL || '/',
      'Set-Cookie': createLogoutCookie(),
    },
  });
};
