import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GhostCard from '../GhostCard';

describe('GhostCard', () => {
  const originalFetch = globalThis.fetch;
  const now = () => Math.floor(Date.now() / 1000);

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-02-06T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
  });

  const defaultProps = {
    slotId: 'ghost-1',
    index: 1,
    total: 24,
    status: 'available' as const,
    isOwn: false,
    onReserved: vi.fn(),
    onCancelled: vi.fn(),
    onConflict: vi.fn(),
  };

  it('test_renders_available_state', () => {
    render(<GhostCard {...defaultProps} />);
    expect(screen.getByText('Claim')).toBeDefined();
    expect(screen.getByText('1/24')).toBeDefined();
    const article = screen.getByText('Claim').closest('article');
    expect(article?.className).toContain('border-border-ink');
  });

  it('test_renders_reserved_state', () => {
    render(
      <GhostCard
        {...defaultProps}
        status="reserved"
        expiresAt={now() + 86400}
        isOwn={false}
      />
    );
    expect(screen.getByText(/Claimed by/)).toBeDefined();
    expect(screen.queryByText('Cancel')).toBeNull();
    const article = screen.getByText(/Claimed by/).closest('article');
    expect(article?.className).toContain('border-orange-500/30');
  });

  it('test_renders_own_reservation', () => {
    render(
      <GhostCard
        {...defaultProps}
        status="reserved"
        expiresAt={now() + 86400}
        isOwn={true}
      />
    );
    expect(screen.getByText('Cancel')).toBeDefined();
    // Countdown should have orange text
    const countdown = screen.getByText(/delivers within/);
    expect(countdown.className).toContain('text-orange-500');
    expect(countdown.className).not.toContain('text-orange-500/50');
  });

  it('test_reserve_click_success', async () => {
    const onReserved = vi.fn();
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 201,
      ok: true,
      json: async () => ({ slotId: 'ghost-1', expiresAt: now() + 604800 }),
    }) as typeof fetch;

    render(<GhostCard {...defaultProps} onReserved={onReserved} />);
    fireEvent.click(screen.getByText('Claim'));

    await waitFor(() => {
      expect(onReserved).toHaveBeenCalledWith('ghost-1', expect.any(Number));
    });
  });

  it('test_reserve_click_401_redirect', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
    }) as typeof fetch;

    // Mock window.location
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '' },
    });

    render(<GhostCard {...defaultProps} />);
    fireEvent.click(screen.getByText('Claim'));

    await waitFor(() => {
      expect(window.location.href).toBe('/login?returnTo=/');
    });

    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('test_reserve_click_409_conflict', async () => {
    const onConflict = vi.fn();
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 409,
      ok: false,
    }) as typeof fetch;

    render(<GhostCard {...defaultProps} onConflict={onConflict} />);
    fireEvent.click(screen.getByText('Claim'));

    await waitFor(() => {
      expect(onConflict).toHaveBeenCalled();
    });
  });

  it('test_cancel_click_success', async () => {
    const onCancelled = vi.fn();
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ released: 'ghost-1' }),
    }) as typeof fetch;

    render(
      <GhostCard
        {...defaultProps}
        status="reserved"
        expiresAt={now() + 86400}
        isOwn={true}
        onCancelled={onCancelled}
      />
    );
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(onCancelled).toHaveBeenCalled();
    });
  });

  it('test_loading_state_disables_button', async () => {
    let resolvePromise: (value: unknown) => void;
    const fetchPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    globalThis.fetch = vi.fn().mockReturnValue(fetchPromise) as typeof fetch;

    render(<GhostCard {...defaultProps} />);
    const button = screen.getByText('Claim');
    fireEvent.click(button);

    // Button should be disabled during loading
    expect(button).toHaveProperty('disabled', true);

    // Resolve the fetch
    resolvePromise!({ status: 201, ok: true, json: async () => ({ slotId: 'ghost-1', expiresAt: now() + 604800 }) });

    await waitFor(() => {
      expect(button).toHaveProperty('disabled', false);
    });
  });
});
