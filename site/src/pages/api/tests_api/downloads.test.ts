import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAPIContext, createMockKV } from '../../../lib/tests_lib/test-utils';
import { GET, POST } from '../downloads';

describe('GET /api/downloads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('test_returns_count_for_valid_skillset', async () => {
    const mockKV = createMockKV();
    mockKV._store.set('downloads:test/skillset', '42');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads?skillsetId=test/skillset'),
      { DATA: mockKV }
    );
    const response = await GET(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ skillsetId: 'test/skillset', count: 42 });
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
  });

  it('test_returns_0_for_new_skillset', async () => {
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads?skillsetId=new/skillset')
    );
    const response = await GET(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ skillsetId: 'new/skillset', count: 0 });
  });

  it('test_returns_400_when_missing_skillsetId', async () => {
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads')
    );
    const response = await GET(ctx);

    expect(response.status).toBe(400);
  });

  it('test_returns_400_for_invalid_skillsetId', async () => {
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads?skillsetId=../../etc/passwd')
    );
    const response = await GET(ctx);

    expect(response.status).toBe(400);
  });
});

describe('POST /api/downloads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('test_increments_download_count', async () => {
    const mockKV = createMockKV();
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillset: 'test/skillset' }),
      }),
      { DATA: mockKV }
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.skillset).toBe('test/skillset');
    expect(data.count).toBe(1);
  });

  it('test_returns_429_when_rate_limited', async () => {
    const mockKV = createMockKV();
    const hour = Math.floor(Date.now() / 3600000);
    mockKV._store.set(`ratelimit:dl:1.2.3.4:${hour}`, '30');

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '1.2.3.4',
        },
        body: JSON.stringify({ skillset: 'test/skillset' }),
      }),
      { DATA: mockKV }
    );
    const response = await POST(ctx);

    expect(response.status).toBe(429);
  });

  it('test_returns_400_for_invalid_json', async () => {
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      })
    );
    const response = await POST(ctx);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid JSON body');
  });

  it('test_returns_400_when_missing_skillset', async () => {
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    const response = await POST(ctx);

    expect(response.status).toBe(400);
  });

  it('test_returns_400_for_invalid_skillset_format', async () => {
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillset: '../../etc/passwd' }),
      })
    );
    const response = await POST(ctx);

    expect(response.status).toBe(400);
  });
});
