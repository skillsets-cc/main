import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  hashIp,
  isFrozen,
  freeze,
  checkDailyLimit,
  recordBreach,
  checkRateLimit,
  PREFIX_REGISTRY,
} from '../rate-limit';
import { createMockKV } from './test-utils';

vi.mock('../responses', async () => {
  const actual = await vi.importActual('../responses');
  return {
    ...actual,
    frozenResponse: () => new Response(JSON.stringify({ frozen: true }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }),
  };
});

const DAY_MS = 86_400_000;

describe('rate-limit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('hashIp', () => {
    it('test_hashIp_returns_16_hex_chars', async () => {
      const result = await hashIp('192.168.1.1');
      expect(result).toMatch(/^[0-9a-f]{16}$/);
    });

    it('test_hashIp_consistent', async () => {
      const a = await hashIp('::1');
      const b = await hashIp('::1');
      expect(a).toBe(b);
    });

    it('test_hashIp_different_ips_different_hashes', async () => {
      const a = await hashIp('1.1.1.1');
      const b = await hashIp('8.8.8.8');
      expect(a).not.toBe(b);
    });
  });

  describe('isFrozen', () => {
    it('test_isFrozen_returns_false_when_no_key', async () => {
      const kv = createMockKV();
      expect(await isFrozen(kv, 'star', 'u1')).toBe(false);
    });

    it('test_isFrozen_returns_true_when_frozen', async () => {
      const kv = createMockKV();
      kv._store.set('freeze:star:u1', '1');
      expect(await isFrozen(kv, 'star', 'u1')).toBe(true);
    });
  });

  describe('freeze', () => {
    it('test_freeze_writes_key_without_ttl', async () => {
      const kv = createMockKV();
      await freeze(kv, 'star', 'u1');
      expect(kv.put).toHaveBeenCalledWith('freeze:star:u1', '1', undefined);
    });

    it('test_freeze_writes_key_with_ttl', async () => {
      const kv = createMockKV();
      await freeze(kv, 'dl', 'hash', 7_776_000);
      expect(kv.put).toHaveBeenCalledWith('freeze:dl:hash', '1', { expirationTtl: 7_776_000 });
    });
  });

  describe('checkDailyLimit', () => {
    it('test_checkDailyLimit_allows_under_limit', async () => {
      const kv = createMockKV();
      const result = await checkDailyLimit(kv, 'star', 'u1', 10);
      expect(result).toEqual({ limited: false, count: 1 });
    });

    it('test_checkDailyLimit_blocks_at_limit', async () => {
      const kv = createMockKV();
      const bucket = Math.floor(Date.now() / DAY_MS);
      kv._store.set(`ratelimit:star:u1:${bucket}`, '10');
      const result = await checkDailyLimit(kv, 'star', 'u1', 10);
      expect(result).toEqual({ limited: true, count: 10 });
    });

    it('test_checkDailyLimit_increments_counter', async () => {
      const kv = createMockKV();
      await checkDailyLimit(kv, 'star', 'u1', 10);
      await checkDailyLimit(kv, 'star', 'u1', 10);
      const bucket = Math.floor(Date.now() / DAY_MS);
      expect(kv._store.get(`ratelimit:star:u1:${bucket}`)).toBe('2');
    });

    it('test_checkDailyLimit_uses_25h_ttl', async () => {
      const kv = createMockKV();
      await checkDailyLimit(kv, 'star', 'u1', 10);
      expect(kv.put).toHaveBeenCalledWith(
        expect.stringContaining('ratelimit:star:u1:'),
        '1',
        { expirationTtl: 90000 },
      );
    });
  });

  describe('recordBreach', () => {
    it('test_recordBreach_immediate_freeze_threshold_0', async () => {
      const kv = createMockKV();
      const result = await recordBreach(kv, 'reserve', 'u1', { threshold: 0, bucketType: 'day' });
      expect(result).toEqual({ frozen: true });
      expect(kv._store.get('freeze:reserve:u1')).toBe('1');
    });

    it('test_recordBreach_consecutive_days_increment', async () => {
      const kv = createMockKV();
      const policy = { threshold: 5, bucketType: 'day' as const };
      const bucket = Math.floor(Date.now() / DAY_MS);

      // Day N breach
      await recordBreach(kv, 'star', 'u1', policy);

      // Day N+1 breach
      vi.setSystemTime(new Date(Date.now() + DAY_MS));
      await recordBreach(kv, 'star', 'u1', policy);

      const tracker = JSON.parse(kv._store.get('breaches:star:u1')!);
      expect(tracker.count).toBe(2);
    });

    it('test_recordBreach_gap_resets_count', async () => {
      const kv = createMockKV();
      const policy = { threshold: 5, bucketType: 'day' as const };

      // Day N breach
      await recordBreach(kv, 'star', 'u1', policy);

      // Day N+3 breach (gap)
      vi.setSystemTime(new Date(Date.now() + DAY_MS * 3));
      await recordBreach(kv, 'star', 'u1', policy);

      const tracker = JSON.parse(kv._store.get('breaches:star:u1')!);
      expect(tracker.count).toBe(1);
    });

    it('test_recordBreach_same_day_skips', async () => {
      const kv = createMockKV();
      const policy = { threshold: 5, bucketType: 'day' as const };

      await recordBreach(kv, 'star', 'u1', policy);
      const putCallsAfterFirst = (kv.put as ReturnType<typeof vi.fn>).mock.calls.length;

      const result = await recordBreach(kv, 'star', 'u1', policy);
      expect(result).toEqual({ frozen: false });
      // No additional put calls
      expect((kv.put as ReturnType<typeof vi.fn>).mock.calls.length).toBe(putCallsAfterFirst);
    });

    it('test_recordBreach_freezes_at_threshold', async () => {
      const kv = createMockKV();
      const policy = { threshold: 3, bucketType: 'day' as const };
      const base = Date.now();

      for (let i = 0; i < 3; i++) {
        vi.setSystemTime(new Date(base + DAY_MS * i));
        await recordBreach(kv, 'star', 'u1', policy);
      }

      expect(kv._store.get('freeze:star:u1')).toBe('1');
    });

    it('test_recordBreach_ip_keyed_ttl', async () => {
      const kv = createMockKV();
      const policy = { threshold: 3, bucketType: 'day' as const, freezeTtl: 7_776_000 };

      await recordBreach(kv, 'dl', 'hashval', policy);

      // Check breach tracker was written with TTL
      expect(kv.put).toHaveBeenCalledWith(
        'breaches:dl:hashval',
        expect.any(String),
        { expirationTtl: 7_776_000 },
      );
    });

    it('test_PREFIX_REGISTRY_has_4_entries', () => {
      expect(PREFIX_REGISTRY).toHaveLength(4);
      const prefixes = PREFIX_REGISTRY.map(e => e.prefix);
      expect(prefixes).toContain('star');
      expect(prefixes).toContain('dl');
      expect(prefixes).toContain('reserve');
      expect(prefixes).toContain('delete');
    });
  });

  describe('checkRateLimit', () => {
    it('test_checkRateLimit_allows_normal_request', async () => {
      const kv = createMockKV();
      const result = await checkRateLimit(kv, 'star', 'u1', 10, { threshold: 3, bucketType: 'day' });
      expect(result).toMatchObject({ allowed: true });
    });

    it('test_checkRateLimit_rejects_frozen_user', async () => {
      const kv = createMockKV();
      kv._store.set('freeze:star:u1', '1');
      const result = await checkRateLimit(kv, 'star', 'u1', 10, { threshold: 3, bucketType: 'day' });
      expect(result.allowed).toBe(false);
      expect(result.response).toBeDefined();
      expect(result.response!.status).toBe(403);
      const body = await result.response!.json() as { frozen: boolean };
      expect(body.frozen).toBe(true);
    });

    it('test_checkRateLimit_returns_429_on_limit_exceeded', async () => {
      const kv = createMockKV();
      const bucket = Math.floor(Date.now() / DAY_MS);
      kv._store.set(`ratelimit:star:u1:${bucket}`, '10');
      const result = await checkRateLimit(kv, 'star', 'u1', 10, { threshold: 3, bucketType: 'day' });
      expect(result.allowed).toBe(false);
      expect(result.response!.status).toBe(429);
    });

    it('test_checkRateLimit_freezes_after_breach_threshold', async () => {
      const kv = createMockKV();
      const policy = { threshold: 3, bucketType: 'day' as const };
      const base = Date.now();

      for (let i = 0; i < 3; i++) {
        vi.setSystemTime(new Date(base + DAY_MS * i));
        const bucket = Math.floor(Date.now() / DAY_MS);
        kv._store.set(`ratelimit:star:u1:${bucket}`, '10');
        await checkRateLimit(kv, 'star', 'u1', 10, policy);
      }

      expect(kv._store.get('freeze:star:u1')).toBe('1');
    });

    it('test_checkRateLimit_immediate_freeze_threshold_0', async () => {
      const kv = createMockKV();
      const bucket = Math.floor(Date.now() / DAY_MS);
      kv._store.set(`ratelimit:reserve:u1:${bucket}`, '5');
      const result = await checkRateLimit(kv, 'reserve', 'u1', 5, { threshold: 0, bucketType: 'day' });
      expect(result.allowed).toBe(false);
      expect(result.response!.status).toBe(403);
    });

    it('test_checkRateLimit_warning_on_last_allowed', async () => {
      const kv = createMockKV();
      const bucket = Math.floor(Date.now() / DAY_MS);
      // Already at count 1 out of 2, so next call hits count=2=limit
      kv._store.set(`ratelimit:star:u1:${bucket}`, '1');
      const result = await checkRateLimit(kv, 'star', 'u1', 2, { threshold: 3, bucketType: 'day' });
      expect(result.allowed).toBe(true);
      expect(result.warning).toContain('daily limit (2/day)');
    });

    it('test_checkRateLimit_no_warning_under_limit', async () => {
      const kv = createMockKV();
      const bucket = Math.floor(Date.now() / DAY_MS);
      kv._store.set(`ratelimit:star:u1:${bucket}`, '4');
      const result = await checkRateLimit(kv, 'star', 'u1', 10, { threshold: 3, bucketType: 'day' });
      expect(result.allowed).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('test_checkRateLimit_fail_open_on_kv_error', async () => {
      const kv = createMockKV();
      (kv as any).get = vi.fn(async () => { throw new Error('KV unavailable'); });
      const result = await checkRateLimit(kv, 'star', 'u1', 10, { threshold: 3, bucketType: 'day' });
      expect(result).toEqual({ allowed: true });
    });

    it('test_checkRateLimit_logs_rejection', async () => {
      const kv = createMockKV();
      kv._store.set('freeze:star:u1', '1');
      const logSpy = vi.spyOn(console, 'log');
      await checkRateLimit(kv, 'star', 'u1', 10, { threshold: 3, bucketType: 'day' });
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[RateLimit] REJECTED'));
    });
  });
});
