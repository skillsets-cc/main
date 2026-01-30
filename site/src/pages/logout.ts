/**
 * Logout endpoint.
 * Clears session cookie and redirects to home.
 */
import type { APIRoute } from 'astro';
import { createLogoutCookie, type Env } from '../lib/auth';

export const GET: APIRoute = async ({ locals }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;

  return new Response(null, {
    status: 302,
    headers: {
      Location: env.SITE_URL || '/',
      'Set-Cookie': createLogoutCookie(),
    },
  });
};
