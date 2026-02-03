import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeFileChecksum, verifyChecksums } from '../checksum.js';
import * as fs from 'fs/promises';
import * as api from '../api.js';

vi.mock('fs/promises');
vi.mock('../api.js');

describe('checksum utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('computeFileChecksum', () => {
    it('computes SHA-256 hash of file content', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('test content');

      const checksum = await computeFileChecksum('/path/to/file.txt');

      expect(checksum).toBe('6ae8a75555209fd6c44157c0aed8016e763ff435a19cf186f76863140143ff72');
    });
  });

  describe('verifyChecksums', () => {
    it('returns valid when all checksums match', async () => {
      const mockMetadata = {
        id: '@user/test',
        name: 'Test',
        description: 'Test',
        tags: [],
        author: { handle: '@user' },
        stars: 0,
        version: '1.0.0',
        checksum: 'abc',
        files: {
          // Only content/ files are verified
          'content/file.txt': '6ae8a75555209fd6c44157c0aed8016e763ff435a19cf186f76863140143ff72',
        },
      };

      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(fs.readFile).mockResolvedValue('test content');

      const result = await verifyChecksums('@user/test', '/test/dir');

      expect(result.valid).toBe(true);
      expect(result.mismatches).toHaveLength(0);
    });

    it('returns mismatches when checksums differ', async () => {
      const mockMetadata = {
        id: '@user/test',
        name: 'Test',
        description: 'Test',
        tags: [],
        author: { handle: '@user' },
        stars: 0,
        version: '1.0.0',
        checksum: 'abc',
        files: {
          'content/file.txt': 'expected-checksum',
        },
      };

      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(fs.readFile).mockResolvedValue('different content');

      const result = await verifyChecksums('@user/test', '/test/dir');

      expect(result.valid).toBe(false);
      expect(result.mismatches).toHaveLength(1);
      expect(result.mismatches[0].file).toBe('content/file.txt');
    });

    it('marks missing files as MISSING', async () => {
      const mockMetadata = {
        id: '@user/test',
        name: 'Test',
        description: 'Test',
        tags: [],
        author: { handle: '@user' },
        stars: 0,
        version: '1.0.0',
        checksum: 'abc',
        files: {
          'content/missing.txt': 'expected-checksum',
        },
      };

      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      const result = await verifyChecksums('@user/test', '/test/dir');

      expect(result.valid).toBe(false);
      expect(result.mismatches[0].actual).toBe('MISSING');
    });

    it('skips non-content files', async () => {
      const mockMetadata = {
        id: '@user/test',
        name: 'Test',
        description: 'Test',
        tags: [],
        author: { handle: '@user' },
        stars: 0,
        version: '1.0.0',
        checksum: 'abc',
        files: {
          'skillset.yaml': 'some-checksum',  // Root file, should be skipped
          'PROOF.md': 'some-checksum',       // Root file, should be skipped
        },
      };

      vi.mocked(api.fetchSkillsetMetadata).mockResolvedValue(mockMetadata);

      const result = await verifyChecksums('@user/test', '/test/dir');

      // Should pass because non-content files are skipped
      expect(result.valid).toBe(true);
      expect(result.mismatches).toHaveLength(0);
    });
  });
});
