import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAPIContext, createMockKV } from '@/lib/tests_lib/test-utils';
import { hashIp } from '@/lib/rate-limit';

import { POST } from '../downloads/complete';

describe('POST /api/downloads/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('test_POST_increments_on_valid_nonce', async () => {
    const mockKV = createMockKV();
    const ipHash = await hashIp('127.0.0.1');
    const nonce = 'test-nonce-1234-5678-9012-abcdef123456';
    mockKV._store.set(`nonce:${nonce}`, JSON.stringify({
      skillset: 'test/skillset',
      ipHash,
      ts: Date.now(),
    }));

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillset: 'test/skillset', nonce }),
      }),
      { DATA: mockKV }
    );
    const response = await POST(ctx);
    const data = await response.json() as any;

    expect(response.status).toBe(200);
    expect(data.count).toBe(1);
    expect(data.skillset).toBe('test/skillset');
  });

  it('test_POST_rejects_missing_nonce', async () => {
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillset: 'test/skillset' }),
      })
    );
    const response = await POST(ctx);
    expect(response.status).toBe(400);
  });

  it('test_POST_rejects_invalid_nonce', async () => {
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillset: 'test/skillset', nonce: 'random-nonce-not-in-kv' }),
      })
    );
    const response = await POST(ctx);
    const data = await response.json() as any;

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid or expired nonce');
  });

  it('test_POST_rejects_wrong_skillset', async () => {
    const mockKV = createMockKV();
    const ipHash = await hashIp('127.0.0.1');
    const nonce = 'test-nonce-aaaa-bbbb-cccc-dddddddddddd';
    mockKV._store.set(`nonce:${nonce}`, JSON.stringify({
      skillset: '@a/B',
      ipHash,
      ts: Date.now(),
    }));

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillset: '@c/D', nonce }),
      }),
      { DATA: mockKV }
    );
    const response = await POST(ctx);
    const data = await response.json() as any;

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid or expired nonce');
  });

  it('test_POST_rejects_wrong_ip', async () => {
    const mockKV = createMockKV();
    const otherIpHash = await hashIp('10.0.0.1');
    const nonce = 'test-nonce-eeee-ffff-1111-222222222222';
    mockKV._store.set(`nonce:${nonce}`, JSON.stringify({
      skillset: 'test/skillset',
      ipHash: otherIpHash,
      ts: Date.now(),
    }));

    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillset: 'test/skillset', nonce }),
      }),
      { DATA: mockKV }
    );
    // createAPIContext uses clientAddress: '127.0.0.1'
    const response = await POST(ctx);
    const data = await response.json() as any;

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid or expired nonce');
  });

  it('test_POST_nonce_is_single_use', async () => {
    const mockKV = createMockKV();
    const ipHash = await hashIp('127.0.0.1');
    const nonce = 'test-nonce-3333-4444-5555-666666666666';
    mockKV._store.set(`nonce:${nonce}`, JSON.stringify({
      skillset: 'test/skillset',
      ipHash,
      ts: Date.now(),
    }));

    const makeCtx = () => createAPIContext(
      new Request('https://skillsets.cc/api/downloads/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillset: 'test/skillset', nonce }),
      }),
      { DATA: mockKV }
    );

    const first = await POST(makeCtx());
    expect(first.status).toBe(200);

    const second = await POST(makeCtx());
    expect(second.status).toBe(400);
  });

  it('test_POST_validates_skillset_format', async () => {
    const ctx = createAPIContext(
      new Request('https://skillsets.cc/api/downloads/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillset: '../../etc/passwd', nonce: 'any-nonce' }),
      })
    );
    const response = await POST(ctx);
    expect(response.status).toBe(400);
  });
});
