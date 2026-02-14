import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { incrementDownloads, getDownloadCount, isDownloadRateLimited } from '../downloads';
import { createMockKV } from './test-utils';

describe('downloads', () => {
  describe('incrementDownloads', () => {
    it('increments from 0 for new skillset', async () => {
      const kv = createMockKV();

      const result = await incrementDownloads(kv, 'test/skillset');

      expect(result).toBe(1);
      expect(kv.put).toHaveBeenCalledWith('downloads:test/skillset', '1');
    });

    it('increments existing count', async () => {
      const kv = createMockKV();
      kv._store.set('downloads:test/skillset', '42');

      const result = await incrementDownloads(kv, 'test/skillset');

      expect(result).toBe(43);
      expect(kv.put).toHaveBeenCalledWith('downloads:test/skillset', '43');
    });

    it('handles different skillset IDs independently', async () => {
      const kv = createMockKV();
      kv._store.set('downloads:skillset-a', '10');
      kv._store.set('downloads:skillset-b', '20');

      const resultA = await incrementDownloads(kv, 'skillset-a');
      const resultB = await incrementDownloads(kv, 'skillset-b');

      expect(resultA).toBe(11);
      expect(resultB).toBe(21);
    });
  });

  describe('getDownloadCount', () => {
    it('returns count from KV', async () => {
      const kv = createMockKV();
      kv._store.set('downloads:test/skillset', '100');

      const result = await getDownloadCount(kv, 'test/skillset');

      expect(result).toBe(100);
    });

    it('returns 0 for new skillset', async () => {
      const kv = createMockKV();

      const result = await getDownloadCount(kv, 'new/skillset');

      expect(result).toBe(0);
    });
  });

  describe('isDownloadRateLimited', () => {
    const MOCK_TIME = 1234567890000; // Fixed timestamp for testing
    const MOCK_HOUR = Math.floor(MOCK_TIME / 3_600_000);

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(MOCK_TIME);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('allows first request and increments counter', async () => {
      const kv = createMockKV();

      const result = await isDownloadRateLimited(kv, '192.168.1.1');

      expect(result).toBe(false);
      expect(kv.put).toHaveBeenCalledWith(
        `ratelimit:dl:192.168.1.1:${MOCK_HOUR}`,
        '1',
        { expirationTtl: 7200 }
      );
    });

    it('allows requests under limit (29th request)', async () => {
      const kv = createMockKV();
      kv._store.set(`ratelimit:dl:192.168.1.1:${MOCK_HOUR}`, '28');

      const result = await isDownloadRateLimited(kv, '192.168.1.1');

      expect(result).toBe(false);
      expect(kv.put).toHaveBeenCalledWith(
        `ratelimit:dl:192.168.1.1:${MOCK_HOUR}`,
        '29',
        { expirationTtl: 7200 }
      );
    });

    it('blocks request at limit (30th request)', async () => {
      const kv = createMockKV();
      kv._store.set(`ratelimit:dl:192.168.1.1:${MOCK_HOUR}`, '30');

      const result = await isDownloadRateLimited(kv, '192.168.1.1');

      expect(result).toBe(true);
      expect(kv.put).not.toHaveBeenCalled();
    });

    it('blocks request over limit', async () => {
      const kv = createMockKV();
      kv._store.set(`ratelimit:dl:192.168.1.1:${MOCK_HOUR}`, '35');

      const result = await isDownloadRateLimited(kv, '192.168.1.1');

      expect(result).toBe(true);
      expect(kv.put).not.toHaveBeenCalled();
    });

    it('uses hour-bucketed keys for independent limits', async () => {
      const kv = createMockKV();
      const ip = '192.168.1.1';

      // First hour
      kv._store.set(`ratelimit:dl:${ip}:${MOCK_HOUR}`, '30');
      const result1 = await isDownloadRateLimited(kv, ip);
      expect(result1).toBe(true);

      // Move to next hour
      vi.setSystemTime(MOCK_TIME + 3_600_000);
      const nextHour = Math.floor((MOCK_TIME + 3_600_000) / 3_600_000);

      // Should be allowed in new hour
      const result2 = await isDownloadRateLimited(kv, ip);
      expect(result2).toBe(false);
      expect(kv.put).toHaveBeenCalledWith(
        `ratelimit:dl:${ip}:${nextHour}`,
        '1',
        { expirationTtl: 7200 }
      );
    });

    it('handles different IPs independently', async () => {
      const kv = createMockKV();
      kv._store.set(`ratelimit:dl:192.168.1.1:${MOCK_HOUR}`, '30');
      kv._store.set(`ratelimit:dl:192.168.1.2:${MOCK_HOUR}`, '5');

      const result1 = await isDownloadRateLimited(kv, '192.168.1.1');
      const result2 = await isDownloadRateLimited(kv, '192.168.1.2');

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('sets correct TTL for rate limit keys', async () => {
      const kv = createMockKV();

      await isDownloadRateLimited(kv, '192.168.1.1');

      expect(kv.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        { expirationTtl: 7200 }
      );
    });

    it('handles missing KV value as zero count', async () => {
      const kv = createMockKV();
      // KV returns null for non-existent keys

      const result = await isDownloadRateLimited(kv, '192.168.1.1');

      expect(result).toBe(false);
      expect(kv.put).toHaveBeenCalledWith(
        `ratelimit:dl:192.168.1.1:${MOCK_HOUR}`,
        '1',
        { expirationTtl: 7200 }
      );
    });
  });
});
