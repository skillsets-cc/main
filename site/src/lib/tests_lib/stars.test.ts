import { describe, it, expect, vi } from 'vitest';
import {
  isRateLimited,
  toggleStar,
  isStarred,
  getStarCount,
} from '../stars';
import { createMockKV } from './test-utils';

describe('stars', () => {
  describe('isRateLimited', () => {
    it('returns false on first request', async () => {
      const kv = createMockKV();
      const result = await isRateLimited(kv, 'user-123');

      expect(result).toBe(false);
      expect(kv.put).toHaveBeenCalledWith('ratelimit:user-123', '1', {
        expirationTtl: 60,
      });
    });

    it('returns false when under limit', async () => {
      const kv = createMockKV();
      kv._store.set('ratelimit:user-123', '5');

      const result = await isRateLimited(kv, 'user-123');

      expect(result).toBe(false);
      expect(kv.put).toHaveBeenCalledWith('ratelimit:user-123', '6', {
        expirationTtl: 60,
      });
    });

    it('returns true when at limit', async () => {
      const kv = createMockKV();
      kv._store.set('ratelimit:user-123', '10');

      const result = await isRateLimited(kv, 'user-123');

      expect(result).toBe(true);
      // Should not increment when at limit
      expect(kv.put).not.toHaveBeenCalled();
    });

    it('returns true when over limit', async () => {
      const kv = createMockKV();
      kv._store.set('ratelimit:user-123', '15');

      const result = await isRateLimited(kv, 'user-123');

      expect(result).toBe(true);
    });
  });

  describe('toggleStar', () => {
    it('adds star when not starred', async () => {
      const kv = createMockKV();
      kv._store.set('user:user-123:stars', '[]');
      kv._store.set('stars:test/skillset', '5');

      const result = await toggleStar(kv, 'user-123', 'test/skillset');

      expect(result).toEqual({ starred: true, count: 6 });
    });

    it('removes star when already starred', async () => {
      const kv = createMockKV();
      kv._store.set('user:user-123:stars', '["test/skillset"]');
      kv._store.set('stars:test/skillset', '5');

      const result = await toggleStar(kv, 'user-123', 'test/skillset');

      expect(result).toEqual({ starred: false, count: 4 });
    });

    it('initializes count to 1 for first star', async () => {
      const kv = createMockKV();
      // No existing data

      const result = await toggleStar(kv, 'user-123', 'new/skillset');

      expect(result).toEqual({ starred: true, count: 1 });
    });

    it('does not go below 0 stars', async () => {
      const kv = createMockKV();
      kv._store.set('user:user-123:stars', '["test/skillset"]');
      kv._store.set('stars:test/skillset', '0');

      const result = await toggleStar(kv, 'user-123', 'test/skillset');

      expect(result).toEqual({ starred: false, count: 0 });
    });

    it('handles multiple skillsets per user', async () => {
      const kv = createMockKV();
      kv._store.set('user:user-123:stars', '["other/skillset"]');
      kv._store.set('stars:test/skillset', '10');

      const result = await toggleStar(kv, 'user-123', 'test/skillset');

      expect(result).toEqual({ starred: true, count: 11 });

      // Verify user's stars list was updated
      const putCalls = (kv.put as ReturnType<typeof vi.fn>).mock.calls;
      const userStarsCall = putCalls.find((call) =>
        call[0] === 'user:user-123:stars'
      );
      expect(userStarsCall).toBeTruthy();
      const updatedStars = JSON.parse(userStarsCall![1]);
      expect(updatedStars).toContain('other/skillset');
      expect(updatedStars).toContain('test/skillset');
    });
  });

  describe('isStarred', () => {
    it('returns true when user has starred', async () => {
      const kv = createMockKV();
      kv._store.set('user:user-123:stars', '["test/skillset", "other/skillset"]');

      const result = await isStarred(kv, 'user-123', 'test/skillset');

      expect(result).toBe(true);
    });

    it('returns false when user has not starred', async () => {
      const kv = createMockKV();
      kv._store.set('user:user-123:stars', '["other/skillset"]');

      const result = await isStarred(kv, 'user-123', 'test/skillset');

      expect(result).toBe(false);
    });

    it('returns false for new user', async () => {
      const kv = createMockKV();

      const result = await isStarred(kv, 'new-user', 'test/skillset');

      expect(result).toBe(false);
    });
  });

  describe('getStarCount', () => {
    it('returns count from KV', async () => {
      const kv = createMockKV();
      kv._store.set('stars:test/skillset', '42');

      const result = await getStarCount(kv, 'test/skillset');

      expect(result).toBe(42);
    });

    it('returns 0 for unstared skillset', async () => {
      const kv = createMockKV();

      const result = await getStarCount(kv, 'new/skillset');

      expect(result).toBe(0);
    });
  });

  describe('retry logic', () => {
    it('retries on 429 error and succeeds on second attempt (read)', async () => {
      const kv = createMockKV();
      kv._store.set('stars:test/skillset', '42');

      let attemptCount = 0;
      kv.get = vi.fn(async (key: string) => {
        attemptCount++;
        if (attemptCount === 1) {
          const error = new Error('Rate limited') as any;
          error.status = 429;
          throw error;
        }
        return kv._store.get(key) ?? null;
      });

      const result = await getStarCount(kv, 'test/skillset');

      expect(result).toBe(42);
      expect(kv.get).toHaveBeenCalledTimes(2);
    });

    it('retries up to MAX_RETRIES times on 429 errors (read)', async () => {
      const kv = createMockKV();

      kv.get = vi.fn(async () => {
        const error = new Error('Rate limited') as any;
        error.status = 429;
        throw error;
      });

      await expect(getStarCount(kv, 'test/skillset')).rejects.toThrow('Rate limited');
      expect(kv.get).toHaveBeenCalledTimes(3); // MAX_RETRIES
    });

    it('throws immediately on non-429 errors (read)', async () => {
      const kv = createMockKV();

      kv.get = vi.fn(async () => {
        throw new Error('Network error');
      });

      await expect(getStarCount(kv, 'test/skillset')).rejects.toThrow('Network error');
      expect(kv.get).toHaveBeenCalledTimes(1); // No retries for non-429
    });

    it('retries on 429 error and succeeds on second attempt (write)', async () => {
      const kv = createMockKV();

      let attemptCount = 0;
      kv.put = vi.fn(async (key: string, value: string) => {
        attemptCount++;
        if (attemptCount === 1) {
          const error = new Error('Rate limited') as any;
          error.status = 429;
          throw error;
        }
        kv._store.set(key, value);
      });

      const result = await toggleStar(kv, 'user-123', 'test/skillset');

      expect(result.starred).toBe(true);
      // At least 2 attempts for each put (user stars and count)
      expect((kv.put as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('retries up to MAX_RETRIES times on 429 errors (write)', async () => {
      const kv = createMockKV();

      // Mock get to work normally
      kv.get = vi.fn(async (key: string) => kv._store.get(key) ?? null);

      // Mock put to always fail with 429
      kv.put = vi.fn(async () => {
        const error = new Error('Rate limited') as any;
        error.status = 429;
        throw error;
      });

      await expect(toggleStar(kv, 'user-123', 'test/skillset')).rejects.toThrow('Rate limited');
      // toggleStar calls put twice (user stars + count), but Promise.all short-circuits
      // First put: 3 attempts (MAX_RETRIES), then throws
      // The second put in Promise.all may get 1-2 attempts before the promise rejects
      expect(kv.put).toHaveBeenCalled();
      expect((kv.put as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it('throws immediately on non-429 errors (write)', async () => {
      const kv = createMockKV();

      // Mock get to work normally
      kv.get = vi.fn(async (key: string) => kv._store.get(key) ?? null);

      // Mock put to fail with non-429 error
      kv.put = vi.fn(async () => {
        throw new Error('Network error');
      });

      await expect(toggleStar(kv, 'user-123', 'test/skillset')).rejects.toThrow('Network error');
      // toggleStar calls put twice (user stars + count) via Promise.all
      // Both will attempt once (no retries for non-429), but Promise.all may short-circuit
      expect(kv.put).toHaveBeenCalled();
      expect((kv.put as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(1);
      expect((kv.put as ReturnType<typeof vi.fn>).mock.calls.length).toBeLessThanOrEqual(2);
    });

    it('uses exponential backoff delays (read)', async () => {
      vi.useFakeTimers();
      const kv = createMockKV();

      let attemptCount = 0;
      kv.get = vi.fn(async () => {
        attemptCount++;
        if (attemptCount <= 2) {
          const error = new Error('Rate limited') as any;
          error.status = 429;
          throw error;
        }
        return '42';
      });

      const promise = getStarCount(kv, 'test/skillset');

      // First attempt fails immediately
      await vi.advanceTimersByTimeAsync(0);

      // Second attempt after 100ms delay (BASE_DELAY_MS * 2^0)
      await vi.advanceTimersByTimeAsync(100);

      // Third attempt after 200ms delay (BASE_DELAY_MS * 2^1)
      await vi.advanceTimersByTimeAsync(200);

      const result = await promise;
      expect(result).toBe(42);
      expect(kv.get).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });

    it('uses exponential backoff delays (write)', async () => {
      vi.useFakeTimers();
      const kv = createMockKV();

      // Mock get to work normally
      kv.get = vi.fn(async (key: string) => kv._store.get(key) ?? null);

      let attemptCount = 0;
      kv.put = vi.fn(async (key: string, value: string) => {
        attemptCount++;
        if (attemptCount <= 2) {
          const error = new Error('Rate limited') as any;
          error.status = 429;
          throw error;
        }
        kv._store.set(key, value);
      });

      const promise = toggleStar(kv, 'user-123', 'test/skillset');

      // Wait for retry delays
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);

      const result = await promise;
      expect(result.starred).toBe(true);

      vi.useRealTimers();
    });
  });
});
