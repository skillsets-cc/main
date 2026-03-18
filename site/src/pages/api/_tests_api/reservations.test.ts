import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockKV, createMockEnv, createAPIContext, createMockStub } from '@/lib/tests_lib/test-utils';

vi.mock('@/lib/auth', () => ({
  getSessionFromRequest: vi.fn(),
}));

vi.mock('@/lib/reservation-do', () => ({
  getReservationStub: vi.fn(),
  BATCH_ID_REGEX: /^\d{1,3}\.\d{1,3}\.\d{3}$/,
}));

import { GET, POST, DELETE } from '../reservations';
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
    const data = await response.json() as any;

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('test_post_unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations', {
        method: 'POST',
        body: JSON.stringify({ batchId: '1.10.001' }),
      })
    );
    const response = await POST(ctx);
    const data = await response.json() as any;

    expect(response.status).toBe(401);
    expect(data.error).toBe('Authentication required');
  });

  it('test_post_valid_reserve', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'test', avatar: '' });
    const stubResponse = { batchId: '1.10.001', expiresAt: 1738900000 };
    const stub = createMockStub({ status: 201, body: stubResponse });
    mockGetStub.mockReturnValue(stub);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations', {
        method: 'POST',
        body: JSON.stringify({ batchId: '1.10.001' }),
      })
    );
    const response = await POST(ctx);
    const data = await response.json() as any;

    expect(response.status).toBe(201);
    expect(data.batchId).toBe('1.10.001');
    const callArg = (stub.fetch as any).mock.calls[0][0];
    const bodyText = await callArg.text();
    const bodyData = JSON.parse(bodyText);
    expect(bodyData.githubLogin).toBe('test');
  });

  it('test_post_invalid_slot_id', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'test', avatar: '' });

    const ctx1 = createAPIContext(
      new Request('https://skillsets.cc/api/reservations', {
        method: 'POST',
        body: JSON.stringify({ batchId: 'ghost-1' }),
      })
    );
    const response1 = await POST(ctx1);
    const data1 = await response1.json() as any;
    expect(response1.status).toBe(400);
    expect(data1.error).toBe('Invalid slot ID');

    const ctx2 = createAPIContext(
      new Request('https://skillsets.cc/api/reservations', {
        method: 'POST',
        body: JSON.stringify({ batchId: 'invalid' }),
      })
    );
    const response2 = await POST(ctx2);
    const data2 = await response2.json() as any;
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

  it('test_POST_returns_403_when_frozen', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'test', avatar: '' });
    const env = createMockEnv();
    (env.DATA as any)._store.set('freeze:reserve:123', '1');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations', {
        method: 'POST',
        body: JSON.stringify({ batchId: '1.10.001' }),
      }),
    );
    ctx.locals.runtime.env = env;

    const response = await POST(ctx);
    const data = await response.json() as any;
    expect(response.status).toBe(403);
    expect(data.frozen).toBe(true);
  });

  it('test_POST_returns_429_on_third_request', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'test', avatar: '' });
    const env = createMockEnv();
    const day = Math.floor(Date.now() / 86_400_000);
    (env.DATA as any)._store.set(`ratelimit:reserve:123:${day}`, '2');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations', {
        method: 'POST',
        body: JSON.stringify({ batchId: '1.10.001' }),
      }),
    );
    ctx.locals.runtime.env = env;

    const response = await POST(ctx);
    // threshold=0 means immediate freeze on breach → 403
    expect([429, 403]).toContain(response.status);
  });

  it('test_POST_warning_on_second_request', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'test', avatar: '' });
    const stubResponse = { batchId: '1.10.001', expiresAt: 1738900000 };
    const stub = createMockStub({ status: 201, body: stubResponse });
    mockGetStub.mockReturnValue(stub);

    const env = createMockEnv();
    const day = Math.floor(Date.now() / 86_400_000);
    // Counter at 1 — next request (count=2) hits limit and gets warning
    (env.DATA as any)._store.set(`ratelimit:reserve:123:${day}`, '1');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations', {
        method: 'POST',
        body: JSON.stringify({ batchId: '1.10.001' }),
      }),
    );
    ctx.locals.runtime.env = env;

    const response = await POST(ctx);
    const data = await response.json() as any;

    expect(response.status).toBe(201);
    expect(data.warning).toBe('You have reached your daily reservation limit (2/day). Any further attempt today will result in a permanent suspension.');
  });

  it('test_do_error_passthrough', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'test', avatar: '' });
    const stub = createMockStub({ status: 409, body: { error: 'slot_taken' } });
    mockGetStub.mockReturnValue(stub);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations', {
        method: 'POST',
        body: JSON.stringify({ batchId: '1.10.001' }),
      })
    );
    const response = await POST(ctx);
    const data = await response.json() as any;

    expect(response.status).toBe(409);
    expect(data.error).toBe('slot_taken');
  });
});

describe('DELETE /api/reservations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    const data = await response.json() as any;

    expect(response.status).toBe(200);
    expect(data.released).toBe('3.10.001');
  });

  it('test_DELETE_also_rate_limited', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'test', avatar: '' });
    const env = createMockEnv();
    const day = Math.floor(Date.now() / 86_400_000);
    (env.DATA as any)._store.set(`ratelimit:reserve:123:${day}`, '2');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations', { method: 'DELETE' })
    );
    ctx.locals.runtime.env = env;

    const response = await DELETE(ctx);
    expect([429, 403]).toContain(response.status);
  });
});
