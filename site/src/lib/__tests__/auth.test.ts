import { describe, it, expect, vi } from 'vitest';
import {
  initiateOAuth,
  handleOAuthCallback,
  createSessionToken,
  verifySessionToken,
  getSessionFromRequest,
  createSessionCookie,
  createLogoutCookie,
  AuthError,
  type GitHubUser,
} from '../auth';
import { createMockEnv } from './test-utils';

describe('auth', () => {
  describe('initiateOAuth', () => {
    it('generates redirect URL with required OAuth params', async () => {
      const env = createMockEnv();
      const { redirectUrl } = await initiateOAuth(env);

      const url = new URL(redirectUrl);
      expect(url.origin).toBe('https://github.com');
      expect(url.pathname).toBe('/login/oauth/authorize');
      expect(url.searchParams.get('client_id')).toBe('test-client-id');
      expect(url.searchParams.get('redirect_uri')).toBe('https://skillsets.cc/callback');
      expect(url.searchParams.get('scope')).toBe('read:user');
    });

    it('includes PKCE code_challenge', async () => {
      const env = createMockEnv();
      const { redirectUrl } = await initiateOAuth(env);

      const url = new URL(redirectUrl);
      expect(url.searchParams.get('code_challenge')).toBeTruthy();
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    });

    it('stores state with code verifier in KV', async () => {
      const env = createMockEnv();
      const { redirectUrl } = await initiateOAuth(env);

      const url = new URL(redirectUrl);
      const state = url.searchParams.get('state');
      expect(state).toBeTruthy();

      // Verify state was stored in KV
      expect(env.AUTH.put).toHaveBeenCalledWith(
        `oauth:${state}`,
        expect.any(String),
        { expirationTtl: 300 }
      );
    });

    it('includes returnTo in stored state', async () => {
      const env = createMockEnv();
      const { redirectUrl } = await initiateOAuth(env, '/skillset/test/foo');

      const url = new URL(redirectUrl);
      // Verify state param exists (used as KV key)
      expect(url.searchParams.get('state')).toBeTruthy();

      // Get the stored value
      const putCall = (env.AUTH.put as ReturnType<typeof vi.fn>).mock.calls[0];
      const storedState = JSON.parse(putCall[1]);
      expect(storedState.returnTo).toBe('/skillset/test/foo');
    });
  });

  describe('handleOAuthCallback', () => {
    it('throws AuthError for invalid state', async () => {
      const env = createMockEnv();

      await expect(
        handleOAuthCallback(env, 'test-code', 'invalid-state')
      ).rejects.toThrow(AuthError);

      await expect(
        handleOAuthCallback(env, 'test-code', 'invalid-state')
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Invalid or expired OAuth state',
      });
    });

    it('deletes state after retrieval to prevent replay', async () => {
      const env = createMockEnv();
      const state = 'test-state';
      await env.AUTH.put(`oauth:${state}`, JSON.stringify({ codeVerifier: 'test-verifier' }));

      // Mock GitHub token exchange to fail (we're testing state deletion)
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      try {
        await handleOAuthCallback(env, 'test-code', state);
      } catch {
        // Expected to fail on token exchange
      }

      expect(env.AUTH.delete).toHaveBeenCalledWith(`oauth:${state}`);
    });
  });

  describe('createSessionToken / verifySessionToken', () => {
    const mockUser: GitHubUser = {
      id: 12345,
      login: 'testuser',
      avatar_url: 'https://github.com/testuser.png',
    };

    it('creates a valid JWT that can be verified', async () => {
      const env = createMockEnv();
      const token = await createSessionToken(env, mockUser);

      expect(token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/); // JWT format

      const decoded = await verifySessionToken(env, token);
      expect(decoded).toEqual({
        userId: '12345',
        login: 'testuser',
        avatar: 'https://github.com/testuser.png',
      });
    });

    it('returns null for invalid signature', async () => {
      const env = createMockEnv();
      const token = await createSessionToken(env, mockUser);

      // Tamper with signature
      const parts = token.split('.');
      parts[2] = 'invalid-signature';
      const tamperedToken = parts.join('.');

      const result = await verifySessionToken(env, tamperedToken);
      expect(result).toBeNull();
    });

    it('returns null for expired token', async () => {
      const env = createMockEnv();

      // Create a token that's already expired by mocking Date.now
      const originalNow = Date.now;
      Date.now = vi.fn(() => originalNow() - 8 * 24 * 60 * 60 * 1000); // 8 days ago

      const token = await createSessionToken(env, mockUser);

      Date.now = originalNow; // Restore

      const result = await verifySessionToken(env, token);
      expect(result).toBeNull();
    });

    it('returns null for malformed token', async () => {
      const env = createMockEnv();

      expect(await verifySessionToken(env, 'not-a-jwt')).toBeNull();
      expect(await verifySessionToken(env, 'only.two')).toBeNull();
      expect(await verifySessionToken(env, '')).toBeNull();
    });
  });

  describe('getSessionFromRequest', () => {
    it('returns null when no cookie header', async () => {
      const env = createMockEnv();
      const request = new Request('https://skillsets.cc/api/star');

      const result = await getSessionFromRequest(env, request);
      expect(result).toBeNull();
    });

    it('returns null when no session cookie', async () => {
      const env = createMockEnv();
      const request = new Request('https://skillsets.cc/api/star', {
        headers: { Cookie: 'other=value' },
      });

      const result = await getSessionFromRequest(env, request);
      expect(result).toBeNull();
    });

    it('returns session data for valid token', async () => {
      const env = createMockEnv();
      const mockUser: GitHubUser = {
        id: 12345,
        login: 'testuser',
        avatar_url: 'https://github.com/testuser.png',
      };

      const token = await createSessionToken(env, mockUser);
      const request = new Request('https://skillsets.cc/api/star', {
        headers: { Cookie: `session=${token}` },
      });

      const result = await getSessionFromRequest(env, request);
      expect(result).toEqual({
        userId: '12345',
        login: 'testuser',
        avatar: 'https://github.com/testuser.png',
      });
    });
  });

  describe('cookie helpers', () => {
    it('createSessionCookie sets secure flags', () => {
      const cookie = createSessionCookie('test-token');

      expect(cookie).toContain('session=test-token');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain('Path=/');
    });

    it('createSessionCookie uses custom maxAge', () => {
      const cookie = createSessionCookie('test-token', 3600);
      expect(cookie).toContain('Max-Age=3600');
    });

    it('createLogoutCookie expires immediately', () => {
      const cookie = createLogoutCookie();

      expect(cookie).toContain('session=');
      expect(cookie).toContain('Max-Age=0');
    });
  });

  describe('AuthError', () => {
    it('includes status code', () => {
      const error = new AuthError('Test error', 401);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthError');
    });
  });
});
