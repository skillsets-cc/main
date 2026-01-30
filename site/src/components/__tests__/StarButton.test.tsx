import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import StarButton from '../StarButton';

describe('StarButton', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('renders with initial star count', () => {
    render(<StarButton skillsetId="test" initialStars={42} />);
    expect(screen.getByText('42')).toBeDefined();
  });

  it('toggles star on click', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as typeof fetch;

    render(<StarButton skillsetId="test" initialStars={10} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('11')).toBeDefined();
    });
  });

  it('handles API errors gracefully', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
    }) as typeof fetch;

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<StarButton skillsetId="test" initialStars={10} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});
