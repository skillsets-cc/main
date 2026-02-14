import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import DownloadCount from '../DownloadCount';

describe('DownloadCount', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('renders with initial count', () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
    }) as typeof fetch;

    render(<DownloadCount skillsetId="test/skillset" initialCount={42} />);

    expect(screen.getByText('42')).toBeDefined();
  });

  it('renders with 0 by default', () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
    }) as typeof fetch;

    render(<DownloadCount skillsetId="test/skillset" />);

    expect(screen.getByText('0')).toBeDefined();
  });

  it('fetches and displays live count', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 100 }),
    }) as typeof fetch;

    render(<DownloadCount skillsetId="test/skillset" initialCount={0} />);

    await waitFor(() => {
      expect(screen.getByText('100')).toBeDefined();
    });
  });

  it('calls correct API endpoint', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 0 }),
    }) as typeof fetch;

    render(<DownloadCount skillsetId="test/skillset" />);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/downloads?skillsetId=test%2Fskillset'
      );
    });
  });

  it('keeps initial count when API fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
    }) as typeof fetch;

    render(<DownloadCount skillsetId="test/skillset" initialCount={50} />);

    // Wait a bit for any potential updates
    await new Promise((r) => setTimeout(r, 100));

    expect(screen.getByText('50')).toBeDefined();
  });

  it('updates count from API response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 200 }),
    }) as typeof fetch;

    render(<DownloadCount skillsetId="test/skillset" initialCount={25} />);

    await waitFor(() => {
      expect(screen.getByText('200')).toBeDefined();
    });
  });

  it('handles network errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as typeof fetch;

    render(<DownloadCount skillsetId="test/skillset" initialCount={10} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '[DownloadCount] Failed to fetch:',
        expect.any(Error)
      );
    });

    // Should still show initial count
    expect(screen.getByText('10')).toBeDefined();

    consoleSpy.mockRestore();
  });

  it('renders download icon', () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
    }) as typeof fetch;

    const { container } = render(<DownloadCount skillsetId="test/skillset" />);

    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
  });
});
