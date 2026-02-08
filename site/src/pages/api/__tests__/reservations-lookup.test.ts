import { describe, it, expect, vi } from 'vitest';
import { createMockEnv } from '../../../lib/__tests__/test-utils';

// Mock reservation-do module
vi.mock('@/lib/reservation-do', () => ({
  getReservationStub: vi.fn(),
}));

import { GET } from '../reservations/lookup';
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

describe('GET /api/reservations/lookup', () => {
  it('test_lookup_found', async () => {
    const stub = createMockStub({ status: 200, body: { batchId: '5.10.001' } });
    mockGetStub.mockReturnValue(stub);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/lookup?githubId=123')
    );
    const response = await GET(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.batchId).toBe('5.10.001');
  });

  it('test_lookup_not_found', async () => {
    const stub = createMockStub({ status: 200, body: { batchId: null } });
    mockGetStub.mockReturnValue(stub);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/lookup?githubId=999')
    );
    const response = await GET(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.batchId).toBeNull();
  });

  it('test_lookup_missing_param', async () => {
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/lookup')
    );
    const response = await GET(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.batchId).toBeNull();
    // Should not forward to DO when githubId is missing
  });

  it('test_lookup_rate_limited', async () => {
    // Pre-fill rate limit counter
    const env = createMockEnv();
    const hour = Math.floor(Date.now() / 3_600_000);
    const key = `ratelimit:lookup:127.0.0.1:${hour}`;
    (env.DATA as any)._store.set(key, '30');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/lookup?githubId=123')
    );
    ctx.locals.runtime.env = env;

    const response = await GET(ctx);
    expect(response.status).toBe(429);
  });
});
