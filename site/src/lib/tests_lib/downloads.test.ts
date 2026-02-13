import { describe, it, expect } from 'vitest';
import { incrementDownloads, getDownloadCount } from '../downloads';
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
});
