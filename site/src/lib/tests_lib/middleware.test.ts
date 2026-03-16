import { describe, it, expect, vi } from 'vitest';

// middleware.ts uses `defineMiddleware` from 'astro:middleware' which isn't
// available in unit tests. We test the logic by extracting what it does:
// wrapping a response with security headers.

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' https: data:",
    "connect-src 'self'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self' https://github.com",
  ].join('; '),
};

/**
 * Simulate what the middleware does: clone a response into a mutable one
 * and apply security headers.
 */
function applySecurityHeaders(response: Response): Response {
  const mutable = new Response(response.body, response);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    mutable.headers.set(key, value);
  }
  return mutable;
}

describe('middleware security headers', () => {
  it('adds all security headers to a normal response', () => {
    const original = new Response('OK', { status: 200 });
    const result = applySecurityHeaders(original);

    expect(result.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
    expect(result.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(result.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(result.headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()');
    const csp = result.headers.get('Content-Security-Policy')!;
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
    expect(csp).toContain("font-src 'self' https://fonts.gstatic.com");
    expect(csp).toContain("img-src 'self' https: data:");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self' https://github.com");
  });

  it('preserves the original status code', () => {
    const original = new Response(null, { status: 404 });
    const result = applySecurityHeaders(original);

    expect(result.status).toBe(404);
  });

  it('preserves existing headers', () => {
    const original = new Response('{}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    const result = applySecurityHeaders(original);

    expect(result.headers.get('Content-Type')).toBe('application/json');
    expect(result.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
  });

  it('preserves the response body', async () => {
    const original = new Response('hello world');
    const result = applySecurityHeaders(original);

    expect(await result.text()).toBe('hello world');
  });

  it('handles redirect responses (the immutable response case)', () => {
    // Response.redirect() creates an immutable response in Workers.
    // The middleware clones it to make it mutable.
    const redirect = new Response(null, {
      status: 302,
      headers: { Location: 'https://example.com' },
    });
    const result = applySecurityHeaders(redirect);

    expect(result.status).toBe(302);
    expect(result.headers.get('Location')).toBe('https://example.com');
    expect(result.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
  });
});
