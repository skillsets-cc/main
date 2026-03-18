import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAPIContext, createMockKV } from '@/lib/tests_lib/test-utils';
import { hashIp } from '@/lib/rate-limit';

import { GET, POST } from '../downloads/start';

describe('GET /api/downloads/start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('test_returns_count_for_valid_skillset', async () => {
    const mockKV = createMockKV();
    mockKV._store.set('downloads:test/skillset', '42');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads/start?skillsetId=test/skillset'),
      { DATA: mockKV }
    );
    const response = await GET(ctx);
    const data = await response.json() as any;

    expect(response.status).toBe(200);
    expect(data).toEqual({ skillsetId: 'test/skillset', count: 42 });
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
  });

  it('test_returns_0_for_new_skillset', async () => {
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads/start?skillsetId=new/skillset')
    );
    const response = await GET(ctx);
    const data = await response.json() as any;

    expect(response.status).toBe(200);
    expect(data).toEqual({ skillsetId: 'new/skillset', count: 0 });
  });

  it('test_returns_400_when_missing_skillsetId', async () => {
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads/start')
    );
    const response = await GET(ctx);
    expect(response.status).toBe(400);
  });

  it('test_returns_400_for_invalid_skillsetId', async () => {
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads/start?skillsetId=../../etc/passwd')
    );
    const response = await GET(ctx);
    expect(response.status).toBe(400);
  });
});

describe('POST /api/downloads/start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('test_POST_returns_nonce_on_success', async () => {
    const mockKV = createMockKV();

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillset: 'test/skillset' }),
      }),
      { DATA: mockKV }
    );
    const response = await POST(ctx);
    const data = await response.json() as any;

    expect(response.status).toBe(200);
    expect(typeof data.nonce).toBe('string');
    expect(data.nonce).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('test_POST_returns_403_when_ip_frozen', async () => {
    const mockKV = createMockKV();
    const ipHash = await hashIp('127.0.0.1');
    mockKV._store.set(`freeze:dl:${ipHash}`, '1');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillset: 'test/skillset' }),
      }),
      { DATA: mockKV }
    );
    const response = await POST(ctx);
    const data = await response.json() as any;

    expect(response.status).toBe(403);
    expect(data.frozen).toBe(true);
  });

  it('test_POST_returns_429_when_daily_limit_exceeded', async () => {
    const mockKV = createMockKV();
    const ipHash = await hashIp('127.0.0.1');
    const day = Math.floor(Date.now() / 86_400_000);
    mockKV._store.set(`ratelimit:dl:${ipHash}:${day}`, '5');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillset: 'test/skillset' }),
      }),
      { DATA: mockKV }
    );
    const response = await POST(ctx);

    expect(response.status).toBe(429);
  });

  it('test_POST_validates_skillset_format', async () => {
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillset: '../../etc/passwd' }),
      })
    );
    const response = await POST(ctx);
    expect(response.status).toBe(400);
  });

  it('test_POST_rejects_missing_skillset', async () => {
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    const response = await POST(ctx);
    expect(response.status).toBe(400);
  });

  it('test_POST_uses_hashed_ip_for_rate_limit', async () => {
    const mockKV = createMockKV();
    const ipHash = await hashIp('127.0.0.1');
    const day = Math.floor(Date.now() / 86_400_000);
    // Pre-set limit with hashed IP key (not raw IP)
    mockKV._store.set(`ratelimit:dl:${ipHash}:${day}`, '5');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillset: 'test/skillset' }),
      }),
      { DATA: mockKV }
    );
    const response = await POST(ctx);

    // Rate limit hit via hashed IP key → 429 (not raw IP key)
    expect(response.status).toBe(429);
  });
});
