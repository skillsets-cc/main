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
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      // GET request for initial star state
      if (url.includes('?skillsetId=')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ count: 10, starred: false }),
        });
      }
      // POST request to toggle star
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
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
    globalThis.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      // GET request for initial star state - succeed
      if (!options?.method || options.method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ count: 10, starred: false }),
        });
      }
      // POST request - fail
      return Promise.resolve({ ok: false });
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
});
