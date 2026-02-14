import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectConflicts, detectSkillset, backupFiles } from '../filesystem.js';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

describe('filesystem utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectConflicts', () => {
    it('returns empty array when no conflicts', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('File not found'));

      const conflicts = await detectConflicts('/test/dir');

      expect(conflicts).toHaveLength(0);
    });

    it('detects .claude/ directory conflict', async () => {
      vi.mocked(fs.access).mockImplementation((path) => {
        if (path.toString().includes('.claude')) {
          return Promise.resolve();
        }
        return Promise.reject(new Error('File not found'));
      });

      const conflicts = await detectConflicts('/test/dir');

      expect(conflicts).toContain('.claude/');
    });

    it('detects CLAUDE.md file conflict', async () => {
      vi.mocked(fs.access).mockImplementation((path) => {
        if (path.toString().includes('CLAUDE.md')) {
          return Promise.resolve();
        }
        return Promise.reject(new Error('File not found'));
      });

      const conflicts = await detectConflicts('/test/dir');

      expect(conflicts).toContain('CLAUDE.md');
    });
  });

  describe('detectSkillset', () => {
    it('returns skillset ID when skillset.yaml exists', async () => {
      const yamlContent = `
schema_version: "1.0"
name: "Test_Skillset"
version: "1.0.0"
description: "Test"
author:
  handle: "@testuser"
  url: "https://github.com/testuser"
verification:
  production_links:
    - url: "https://example.com"
  audit_report: "./AUDIT_REPORT.md"
tags: ["test"]
status: "active"
entry_point: "./content/CLAUDE.md"
`;
      vi.mocked(fs.readFile).mockResolvedValue(yamlContent);

      const skillsetId = await detectSkillset('/test/dir');

      expect(skillsetId).toBe('@testuser/Test_Skillset');
    });

    it('returns null when skillset.yaml does not exist', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      const skillsetId = await detectSkillset('/test/dir');

      expect(skillsetId).toBeNull();
    });
  });

  describe('backupFiles', () => {
    it('backs up a regular file', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => false } as any);
      vi.mocked(fs.copyFile).mockResolvedValue(undefined);

      await backupFiles(['CLAUDE.md'], '/test/dir');

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.copyFile).toHaveBeenCalledWith(
        '/test/dir/CLAUDE.md',
        expect.stringContaining('CLAUDE.md')
      );
    });

    it('recursively copies directories', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce([
          { name: 'settings.json', isDirectory: () => false } as any,
          { name: 'skills', isDirectory: () => true } as any,
        ])
        .mockResolvedValue([]);
      vi.mocked(fs.copyFile).mockResolvedValue(undefined);

      await backupFiles(['.claude/'], '/test/dir');

      expect(fs.readdir).toHaveBeenCalled();
      expect(fs.copyFile).toHaveBeenCalled();
    });
  });
});
