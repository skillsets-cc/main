/**
 * OAuth callback endpoint.
 * Validates state, exchanges code for token, creates session.
 */
import type { APIRoute } from 'astro';
import {
  handleOAuthCallback,
  createSessionToken,
  createSessionCookie,
  AuthError,
  type Env,
} from '../lib/auth';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;
  const url = new URL(request.url);

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Handle OAuth errors from GitHub
  if (error) {
    console.error('[Auth] GitHub OAuth error:', error);
    return Response.redirect(`${env.SITE_URL}/?error=oauth_denied`, 302);
  }

  if (!code || !state) {
    return new Response('Missing code or state parameter', { status: 400 });
  }

  try {
    // Validate state and exchange code for user
    const { user, returnTo } = await handleOAuthCallback(env, code, state);

    // Create JWT session token
    const token = await createSessionToken(env, user);

    // Redirect to return URL with session cookie
    const redirectUrl = returnTo || '/';
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl,
        'Set-Cookie': createSessionCookie(token),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      console.error('[Auth] Auth error:', error.message);
      if (error.statusCode === 403) {
        // Invalid/expired state - likely CSRF or timeout
        return Response.redirect(`${env.SITE_URL}/?error=session_expired`, 302);
      }
      return new Response(error.message, { status: error.statusCode });
    }

    console.error('[Auth] Unexpected error:', error);
    return Response.redirect(`${env.SITE_URL}/?error=auth_failed`, 302);
  }
};
