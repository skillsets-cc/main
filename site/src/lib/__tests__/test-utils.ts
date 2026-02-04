/**
 * Shared test utilities for lib module tests.
 */
import { vi } from 'vitest';
import type { Env } from '../auth';

/**
 * Create a mock KVNamespace with an in-memory store.
 * Exposes the internal _store for test setup/verification.
 */
export function createMockKV(): KVNamespace & { _store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    _store: store,
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  } as unknown as KVNamespace & { _store: Map<string, string> };
}

/**
 * Create a mock environment with default test values.
 */
export function createMockEnv(overrides: Partial<Env> = {}): Env {
  return {
    AUTH: createMockKV(),
    DATA: createMockKV(),
    GITHUB_CLIENT_ID: 'test-client-id',
    GITHUB_CLIENT_SECRET: 'test-client-secret',
    JWT_SECRET: 'test-jwt-secret-at-least-32-chars-long',
    CALLBACK_URL: 'https://skillsets.cc/callback',
    SITE_URL: 'https://skillsets.cc',
    ...overrides,
  };
}
