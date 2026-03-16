import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAPIContext } from '@/lib/tests_lib/test-utils';
import type { Env } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({
  getSessionFromRequest: vi.fn(),
  getTokenFromRequest: vi.fn(),
  revokeSessionToken: vi.fn(),
  createLogoutCookie: vi.fn(() => 'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'),
}));

vi.mock('@/lib/rate-limit', () => ({
  isHourlyRateLimited: vi.fn(),
}));

import { GET, DELETE } from '../me';
import { getSessionFromRequest, getTokenFromRequest, revokeSessionToken } from '@/lib/auth';
import { isHourlyRateLimited } from '@/lib/rate-limit';

const mockGetSession = vi.mocked(getSessionFromRequest);
const mockGetToken = vi.mocked(getTokenFromRequest);
const mockRevokeSession = vi.mocked(revokeSessionToken);
const mockIsHourlyRateLimited = vi.mocked(isHourlyRateLimited);

describe('GET /api/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsHourlyRateLimited.mockResolvedValue(false);
  });

  it('test_returns_401_when_no_session', async () => {
    mockGetSession.mockResolvedValue(null);
    const ctx = createAPIContext(new Request('https://skillsets.cc/api/me'));
    const response = await GET(ctx);
    const data = await response.json() as any;

    expect(response.status).toBe(401);
    expect(data.error).toBe('Authentication required');
  });

  it('test_returns_401_when_jwt_invalid', async () => {
    mockGetSession.mockResolvedValue(null);
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/me', {
        headers: { Cookie: 'session=invalid-token' },
      })
    );
    const response = await GET(ctx);

    expect(response.status).toBe(401);
  });

  it('test_returns_login_and_stars_when_session_valid', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'testuser', avatar: '' });
    const ctx = createAPIContext(new Request('https://skillsets.cc/api/me'));
    const env = (ctx.locals as { runtime: { env: Env } }).runtime.env;
    (env.DATA as KVNamespace & { _store: Map<string, string> })._store.set(
      'user:123:stars',
      JSON.stringify(['@user/skillset-a'])
    );
    const response = await GET(ctx);
    const data = await response.json() as any;

    expect(response.status).toBe(200);
    expect(data).toEqual({ login: 'testuser', stars: ['@user/skillset-a'] });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('test_returns_empty_stars_when_none_starred', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'testuser', avatar: '' });
    const ctx = createAPIContext(new Request('https://skillsets.cc/api/me'));
    const response = await GET(ctx);
    const data = await response.json() as any;

    expect(data).toEqual({ login: 'testuser', stars: [] });
  });
});

describe('DELETE /api/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsHourlyRateLimited.mockResolvedValue(false);
  });

  it('test_returns_401_when_no_session', async () => {
    mockGetSession.mockResolvedValue(null);
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/me', { method: 'DELETE' })
    );
    const response = await DELETE(ctx);
    expect(response.status).toBe(401);
  });

  it('test_deletes_user_stars_and_revokes_session', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'testuser', avatar: '' });
    mockGetToken.mockReturnValue('valid-token');
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/me', {
        method: 'DELETE',
        headers: { Cookie: 'session=valid-token' },
      })
    );
    const env = (ctx.locals as { runtime: { env: Env } }).runtime.env;
    (env.DATA as KVNamespace & { _store: Map<string, string> })._store.set(
      'user:123:stars',
      JSON.stringify(['@user/a'])
    );

    const response = await DELETE(ctx);
    const data = await response.json() as any;

    expect(response.status).toBe(200);
    expect(data).toEqual({ deleted: true });
    expect(env.DATA.delete).toHaveBeenCalledWith('user:123:stars');
    expect(mockRevokeSession).toHaveBeenCalled();
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });

  it('test_succeeds_even_with_no_stars', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'testuser', avatar: '' });
    mockGetToken.mockReturnValue('valid-token');
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/me', { method: 'DELETE' })
    );
    const response = await DELETE(ctx);
    expect(response.status).toBe(200);
  });

  it('test_returns_429_when_rate_limited', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'testuser', avatar: '' });
    mockIsHourlyRateLimited.mockResolvedValue(true);
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/me', { method: 'DELETE' })
    );
    const response = await DELETE(ctx);
    expect(response.status).toBe(429);
  });
});
