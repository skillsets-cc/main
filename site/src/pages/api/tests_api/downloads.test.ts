import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAPIContext, createMockKV } from '../../../lib/tests_lib/test-utils';
import { GET } from '../downloads';

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
