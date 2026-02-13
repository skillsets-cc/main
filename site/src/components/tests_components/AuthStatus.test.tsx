import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import AuthStatus from '../AuthStatus';

describe('AuthStatus', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('test_renders_nothing_during_loading', () => {
    // Never-resolving fetch to keep loading state
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {})) as typeof fetch;
    const { container } = render(<AuthStatus />);
    expect(container.innerHTML).toBe('');
  });

  it('test_renders_log_in_when_unauthenticated', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }) as typeof fetch;

    render(<AuthStatus />);

    await waitFor(() => {
      const link = screen.getByText('Log in');
      expect(link).toBeDefined();
      expect(link.getAttribute('href')).toContain('/login?returnTo=');
    });
  });

  it('test_renders_log_out_when_authenticated', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
    }) as typeof fetch;

    render(<AuthStatus />);

    await waitFor(() => {
      const link = screen.getByText('Log out');
      expect(link.getAttribute('href')).toBe('/logout');
    });
  });

  it('test_login_link_includes_returnTo', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }) as typeof fetch;

    render(<AuthStatus />);

    await waitFor(() => {
      const link = screen.getByText('Log in');
      expect(link.getAttribute('href')).toContain('returnTo=%2F');
    });
  });

  it('test_handles_fetch_error_gracefully', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as typeof fetch;

    render(<AuthStatus />);

    await waitFor(() => {
      expect(screen.getByText('Log in')).toBeDefined();
    });
  });
});
