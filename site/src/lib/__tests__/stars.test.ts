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
});
