import { describe, it, expect, vi } from 'vitest';
import { createDownloadNonce, consumeDownloadNonce, incrementDownloads, getDownloadCount } from '../downloads';
import { createMockKV } from './test-utils';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('downloads', () => {
  describe('createDownloadNonce', () => {
    it('test_createDownloadNonce_returns_uuid', async () => {
      const kv = createMockKV();
      const nonce = await createDownloadNonce(kv, '@ns/skill', '1.2.3.4');
      expect(nonce).toMatch(UUID_RE);
    });

    it('test_createDownloadNonce_stores_in_kv_with_600s_ttl', async () => {
      const kv = createMockKV();
      const nonce = await createDownloadNonce(kv, '@ns/skill', '1.2.3.4');
      expect(kv.put).toHaveBeenCalledWith(
        `nonce:${nonce}`,
        expect.stringContaining('"skillset":"@ns/skill"'),
        { expirationTtl: 600 },
      );
      const stored = JSON.parse(kv._store.get(`nonce:${nonce}`)!);
      expect(stored).toMatchObject({ skillset: '@ns/skill', ts: expect.any(Number) });
    });

    it('test_createDownloadNonce_hashes_ip', async () => {
      const kv = createMockKV();
      const nonce = await createDownloadNonce(kv, '@ns/skill', '1.2.3.4');
      const stored = JSON.parse(kv._store.get(`nonce:${nonce}`)!);
      expect(stored.ipHash).toMatch(/^[0-9a-f]{16}$/);
      expect(stored.ipHash).not.toBe('1.2.3.4');
    });
  });

  describe('consumeDownloadNonce', () => {
    it('test_consumeDownloadNonce_valid_nonce', async () => {
      const kv = createMockKV();
      const nonce = await createDownloadNonce(kv, '@ns/skill', '1.2.3.4');
      const result = await consumeDownloadNonce(kv, nonce, '@ns/skill', '1.2.3.4');
      expect(result).toBe(true);
    });

    it('test_consumeDownloadNonce_deletes_nonce', async () => {
      const kv = createMockKV();
      const nonce = await createDownloadNonce(kv, '@ns/skill', '1.2.3.4');
      await consumeDownloadNonce(kv, nonce, '@ns/skill', '1.2.3.4');
      expect(kv._store.has(`nonce:${nonce}`)).toBe(false);
    });

    it('test_consumeDownloadNonce_missing_nonce', async () => {
      const kv = createMockKV();
      const result = await consumeDownloadNonce(kv, 'non-existent-uuid', '@ns/skill', '1.2.3.4');
      expect(result).toBe(false);
    });

    it('test_consumeDownloadNonce_wrong_skillset', async () => {
      const kv = createMockKV();
      const nonce = await createDownloadNonce(kv, '@a/B', '1.2.3.4');
      const result = await consumeDownloadNonce(kv, nonce, '@c/D', '1.2.3.4');
      expect(result).toBe(false);
      // Nonce should NOT be deleted
      expect(kv._store.has(`nonce:${nonce}`)).toBe(true);
    });

    it('test_consumeDownloadNonce_wrong_ip', async () => {
      const kv = createMockKV();
      const nonce = await createDownloadNonce(kv, '@ns/skill', '1.1.1.1');
      const result = await consumeDownloadNonce(kv, nonce, '@ns/skill', '2.2.2.2');
      expect(result).toBe(false);
      // Nonce should NOT be deleted
      expect(kv._store.has(`nonce:${nonce}`)).toBe(true);
    });
  });

  describe('incrementDownloads', () => {
    it('test_incrementDownloads_unchanged', async () => {
      const kv = createMockKV();
      expect(await incrementDownloads(kv, 'test/skillset')).toBe(1);
      expect(await incrementDownloads(kv, 'test/skillset')).toBe(2);
    });
  });

  describe('getDownloadCount', () => {
    it('test_getDownloadCount_unchanged', async () => {
      const kv = createMockKV();
      expect(await getDownloadCount(kv, 'test/skillset')).toBe(0);
      await incrementDownloads(kv, 'test/skillset');
      expect(await getDownloadCount(kv, 'test/skillset')).toBe(1);
    });
  });
});
