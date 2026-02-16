import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAPIContext, createMockKV } from '../../../lib/tests_lib/test-utils';
import { GET } from '../stats/counts';

describe('GET /api/stats/counts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('test_returns_star_and_download_counts', async () => {
    const mockKV = createMockKV();
    mockKV._store.set('stars:test/skillset', '5');
    mockKV._store.set('stars:other/skillset', '12');
    mockKV._store.set('downloads:test/skillset', '100');

    mockKV.list = vi.fn().mockImplementation(async (opts: { prefix: string }) => {
      const keys = Array.from(mockKV._store.keys())
        .filter(k => k.startsWith(opts.prefix))
        .map(name => ({ name }));
      return { keys };
    });

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/stats/counts'),
      { DATA: mockKV }
    );
    const response = await GET(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stars['test/skillset']).toBe(5);
    expect(data.stars['other/skillset']).toBe(12);
    expect(data.downloads['test/skillset']).toBe(100);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
  });

  it('test_returns_empty_when_no_data', async () => {
    const mockKV = createMockKV();
    mockKV.list = vi.fn().mockResolvedValue({ keys: [] });

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/stats/counts'),
      { DATA: mockKV }
    );
    const response = await GET(ctx);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stars).toEqual({});
    expect(data.downloads).toEqual({});
  });

  it('test_returns_500_on_kv_error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockKV = createMockKV();
    mockKV.list = vi.fn().mockRejectedValue(new Error('KV down'));

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/stats/counts'),
      { DATA: mockKV }
    );
    const response = await GET(ctx);

    expect(response.status).toBe(500);
  });
});
