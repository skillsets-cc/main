import { describe, it, expect } from 'vitest';
import { compareVersions } from '../versions';

describe('compareVersions', () => {
  it('returns 0 for equal versions', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });

  it('returns -1 when a < b (major)', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
  });

  it('returns 1 when a > b (major)', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
  });

  it('returns -1 when a < b (minor)', () => {
    expect(compareVersions('1.0.0', '1.1.0')).toBe(-1);
  });

  it('returns 1 when a > b (minor)', () => {
    expect(compareVersions('1.1.0', '1.0.0')).toBe(1);
  });

  it('returns -1 when a < b (patch)', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
  });

  it('returns 1 when a > b (patch)', () => {
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
  });

  it('handles major difference ignoring minor/patch', () => {
    expect(compareVersions('1.9.9', '2.0.0')).toBe(-1);
  });

  it('handles missing parts as zero', () => {
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
  });
});
