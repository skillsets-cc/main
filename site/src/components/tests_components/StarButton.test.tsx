import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import StarButton from '../StarButton';

describe('StarButton', () => {
  const originalFetch = globalThis.fetch;
  const originalLocation = window.location;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  it('renders with initial star count', async () => {
    // Mock fetch to avoid network errors during mount
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 42, starred: false }),
    }) as typeof fetch;

    render(<StarButton skillsetId="test" initialStars={42} />);

    await waitFor(() => {
      expect(screen.getByText('42')).toBeDefined();
    });
  });

  it('toggles star on click', async () => {
    // Mock fetch before render - component fetches star state on mount
    globalThis.fetch = vi.fn().mockImplementation((_url: string, options?: RequestInit) => {
      // GET request for initial star state
      if (!options?.method || options.method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ count: 10, starred: false }),
        });
      }
      // POST request to toggle star — return server-authoritative response
      return Promise.resolve({
        ok: true,
        json: async () => ({ starred: true, count: 11 }),
      });
    }) as typeof fetch;

    render(<StarButton skillsetId="test" initialStars={10} />);

    // Wait for initial fetch to complete
    await waitFor(() => {
      expect(screen.getByText('10')).toBeDefined();
    });

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('11')).toBeDefined();
    });
  });

  it('handles API errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock fetch - return ok for initial state, fail on POST
    globalThis.fetch = vi.fn().mockImplementation((_url: string, options?: RequestInit) => {
      // GET request for initial star state - succeed
      if (!options?.method || options.method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ count: 10, starred: false }),
        });
      }
      // POST request - fail
      return Promise.resolve({ ok: false, status: 500 });
    }) as typeof fetch;

    render(<StarButton skillsetId="test" initialStars={10} />);

    // Wait for initial fetch
    await waitFor(() => {
      expect(screen.getByText('10')).toBeDefined();
    });

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '[StarButton] Error:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('shows alert on frozen response', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    globalThis.fetch = vi.fn().mockImplementation((_url: string, options?: RequestInit) => {
      if (!options?.method || options.method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ count: 5, starred: false }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 403,
        json: async () => ({ frozen: true, message: 'Suspended', contact: 'security@skillsets.cc' }),
      });
    }) as typeof fetch;

    render(<StarButton skillsetId="@test/pkg" />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Suspended'));
    });
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('security@skillsets.cc'));
  });

  it('re-enables button after frozen response', async () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    globalThis.fetch = vi.fn().mockImplementation((_url: string, options?: RequestInit) => {
      if (!options?.method || options.method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ count: 5, starred: false }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 403,
        json: async () => ({ frozen: true, message: 'Suspended', contact: 'security@skillsets.cc' }),
      });
    }) as typeof fetch;

    render(<StarButton skillsetId="@test/pkg" />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeDefined();
    });

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(button.hasAttribute('disabled')).toBe(false);
    });
  });

  it('does not show alert on non-frozen 403', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    globalThis.fetch = vi.fn().mockImplementation((_url: string, options?: RequestInit) => {
      if (!options?.method || options.method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ count: 5, starred: false }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 403,
        json: async () => ({ frozen: false, message: 'Rate limited' }),
      });
    }) as typeof fetch;

    render(<StarButton skillsetId="@test/pkg" />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('[StarButton] Error:', expect.any(Error));
    });

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('normal toggle unchanged', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    globalThis.fetch = vi.fn().mockImplementation((_url: string, options?: RequestInit) => {
      if (!options?.method || options.method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ count: 10, starred: false }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ starred: true, count: 11 }),
      });
    }) as typeof fetch;

    render(<StarButton skillsetId="@test/pkg" initialStars={10} />);

    await waitFor(() => {
      expect(screen.getByText('10')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('11')).toBeDefined();
    });

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('auth redirect unchanged on 401', async () => {
    Object.defineProperty(window, 'location', {
      value: { href: '', pathname: '/skillset/@test/pkg' },
      writable: true,
    });

    globalThis.fetch = vi.fn().mockImplementation((_url: string, options?: RequestInit) => {
      if (!options?.method || options.method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ count: 5, starred: false }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 401,
        json: async () => ({}),
      });
    }) as typeof fetch;

    render(<StarButton skillsetId="@test/pkg" />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(window.location.href).toContain('/login');
    });
  });
});
