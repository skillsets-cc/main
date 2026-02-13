/**
 * Shared test utilities for lib and API route tests.
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
    RESERVATIONS: {} as DurableObjectNamespace,
    GITHUB_CLIENT_ID: 'test-client-id',
    GITHUB_CLIENT_SECRET: 'test-client-secret',
    JWT_SECRET: 'test-jwt-secret-at-least-32-chars-long',
    MAINTAINER_USER_IDS: '',
    CALLBACK_URL: 'https://skillsets.cc/callback',
    SITE_URL: 'https://skillsets.cc',
    ...overrides,
  };
}

/** Minimal Astro APIContext for testing API routes. */
export function createAPIContext(request: Request, envOverrides: Partial<Env> = {}) {
  const env = createMockEnv(envOverrides);
  return {
    request,
    locals: { runtime: { env } },
    params: {},
    redirect: (url: string) => new Response(null, { status: 302, headers: { Location: url } }),
    url: new URL(request.url),
    site: new URL('https://skillsets.cc'),
    generator: 'test',
    props: {},
    cookies: {} as any,
    preferredLocale: undefined,
    preferredLocaleList: undefined,
    currentLocale: undefined,
    rewrite: vi.fn() as any,
    originPathname: '/',
    isPrerendered: false,
    getActionResult: vi.fn() as any,
    callAction: vi.fn() as any,
    routePattern: '',
    clientAddress: '127.0.0.1',
    ResponseWithEncoding: Response as any,
  } as any;
}

/** Mock Durable Object stub that returns a canned response. */
export function createMockStub(response: { status: number; body: unknown }) {
  return {
    fetch: vi.fn().mockResolvedValue({
      status: response.status,
      json: async () => response.body,
    }),
  };
}
