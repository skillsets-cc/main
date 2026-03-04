import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isMinuteRateLimited, isHourlyRateLimited } from '../rate-limit';
import { createMockKV } from './test-utils';

describe('rate-limit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isMinuteRateLimited', () => {
    it('allows requests under the limit', async () => {
      const kv = createMockKV();

      const result = await isMinuteRateLimited(kv, 'star', 'user1', 10);

      expect(result).toBe(false);
      expect(kv.put).toHaveBeenCalledWith(
        expect.stringContaining('ratelimit:star:user1:'),
        '1',
        { expirationTtl: 120 },
      );
    });

    it('blocks when limit is reached', async () => {
      const kv = createMockKV();
      const bucket = Math.floor(Date.now() / 60_000);
      kv._store.set(`ratelimit:star:user1:${bucket}`, '10');

      const result = await isMinuteRateLimited(kv, 'star', 'user1', 10);

      expect(result).toBe(true);
      expect(kv.put).not.toHaveBeenCalled();
    });

    it('increments existing count', async () => {
      const kv = createMockKV();
      const bucket = Math.floor(Date.now() / 60_000);
      kv._store.set(`ratelimit:star:user1:${bucket}`, '5');

      const result = await isMinuteRateLimited(kv, 'star', 'user1', 10);

      expect(result).toBe(false);
      expect(kv.put).toHaveBeenCalledWith(
        `ratelimit:star:user1:${bucket}`,
        '6',
        { expirationTtl: 120 },
      );
    });

    it('resets in a new minute bucket', async () => {
      const kv = createMockKV();
      const oldBucket = Math.floor(Date.now() / 60_000);
      kv._store.set(`ratelimit:star:user1:${oldBucket}`, '10');

      // Advance 61 seconds into next bucket
      vi.advanceTimersByTime(61_000);

      const result = await isMinuteRateLimited(kv, 'star', 'user1', 10);

      expect(result).toBe(false);
    });

    it('isolates different users', async () => {
      const kv = createMockKV();
      const bucket = Math.floor(Date.now() / 60_000);
      kv._store.set(`ratelimit:star:user1:${bucket}`, '10');

      const result = await isMinuteRateLimited(kv, 'star', 'user2', 10);

      expect(result).toBe(false);
    });

    it('isolates different prefixes', async () => {
      const kv = createMockKV();
      const bucket = Math.floor(Date.now() / 60_000);
      kv._store.set(`ratelimit:star:user1:${bucket}`, '10');

      const result = await isMinuteRateLimited(kv, 'dl', 'user1', 10);

      expect(result).toBe(false);
    });
  });

  describe('isHourlyRateLimited', () => {
    it('allows requests under the limit', async () => {
      const kv = createMockKV();

      const result = await isHourlyRateLimited(kv, 'dl', '127.0.0.1', 30);

      expect(result).toBe(false);
      expect(kv.put).toHaveBeenCalledWith(
        expect.stringContaining('ratelimit:dl:127.0.0.1:'),
        '1',
        { expirationTtl: 7200 },
      );
    });

    it('blocks when limit is reached', async () => {
      const kv = createMockKV();
      const bucket = Math.floor(Date.now() / 3_600_000);
      kv._store.set(`ratelimit:dl:127.0.0.1:${bucket}`, '30');

      const result = await isHourlyRateLimited(kv, 'dl', '127.0.0.1', 30);

      expect(result).toBe(true);
    });

    it('resets in a new hour bucket', async () => {
      const kv = createMockKV();
      const oldBucket = Math.floor(Date.now() / 3_600_000);
      kv._store.set(`ratelimit:dl:127.0.0.1:${oldBucket}`, '30');

      // Advance past the hour boundary
      vi.advanceTimersByTime(3_600_001);

      const result = await isHourlyRateLimited(kv, 'dl', '127.0.0.1', 30);

      expect(result).toBe(false);
    });
  });
});
