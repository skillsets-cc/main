import { describe, it, expect, vi } from 'vitest';
import { createMockEnv } from '../../../lib/__tests__/test-utils';

// Mock auth module
vi.mock('@/lib/auth', () => ({
  getSessionFromRequest: vi.fn(),
}));

// Mock reservation-do module
vi.mock('@/lib/reservation-do', () => ({
  getReservationStub: vi.fn(),
}));

import { POST } from '../reservations/submit';
import { getSessionFromRequest } from '@/lib/auth';
import { getReservationStub } from '@/lib/reservation-do';

const mockGetSession = getSessionFromRequest as ReturnType<typeof vi.fn>;
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

describe('POST /api/reservations/submit', () => {
  it('test_submit_unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/submit', {
        method: 'POST',
        body: JSON.stringify({ batchId: '5.10.001', skillsetId: '@user/Skill' }),
      })
    );
    const response = await POST(ctx);
    expect(response.status).toBe(401);
  });

  it('test_submit_not_maintainer', async () => {
    mockGetSession.mockResolvedValue({ userId: '999', login: 'test', avatar: '' });

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/submit', {
        method: 'POST',
        body: JSON.stringify({ batchId: '5.10.001', skillsetId: '@user/Skill' }),
      }),
      { MAINTAINER_USER_IDS: '123' }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('test_submit_valid', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'admin', avatar: '' });
    const stub = createMockStub({
      status: 200,
      body: { batchId: '5.10.001', status: 'submitted', skillsetId: '@user/Skill' },
    });
    mockGetStub.mockReturnValue(stub);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/submit', {
        method: 'POST',
        body: JSON.stringify({ batchId: '5.10.001', skillsetId: '@user/Skill' }),
      }),
      { MAINTAINER_USER_IDS: '123' }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.batchId).toBe('5.10.001');
    expect(data.status).toBe('submitted');
    expect(data.skillsetId).toBe('@user/Skill');
  });

  it('test_submit_do_404', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'admin', avatar: '' });
    const stub = createMockStub({ status: 404, body: { error: 'not_reserved' } });
    mockGetStub.mockReturnValue(stub);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/submit', {
        method: 'POST',
        body: JSON.stringify({ batchId: '5.10.001', skillsetId: '@user/Skill' }),
      }),
      { MAINTAINER_USER_IDS: '123' }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('not_reserved');
  });

  it('test_submit_do_409', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'admin', avatar: '' });
    const stub = createMockStub({ status: 409, body: { error: 'already_submitted' } });
    mockGetStub.mockReturnValue(stub);

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/submit', {
        method: 'POST',
        body: JSON.stringify({ batchId: '5.10.001', skillsetId: '@user/Skill' }),
      }),
      { MAINTAINER_USER_IDS: '123' }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('already_submitted');
  });

  it('test_submit_invalid_json', async () => {
    mockGetSession.mockResolvedValue({ userId: '123', login: 'admin', avatar: '' });

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/reservations/submit', {
        method: 'POST',
        body: 'not json',
        headers: { 'Content-Type': 'text/plain' },
      }),
      { MAINTAINER_USER_IDS: '123' }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid JSON body');
  });
});
