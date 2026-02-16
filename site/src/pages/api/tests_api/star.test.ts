import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAPIContext, createMockKV } from '../../../lib/tests_lib/test-utils';

vi.mock('@/lib/auth', () => ({
  getSessionFromRequest: vi.fn(),
}));

import { GET, POST } from '../star';
import { getSessionFromRequest } from '@/lib/auth';

const mockGetSession = getSessionFromRequest as ReturnType<typeof vi.fn>;

describe('GET /api/star', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('test_returns_count_and_starred_false_for_anonymous', async () => {
    mockGetSession.mockResolvedValue(null);
    const mockKV = createMockKV();
    mockKV._store.set('stars:test/skillset', '7');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/star?skillsetId=test/skillset'),
      { DATA: mockKV }
    );
    const response = await GET(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      skillsetId: 'test/skillset',
      count: 7,
      starred: false,
      authenticated: false,
    });
  });

  it('test_returns_starred_true_for_authenticated_user', async () => {
    mockGetSession.mockResolvedValue({ userId: '42', login: 'tester', avatar: '' });
    const mockKV = createMockKV();
    mockKV._store.set('stars:test/skillset', '3');
    mockKV._store.set('user:42:stars', '["test/skillset"]');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/star?skillsetId=test/skillset'),
      { DATA: mockKV }
    );
    const response = await GET(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.starred).toBe(true);
    expect(data.authenticated).toBe(true);
  });

  it('test_returns_400_when_missing_skillsetId', async () => {
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/star')
    );
    const response = await GET(ctx);

    expect(response.status).toBe(400);
  });

  it('test_returns_400_for_invalid_skillsetId', async () => {
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/star?skillsetId=../../etc/passwd')
    );
    const response = await GET(ctx);

    expect(response.status).toBe(400);
  });
});

describe('POST /api/star', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('test_returns_401_when_not_authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/star', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillsetId: 'test/skillset' }),
      })
    );
    const response = await POST(ctx);

    expect(response.status).toBe(401);
  });

  it('test_toggles_star_for_authenticated_user', async () => {
    mockGetSession.mockResolvedValue({ userId: '42', login: 'tester', avatar: '' });
    const mockKV = createMockKV();

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/star', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillsetId: 'test/skillset' }),
      }),
      { DATA: mockKV }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.starred).toBe(true);
    expect(data.count).toBe(1);
  });

  it('test_returns_429_when_rate_limited', async () => {
    mockGetSession.mockResolvedValue({ userId: '42', login: 'tester', avatar: '' });
    const mockKV = createMockKV();
    const minute = Math.floor(Date.now() / 60_000);
    mockKV._store.set(`ratelimit:star:42:${minute}`, '10');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/star', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillsetId: 'test/skillset' }),
      }),
      { DATA: mockKV }
    );
    const response = await POST(ctx);

    expect(response.status).toBe(429);
  });

  it('test_returns_400_for_missing_skillsetId', async () => {
    mockGetSession.mockResolvedValue({ userId: '42', login: 'tester', avatar: '' });
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/star', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    const response = await POST(ctx);

    expect(response.status).toBe(400);
  });

  it('test_returns_400_for_invalid_skillsetId', async () => {
    mockGetSession.mockResolvedValue({ userId: '42', login: 'tester', avatar: '' });
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/star', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillsetId: '../../etc/passwd' }),
      })
    );
    const response = await POST(ctx);

    expect(response.status).toBe(400);
  });

  it('test_returns_400_for_invalid_json', async () => {
    mockGetSession.mockResolvedValue({ userId: '42', login: 'tester', avatar: '' });
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/star', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      })
    );
    const response = await POST(ctx);

    expect(response.status).toBe(400);
  });
});
