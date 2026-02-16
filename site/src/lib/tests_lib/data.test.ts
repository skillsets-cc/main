import { describe, it, expect } from 'vitest';
import { getSkillsets, getSkillsetById, getAllTags, getSearchIndexMeta } from '../data';

describe('data', () => {
  describe('getSkillsets', () => {
    it('returns skillsets sorted by stars descending', () => {
      const skillsets = getSkillsets();
      for (let i = 1; i < skillsets.length; i++) {
        expect(skillsets[i - 1].stars).toBeGreaterThanOrEqual(skillsets[i].stars);
      }
    });

    it('returns a new array (not a reference to the internal data)', () => {
      const a = getSkillsets();
      const b = getSkillsets();
      expect(a).not.toBe(b);
    });
  });

  describe('getSkillsetById', () => {
    it('returns undefined for nonexistent ID', () => {
      expect(getSkillsetById('nonexistent/skillset')).toBeUndefined();
    });
  });

  describe('getAllTags', () => {
    it('returns sorted unique tags', () => {
      const tags = getAllTags();
      const sorted = [...tags].sort();
      expect(tags).toEqual(sorted);
      expect(new Set(tags).size).toBe(tags.length);
    });
  });

  describe('getSearchIndexMeta', () => {
    it('returns version and generatedAt', () => {
      const meta = getSearchIndexMeta();
      expect(meta).toHaveProperty('version');
      expect(meta).toHaveProperty('generatedAt');
    });
  });
});
