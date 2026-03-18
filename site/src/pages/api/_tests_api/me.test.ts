import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAPIContext, createMockKV } from '@/lib/tests_lib/test-utils';
import type { Env } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({
  getSessionFromRequest: vi.fn(),
  getTokenFromRequest: vi.fn(),
  revokeSessionToken: vi.fn(),
  createLogoutCookie: vi.fn(() => 'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'),
}));

import { GET, DELETE } from '../me';
import { getSessionFromRequest, getTokenFromRequest, revokeSessionToken } from '@/lib/auth';

const mockGetSession = vi.mocked(getSessionFromRequest);
const mockGetToken = vi.mocked(getTokenFromRequest);
const mockRevokeSession = vi.mocked(revokeSessionToken);

describe('GET /api/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    const mockKV = createMockKV();
    mockKV._store.set('user:123:stars', JSON.stringify(['@user/a']));

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/me', {
        method: 'DELETE',
        headers: { Cookie: 'session=valid-token' },
      }),
      { DATA: mockKV }
    );
    const response = await DELETE(ctx);
    const data = await response.json() as any;

    expect(response.status).toBe(200);
    expect(data).toEqual({ deleted: true });
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

  it('test_DELETE_1_per_day_limit', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'testuser', avatar: '' });
    const mockKV = createMockKV();
    const day = Math.floor(Date.now() / 86_400_000);
    mockKV._store.set(`ratelimit:delete:123:${day}`, '1');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/me', { method: 'DELETE' }),
      { DATA: mockKV }
    );
    const response = await DELETE(ctx);
    expect(response.status).toBe(429);
  });

  it('test_DELETE_immediate_freeze_on_breach', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'testuser', avatar: '' });
    const mockKV = createMockKV();
    const day = Math.floor(Date.now() / 86_400_000);
    mockKV._store.set(`ratelimit:delete:123:${day}`, '1');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/me', { method: 'DELETE' }),
      { DATA: mockKV }
    );
    await DELETE(ctx);

    expect(mockKV._store.get('freeze:delete:123')).toBe('1');
  });

  it('test_DELETE_skips_freeze_gate', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'testuser', avatar: '' });
    mockGetToken.mockReturnValue('valid-token');
    const mockKV = createMockKV();
    // Pre-set freeze flag — should NOT block deletion
    mockKV._store.set('freeze:delete:123', '1');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/me', { method: 'DELETE' }),
      { DATA: mockKV }
    );
    const response = await DELETE(ctx);
    expect(response.status).toBe(200);
  });

  it('test_DELETE_purges_breach_trackers', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'testuser', avatar: '' });
    mockGetToken.mockReturnValue('valid-token');
    const mockKV = createMockKV();
    mockKV._store.set('breaches:star:123', JSON.stringify({ count: 2, lastBucket: 1 }));
    mockKV._store.set('breaches:reserve:123', JSON.stringify({ count: 1, lastBucket: 1 }));
    mockKV._store.set('breaches:delete:123', JSON.stringify({ count: 1, lastBucket: 1 }));

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/me', { method: 'DELETE' }),
      { DATA: mockKV }
    );
    await DELETE(ctx);

    expect(mockKV._store.has('breaches:star:123')).toBe(false);
    expect(mockKV._store.has('breaches:reserve:123')).toBe(false);
    expect(mockKV._store.has('breaches:delete:123')).toBe(false);
  });

  it('test_DELETE_purges_daily_counters', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'testuser', avatar: '' });
    mockGetToken.mockReturnValue('valid-token');
    const mockKV = createMockKV();
    const day = Math.floor(Date.now() / 86_400_000);
    mockKV._store.set(`ratelimit:star:123:${day}`, '3');
    mockKV._store.set(`ratelimit:reserve:123:${day}`, '1');
    mockKV._store.set(`ratelimit:delete:123:${day}`, '0');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/me', { method: 'DELETE' }),
      { DATA: mockKV }
    );
    await DELETE(ctx);

    expect(mockKV._store.has(`ratelimit:star:123:${day}`)).toBe(false);
    expect(mockKV._store.has(`ratelimit:reserve:123:${day}`)).toBe(false);
    expect(mockKV._store.has(`ratelimit:delete:123:${day}`)).toBe(false);
  });

  it('test_DELETE_preserves_freeze_flags', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'testuser', avatar: '' });
    mockGetToken.mockReturnValue('valid-token');
    const mockKV = createMockKV();
    mockKV._store.set('freeze:star:123', '1');
    mockKV._store.set('freeze:reserve:123', '1');
    mockKV._store.set('freeze:delete:123', '1');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/me', { method: 'DELETE' }),
      { DATA: mockKV }
    );
    await DELETE(ctx);

    expect(mockKV._store.get('freeze:star:123')).toBe('1');
    expect(mockKV._store.get('freeze:reserve:123')).toBe('1');
    expect(mockKV._store.get('freeze:delete:123')).toBe('1');
  });

  it('test_DELETE_purges_stars', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'testuser', avatar: '' });
    mockGetToken.mockReturnValue('valid-token');
    const mockKV = createMockKV();
    mockKV._store.set('user:123:stars', JSON.stringify(['@a/b']));

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/me', { method: 'DELETE' }),
      { DATA: mockKV }
    );
    await DELETE(ctx);

    expect(mockKV._store.has('user:123:stars')).toBe(false);
  });

  it('test_DELETE_fail_open_on_kv_error', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'testuser', avatar: '' });
    mockGetToken.mockReturnValue('valid-token');
    const mockKV = createMockKV();
    // Make KV get throw to simulate error in checkDailyLimit
    vi.mocked(mockKV.get).mockRejectedValueOnce(new Error('KV unavailable'));

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/me', { method: 'DELETE' }),
      { DATA: mockKV }
    );
    const response = await DELETE(ctx);
    // Should allow through despite KV error
    expect(response.status).toBe(200);
  });
});
