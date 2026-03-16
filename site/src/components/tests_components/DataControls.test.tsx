import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import DataControls from '../DataControls';

describe('DataControls', () => {
  const originalFetch = globalThis.fetch;
  const originalLocation = window.location;
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: 'https://skillsets.cc/privacy', pathname: '/privacy' },
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    window.location = originalLocation;
    vi.restoreAllMocks();
  });

  it('renders nothing when not logged in', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 }) as typeof fetch;
    const { container } = render(<DataControls />);
    await waitFor(() => expect(container.innerHTML).toBe(''));
  });

  it('renders nothing during auth check', () => {
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {})) as typeof fetch;
    const { container } = render(<DataControls />);
    expect(container.innerHTML).toBe('');
  });

  it('renders export and delete buttons when logged in', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 }) as typeof fetch;
    render(<DataControls />);

    await waitFor(() => {
      expect(screen.getByText('Export My Data')).toBeDefined();
      expect(screen.getByText('Delete My Account')).toBeDefined();
    });
  });

  it('export triggers download', async () => {
    const mockClick = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return { click: mockClick, href: '', download: '' } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tag);
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    let callCount = 0;
    globalThis.fetch = vi.fn(async () => {
      callCount++;
      if (callCount === 1) return { ok: true, status: 200 };
      return { ok: true, status: 200, json: async () => ({ login: 'test', stars: [] }) };
    }) as typeof fetch;

    render(<DataControls />);
    await waitFor(() => expect(screen.getByText('Export My Data')).toBeDefined());

    fireEvent.click(screen.getByText('Export My Data'));

    await waitFor(() => {
      expect(mockClick).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    });
  });

  it('export disables buttons during loading', async () => {
    let resolveExport: (value: unknown) => void;
    let callCount = 0;
    globalThis.fetch = vi.fn(async () => {
      callCount++;
      if (callCount === 1) return { ok: true, status: 200 };
      return new Promise(resolve => { resolveExport = resolve; });
    }) as typeof fetch;

    render(<DataControls />);
    await waitFor(() => expect(screen.getByText('Export My Data')).toBeDefined());

    fireEvent.click(screen.getByText('Export My Data'));

    await waitFor(() => {
      expect(screen.getByText('Export My Data').closest('button')?.disabled).toBe(true);
    });

    resolveExport!({ ok: true, status: 200, json: async () => ({}) });
  });

  it('export redirects to login on 401', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn(async () => {
      callCount++;
      if (callCount === 1) return { ok: true, status: 200 };
      return { ok: false, status: 401 };
    }) as typeof fetch;

    render(<DataControls />);
    await waitFor(() => expect(screen.getByText('Export My Data')).toBeDefined());

    fireEvent.click(screen.getByText('Export My Data'));

    await waitFor(() => {
      expect(window.location.href).toContain('/login?returnTo=');
    });
  });

  it('delete shows confirmation step', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 }) as typeof fetch;
    render(<DataControls />);
    await waitFor(() => expect(screen.getByText('Delete My Account')).toBeDefined());

    fireEvent.click(screen.getByText('Delete My Account'));

    await waitFor(() => {
      expect(screen.getByText('Are you sure? This cannot be undone.')).toBeDefined();
    });
  });

  it('confirmed delete shows success and redirects', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn(async () => {
      callCount++;
      if (callCount === 1) return { ok: true, status: 200 };
      return { ok: true, status: 200 };
    }) as typeof fetch;

    render(<DataControls />);
    await waitFor(() => expect(screen.getByText('Delete My Account')).toBeDefined());

    fireEvent.click(screen.getByText('Delete My Account'));
    await waitFor(() => expect(screen.getByText('Are you sure? This cannot be undone.')).toBeDefined());

    fireEvent.click(screen.getByText('Are you sure? This cannot be undone.'));

    await waitFor(() => {
      expect(screen.getByText('Your data has been deleted. Redirecting...')).toBeDefined();
    });
  });

  it('delete redirects to login on 401', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn(async () => {
      callCount++;
      if (callCount === 1) return { ok: true, status: 200 };
      return { ok: false, status: 401 };
    }) as typeof fetch;

    render(<DataControls />);
    await waitFor(() => expect(screen.getByText('Delete My Account')).toBeDefined());

    fireEvent.click(screen.getByText('Delete My Account'));
    await waitFor(() => expect(screen.getByText('Are you sure? This cannot be undone.')).toBeDefined());

    fireEvent.click(screen.getByText('Are you sure? This cannot be undone.'));

    await waitFor(() => {
      expect(window.location.href).toContain('/login?returnTo=');
    });
  });

  it('shows error on failed delete', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn(async () => {
      callCount++;
      if (callCount === 1) return { ok: true, status: 200 };
      return { ok: false, status: 500 };
    }) as typeof fetch;

    render(<DataControls />);
    await waitFor(() => expect(screen.getByText('Delete My Account')).toBeDefined());

    fireEvent.click(screen.getByText('Delete My Account'));
    await waitFor(() => expect(screen.getByText('Are you sure? This cannot be undone.')).toBeDefined());

    fireEvent.click(screen.getByText('Are you sure? This cannot be undone.'));

    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Please try again.')).toBeDefined();
    });
  });

  it('shows error on failed export', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn(async () => {
      callCount++;
      if (callCount === 1) return { ok: true, status: 200 };
      return { ok: false, status: 500 };
    }) as typeof fetch;

    render(<DataControls />);
    await waitFor(() => expect(screen.getByText('Export My Data')).toBeDefined());

    fireEvent.click(screen.getByText('Export My Data'));

    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Please try again.')).toBeDefined();
    });
  });
});
