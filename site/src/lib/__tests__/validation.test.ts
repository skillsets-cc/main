import { describe, it, expect } from 'vitest';
import { isValidSkillsetId } from '../validation';

describe('isValidSkillsetId', () => {
  it('accepts namespace/name format', () => {
    expect(isValidSkillsetId('supercollectible/The_Skillset')).toBe(true);
  });

  it('accepts @namespace/name format', () => {
    expect(isValidSkillsetId('@supercollectible/The_Skillset')).toBe(true);
  });

  it('accepts hyphens in namespace and name', () => {
    expect(isValidSkillsetId('my-user/my-skillset')).toBe(true);
  });

  it('accepts underscores in namespace and name', () => {
    expect(isValidSkillsetId('my_user/my_skillset')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidSkillsetId('')).toBe(false);
  });

  it('rejects missing name', () => {
    expect(isValidSkillsetId('namespace/')).toBe(false);
  });

  it('rejects missing namespace', () => {
    expect(isValidSkillsetId('/name')).toBe(false);
  });

  it('rejects bare name without slash', () => {
    expect(isValidSkillsetId('skillset')).toBe(false);
  });

  it('rejects nested paths', () => {
    expect(isValidSkillsetId('a/b/c')).toBe(false);
  });

  it('rejects path traversal', () => {
    expect(isValidSkillsetId('../etc/passwd')).toBe(false);
  });

  it('rejects spaces', () => {
    expect(isValidSkillsetId('user/my skillset')).toBe(false);
  });

  it('rejects special characters in namespace', () => {
    expect(isValidSkillsetId('user$/name')).toBe(false);
  });

  it('rejects double @', () => {
    expect(isValidSkillsetId('@@user/name')).toBe(false);
  });
});
