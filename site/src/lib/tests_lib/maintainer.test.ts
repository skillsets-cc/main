/**
 * Tests for maintainer utility.
 */
import { describe, expect, it } from 'vitest';
import { isMaintainer } from '../maintainer';
import { createMockEnv } from './test-utils';

describe('Maintainer Utility', () => {
  it('test_maintainer_match', () => {
    const env = createMockEnv({ MAINTAINER_USER_IDS: '123,456' });
    expect(isMaintainer(env, '123')).toBe(true);
    expect(isMaintainer(env, '456')).toBe(true);
  });

  it('test_maintainer_no_match', () => {
    const env = createMockEnv({ MAINTAINER_USER_IDS: '123,456' });
    expect(isMaintainer(env, '789')).toBe(false);
  });

  it('test_maintainer_empty_env', () => {
    const env = createMockEnv({ MAINTAINER_USER_IDS: '' });
    expect(isMaintainer(env, '123')).toBe(false);
  });

  it('test_maintainer_trimming', () => {
    const env = createMockEnv({ MAINTAINER_USER_IDS: ' 123 , 456 ' });
    expect(isMaintainer(env, '123')).toBe(true);
    expect(isMaintainer(env, '456')).toBe(true);
  });
});
