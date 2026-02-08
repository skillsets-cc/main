import { describe, it, expect, vi } from 'vitest';
import { createMockEnv } from '../../../lib/__tests__/test-utils';

// Mock reservation-do module
vi.mock('@/lib/reservation-do', () => ({
  getReservationStub: vi.fn(),
}));

import { GET } from '../reservations/verify';
import { getReservationStub } from '@/lib/reservation-do';

const mockGetStub = getReservationStub as ReturnType<typeof vi.fn>;

function createAPIContext(request: Request, envOverrides = {}) {
  const env = createMockEnv(envOverrides);
  return {
    request,
    locals: { runtime: { env } },
    params: {},
    redirect: (url: string) => new Response(null, { status: 302, headers: { Location: url } }),
    url: new URL(request.url),
    site: new URL('https://skillsets.cc'),
    generator: 'test',
    props: {},
    cookies: {} as any,
    preferredLocale: undefined,
    preferredLocaleList: undefined,
    currentLocale: undefined,
    rewrite: vi.fn() as any,
    originPathname: '/',
    isPrerendered: false,
    getActionResult: vi.fn() as any,
    callAction: vi.fn() as any,
    routePattern: '',
    clientAddress: '127.0.0.1',
    ResponseWithEncoding: Response as any,
  } as any;
}

function createMockStub(response: { status: number; body: unknown }) {
  return {
    fetch: vi.fn().mockResolvedValue({
      status: response.status,
      json: async () => response.body,
    }),
  };
}

describe('GET /api/reservations/verify', () => {
  it('test_verify_valid', async () => {
    const stub = createMockStub({ status: 200, body: { valid: true, batchId: '5.10.001' } });
    mockGetStub.mockReturnValue(stub);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/verify?batchId=5.10.001&login=testuser')
    );
    const response = await GET(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(true);
    expect(data.batchId).toBe('5.10.001');
  });

  it('test_verify_invalid_batch_id', async () => {
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/verify?batchId=bad')
    );
    const response = await GET(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(false);
    expect(data.reason).toBe('invalid_batch_id');
  });

  it('test_verify_missing_batch_id', async () => {
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/verify')
    );
    const response = await GET(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(false);
    expect(data.reason).toBe('invalid_batch_id');
  });

  it('test_verify_rate_limited', async () => {
    // Pre-fill rate limit counter
    const env = createMockEnv();
    const hour = Math.floor(Date.now() / 3_600_000);
    const key = `ratelimit:verify:127.0.0.1:${hour}`;
    (env.DATA as any)._store.set(key, '30');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/verify?batchId=5.10.001')
    );
    ctx.locals.runtime.env = env;

    const response = await GET(ctx);
    expect(response.status).toBe(429);
  });

  it('test_verify_forwards_params', async () => {
    const stub = createMockStub({ status: 200, body: { valid: true } });
    mockGetStub.mockReturnValue(stub);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/verify?batchId=5.10.001&login=testuser&userId=123')
    );
    await GET(ctx);

    expect(stub.fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('batchId=5.10.001'),
      })
    );
    const callArg = (stub.fetch as any).mock.calls[0][0];
    const url = new URL(callArg.url);
    expect(url.searchParams.get('batchId')).toBe('5.10.001');
    expect(url.searchParams.get('login')).toBe('testuser');
    expect(url.searchParams.get('userId')).toBe('123');
  });
});
