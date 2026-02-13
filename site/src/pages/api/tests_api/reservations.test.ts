import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockKV, createMockEnv, createAPIContext, createMockStub } from '../../../lib/tests_lib/test-utils';

vi.mock('@/lib/auth', () => ({
  getSessionFromRequest: vi.fn(),
}));

vi.mock('@/lib/reservation-do', () => ({
  getReservationStub: vi.fn(),
}));

import { GET, POST, DELETE, isReservationRateLimited } from '../reservations';
import { getSessionFromRequest } from '@/lib/auth';
import { getReservationStub } from '@/lib/reservation-do';

const mockGetSession = getSessionFromRequest as ReturnType<typeof vi.fn>;
const mockGetStub = getReservationStub as ReturnType<typeof vi.fn>;

describe('GET /api/reservations', () => {
  it('test_get_unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const stubResponse = { slots: {}, totalGhostSlots: 24, cohort: 1, userSlot: null };
    const stub = createMockStub({ status: 200, body: stubResponse });
    mockGetStub.mockReturnValue(stub);

    const ctx = createAPIContext(new Request('https://skillsets.cc/api/reservations'));
    const response = await GET(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=10');
    expect(data.userSlot).toBeNull();
  });

  it('test_get_authenticated', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'test', avatar: '' });
    const stubResponse = { slots: {}, totalGhostSlots: 24, cohort: 1, userSlot: '5.10.001' };
    const stub = createMockStub({ status: 200, body: stubResponse });
    mockGetStub.mockReturnValue(stub);

    const ctx = createAPIContext(new Request('https://skillsets.cc/api/reservations'));
    const response = await GET(ctx);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, max-age=10');
  });
});

describe('POST /api/reservations', () => {
  it('test_post_unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations', {
        method: 'POST',
        body: JSON.stringify({ slotId: '1.10.001' }),
      })
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Authentication required');
  });

  it('test_post_valid_reserve', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'test', avatar: '' });
    const stubResponse = { slotId: '1.10.001', expiresAt: 1738900000 };
    const stub = createMockStub({ status: 201, body: stubResponse });
    mockGetStub.mockReturnValue(stub);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations', {
        method: 'POST',
        body: JSON.stringify({ slotId: '1.10.001' }),
      })
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.slotId).toBe('1.10.001');
    // Verify DO stub receives githubLogin
    expect(stub.fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
      })
    );
    const callArg = (stub.fetch as any).mock.calls[0][0];
    const bodyText = await callArg.text();
    const bodyData = JSON.parse(bodyText);
    expect(bodyData.githubLogin).toBe('test');
  });

  it('test_post_invalid_slot_id', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'test', avatar: '' });

    // Test old ghost-N format (should now be invalid)
    const ctx1 = createAPIContext(
      new Request('https://skillsets.cc/api/reservations', {
        method: 'POST',
        body: JSON.stringify({ slotId: 'ghost-1' }),
      })
    );
    const response1 = await POST(ctx1);
    const data1 = await response1.json();
    expect(response1.status).toBe(400);
    expect(data1.error).toBe('Invalid slot ID');

    // Test other invalid format
    const ctx2 = createAPIContext(
      new Request('https://skillsets.cc/api/reservations', {
        method: 'POST',
        body: JSON.stringify({ slotId: 'invalid' }),
      })
    );
    const response2 = await POST(ctx2);
    const data2 = await response2.json();
    expect(response2.status).toBe(400);
    expect(data2.error).toBe('Invalid slot ID');
  });

  it('test_post_missing_slot_id', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'test', avatar: '' });

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    );
    const response = await POST(ctx);
    expect(response.status).toBe(400);
  });

  it('test_post_rate_limited', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'test', avatar: '' });

    // Pre-fill rate limit counter
    const env = createMockEnv();
    const hour = Math.floor(Date.now() / 3_600_000);
    const key = `ratelimit:reserve:123:${hour}`;
    (env.DATA as any)._store.set(key, '5');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations', {
        method: 'POST',
        body: JSON.stringify({ slotId: '1.10.001' }),
      }),
    );
    // Override env with pre-filled rate limit
    ctx.locals.runtime.env = env;

    const response = await POST(ctx);
    expect(response.status).toBe(429);
  });

  it('test_do_error_passthrough', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'test', avatar: '' });
    const stub = createMockStub({ status: 409, body: { error: 'slot_taken' } });
    mockGetStub.mockReturnValue(stub);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations', {
        method: 'POST',
        body: JSON.stringify({ slotId: '1.10.001' }),
      })
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('slot_taken');
  });
});

describe('DELETE /api/reservations', () => {
  it('test_delete_unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations', { method: 'DELETE' })
    );
    const response = await DELETE(ctx);
    expect(response.status).toBe(401);
  });

  it('test_delete_valid_release', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'test', avatar: '' });
    const stub = createMockStub({ status: 200, body: { released: '3.10.001' } });
    mockGetStub.mockReturnValue(stub);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations', { method: 'DELETE' })
    );
    const response = await DELETE(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.released).toBe('3.10.001');
  });

  it('test_delete_rate_limited', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'test', avatar: '' });

    const env = createMockEnv();
    const hour = Math.floor(Date.now() / 3_600_000);
    (env.DATA as any)._store.set(`ratelimit:reserve:123:${hour}`, '5');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations', { method: 'DELETE' })
    );
    ctx.locals.runtime.env = env;

    const response = await DELETE(ctx);
    expect(response.status).toBe(429);
  });
});

describe('isReservationRateLimited', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-06T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('test_allows_first_five', async () => {
    const kv = createMockKV();
    for (let i = 0; i < 5; i++) {
      const result = await isReservationRateLimited(kv, 'user-1');
      expect(result).toBe(false);
    }
  });

  it('test_blocks_sixth', async () => {
    const kv = createMockKV();
    for (let i = 0; i < 5; i++) {
      await isReservationRateLimited(kv, 'user-1');
    }
    const result = await isReservationRateLimited(kv, 'user-1');
    expect(result).toBe(true);
  });

  it('test_different_users_independent', async () => {
    const kv = createMockKV();
    for (let i = 0; i < 5; i++) {
      await isReservationRateLimited(kv, 'user-a');
    }
    const result = await isReservationRateLimited(kv, 'user-b');
    expect(result).toBe(false);
  });

  it('test_ttl_set_correctly', async () => {
    const kv = createMockKV();
    await isReservationRateLimited(kv, 'user-1');
    expect(kv.put).toHaveBeenCalledWith(
      expect.stringContaining('ratelimit:reserve:user-1:'),
      '1',
      { expirationTtl: 7200 }
    );
  });
});
