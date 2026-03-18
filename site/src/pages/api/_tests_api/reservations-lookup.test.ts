import { describe, it, expect, vi } from 'vitest';
import { createMockEnv, createAPIContext, createMockStub } from '@/lib/tests_lib/test-utils';

vi.mock('@/lib/reservation-do', () => ({
  getReservationStub: vi.fn(),
}));

import { GET } from '../reservations/lookup';
import { getReservationStub } from '@/lib/reservation-do';

const mockGetStub = getReservationStub as ReturnType<typeof vi.fn>;

describe('GET /api/reservations/lookup', () => {
  it('test_lookup_found', async () => {
    const stub = createMockStub({ status: 200, body: { batchId: '5.10.001' } });
    mockGetStub.mockReturnValue(stub);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/lookup?githubId=123')
    );
    const response = await GET(ctx);
    const data = await response.json() as any;

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
    const data = await response.json() as any;

    expect(response.status).toBe(200);
    expect(data.batchId).toBeNull();
  });

  it('test_lookup_missing_param', async () => {
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/lookup')
    );
    const response = await GET(ctx);
    const data = await response.json() as any;

    expect(response.status).toBe(200);
    expect(data.batchId).toBeNull();
    // Should not forward to DO when githubId is missing
  });

  it('test_lookup_rate_limited', async () => {
    // Pre-fill rate limit counter
    const env = createMockEnv();
    const day = Math.floor(Date.now() / 86_400_000);
    const key = `ratelimit:lookup:127.0.0.1:${day}`;
    (env.DATA as any)._store.set(key, '720');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/lookup?githubId=123')
    );
    ctx.locals.runtime.env = env;

    const response = await GET(ctx);
    expect(response.status).toBe(429);
  });
});
