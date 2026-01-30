/**
 * OAuth login endpoint.
 * Initiates GitHub OAuth flow with CSRF state and PKCE.
 */
import type { APIRoute } from 'astro';
import { initiateOAuth, type Env } from '../lib/auth';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;

  // Get optional return URL from query param
  const url = new URL(request.url);
  const returnTo = url.searchParams.get('returnTo') || '/';

  try {
    const { redirectUrl } = await initiateOAuth(env, returnTo);
    return Response.redirect(redirectUrl, 302);
  } catch (error) {
    console.error('[Auth] OAuth initiation failed:', error);
    return new Response('Failed to initiate login', { status: 500 });
  }
};
