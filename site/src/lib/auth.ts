/**
 * GitHub OAuth authentication utilities with PKCE support.
 *
 * Flow:
 * 1. /login - Generate state + PKCE verifier, store in KV, redirect to GitHub
 * 2. /callback - Validate state, exchange code with PKCE, create JWT session
 */

/**
 * Environment bindings from Cloudflare.
 * Mirrors CloudflareEnv from env.d.ts for use in library code.
 */
export interface Env {
  AUTH: KVNamespace;
  STARS: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET: string;
  CALLBACK_URL: string;
  SITE_URL: string;
}

export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
}

export interface AuthState {
  codeVerifier: string;
  returnTo?: string;
}

/**
 * Generate cryptographically secure random string for PKCE.
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Base64 URL encode bytes (RFC 4648).
 */
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Create SHA-256 code challenge from verifier for PKCE.
 */
async function createCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Initiate OAuth flow with CSRF state and PKCE.
 * Stores auth state in KV with 5-minute TTL.
 */
export async function initiateOAuth(
  env: Env,
  returnTo?: string
): Promise<{ redirectUrl: string }> {
  const state = crypto.randomUUID();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await createCodeChallenge(codeVerifier);

  // Store verifier in KV for callback validation (5 min TTL)
  const authState: AuthState = { codeVerifier, returnTo };
  await env.AUTH.put(`oauth:${state}`, JSON.stringify(authState), {
    expirationTtl: 300,
  });

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.CALLBACK_URL,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    scope: 'read:user',
  });

  return {
    redirectUrl: `https://github.com/login/oauth/authorize?${params}`,
  };
}

/**
 * Handle OAuth callback - validate state, exchange code, return user.
 */
export async function handleOAuthCallback(
  env: Env,
  code: string,
  state: string
): Promise<{ user: GitHubUser; returnTo?: string }> {
  // Retrieve and validate state from KV
  const authStateJson = await env.AUTH.get(`oauth:${state}`);
  if (!authStateJson) {
    throw new AuthError('Invalid or expired OAuth state', 403);
  }

  // Delete state immediately to prevent replay
  await env.AUTH.delete(`oauth:${state}`);

  const authState: AuthState = JSON.parse(authStateJson);

  // Exchange code for access token with PKCE verifier
  const tokenResponse = await fetch(
    'https://github.com/login/oauth/access_token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        code_verifier: authState.codeVerifier,
      }),
    }
  );

  if (!tokenResponse.ok) {
    throw new AuthError('Failed to exchange OAuth code', 500);
  }

  const tokenData = await tokenResponse.json() as { access_token?: string; error?: string };
  if (tokenData.error || !tokenData.access_token) {
    throw new AuthError(`GitHub OAuth error: ${tokenData.error}`, 400);
  }

  // Fetch user profile
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'skillsets.cc',
    },
  });

  if (!userResponse.ok) {
    throw new AuthError('Failed to fetch GitHub user', 500);
  }

  const user = await userResponse.json() as GitHubUser;
  return { user, returnTo: authState.returnTo };
}

/**
 * Create a signed JWT session token.
 * Uses HMAC-SHA256 for signature.
 */
export async function createSessionToken(
  env: Env,
  user: GitHubUser
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: user.id.toString(),
    login: user.login,
    avatar: user.avatar_url,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  };

  const headerB64 = base64UrlEncodeString(JSON.stringify(header));
  const payloadB64 = base64UrlEncodeString(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(env.JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  return `${unsignedToken}.${signatureB64}`;
}

/**
 * Verify and decode a JWT session token.
 */
export async function verifySessionToken(
  env: Env,
  token: string
): Promise<{ userId: string; login: string; avatar: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const unsignedToken = `${headerB64}.${payloadB64}`;

    // Verify signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(env.JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = base64UrlDecode(signatureB64);
    // Convert Uint8Array to ArrayBuffer for crypto.subtle.verify
    const signatureBuffer = new ArrayBuffer(signatureBytes.length);
    new Uint8Array(signatureBuffer).set(signatureBytes);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      encoder.encode(unsignedToken)
    );

    if (!valid) return null;

    // Decode and check expiration
    const payload = JSON.parse(base64UrlDecodeString(payloadB64));
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return {
      userId: payload.sub,
      login: payload.login,
      avatar: payload.avatar,
    };
  } catch {
    return null;
  }
}

/**
 * Parse session from request cookies.
 */
export async function getSessionFromRequest(
  env: Env,
  request: Request
): Promise<{ userId: string; login: string; avatar: string } | null> {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = parseCookies(cookieHeader);
  const token = cookies['session'];
  if (!token) return null;

  return verifySessionToken(env, token);
}

/**
 * Create session cookie with secure flags.
 */
export function createSessionCookie(token: string, maxAge = 60 * 60 * 24 * 7): string {
  return `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

/**
 * Create logout cookie (expires immediately).
 */
export function createLogoutCookie(): string {
  return 'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}

// --- Helper functions ---

function base64UrlEncodeString(str: string): string {
  const encoder = new TextEncoder();
  return base64UrlEncode(encoder.encode(str));
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlDecodeString(str: string): string {
  const bytes = base64UrlDecode(str);
  return new TextDecoder().decode(bytes);
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const cookie of cookieHeader.split(';')) {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (name) {
      cookies[name] = valueParts.join('=');
    }
  }
  return cookies;
}

/**
 * Custom error class for auth failures with status code.
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
