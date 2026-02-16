import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import SkillsetGrid from '../SkillsetGrid';
import { mockSkillsets } from './fixtures';

// Mock GhostCard to capture and trigger callbacks for testing
vi.mock('../GhostCard', () => ({
  default: ({ onReserved, onCancelled, onConflict, batchId, status, isOwn, skillsetId }: any) => {
    return (
      <div data-testid={`ghost-card-${batchId}`}>
        <span>{batchId}</span>
        <span data-testid={`status-${batchId}`}>
          {status === 'submitted' ? 'Submitted' : status === 'reserved' ? 'Reserved' : 'Available'}
        </span>
        {skillsetId && <span>{skillsetId}</span>}
        <button onClick={() => onReserved?.(batchId, Date.now() + 3600000)}>Reserve</button>
        <button onClick={() => onCancelled?.()}>Cancel</button>
        <button onClick={() => onConflict?.()}>Conflict</button>
        {isOwn && <span>Own</span>}
      </div>
    );
  }
}));

describe('SkillsetGrid', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch(
    starOverrides: Record<string, number> = {},
    reservationOverrides: { slots?: Record<string, { status: string; expiresAt?: number; skillsetId?: string }>; totalGhostSlots?: number; cohort?: number; userSlot?: string | null } = {}
  ) {
    const stars: Record<string, number> = {};
    for (const s of mockSkillsets) {
      stars[s.id] = starOverrides[s.id] ?? s.stars;
    }
    const defaultReservations = {
      slots: {},
      totalGhostSlots: 0,
      cohort: 1,
      userSlot: null,
      ...reservationOverrides,
    };
    globalThis.fetch = vi.fn().mockImplementation((url: string | URL) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/api/stats/counts')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ stars, downloads: {} }),
        });
      }
      if (urlStr.includes('/api/reservations')) {
        return Promise.resolve({
          ok: true,
          json: async () => defaultReservations,
        });
      }
      return Promise.resolve({ ok: false });
    }) as typeof fetch;
  }

  // Helper to render and wait for stats + reservations fetches to complete
  async function renderAndWaitForStars() {
    mockFetch();

    await act(async () => {
      render(<SkillsetGrid skillsets={mockSkillsets} />);
    });

    // Wait for both fetches to complete
    await waitFor(() => {
      const fetchCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const statsCalls = fetchCalls.filter((call) => {
        const url = typeof call[0] === 'string' ? call[0] : call[0].toString();
        return url.includes('/api/stats/counts');
      });
      const reservationCalls = fetchCalls.filter((call) => {
        const url = typeof call[0] === 'string' ? call[0] : call[0].toString();
        return url.includes('/api/reservations');
      });
      expect(statsCalls.length).toBe(1);
      expect(reservationCalls.length).toBe(1);
    });
  }

  it('renders all skillsets', async () => {
    await renderAndWaitForStars();

    expect(screen.getByText('Valence')).toBeDefined();
    expect(screen.getByText('Code Review Assistant')).toBeDefined();
    expect(screen.getByText('Testing Framework')).toBeDefined();
  });

  it('renders skillset descriptions', async () => {
    await renderAndWaitForStars();

    expect(screen.getByText(/Spec-driven SDLC/)).toBeDefined();
    expect(screen.getByText(/Automated code review/)).toBeDefined();
  });

  it('renders skillset metadata', async () => {
    await renderAndWaitForStars();

    expect(screen.getByText(/v1.0.0/)).toBeDefined();
    expect(screen.getByText(/@supercollectible/)).toBeDefined();
  });

  it('renders tag filter', async () => {
    await renderAndWaitForStars();

    expect(screen.getByText('All')).toBeDefined();
  });

  it('filters by tag', async () => {
    await renderAndWaitForStars();

    fireEvent.click(screen.getByText('sdlc'));

    await waitFor(() => {
      expect(screen.getByText('Valence')).toBeDefined();
      expect(screen.queryByText('Code Review Assistant')).toBeNull();
    });
  });

  it('links to skillset detail page', async () => {
    await renderAndWaitForStars();

    const link = screen.getByText('Valence').closest('a');
    expect(link?.getAttribute('href')).toBe('/skillset/supercollectible/Valence');
  });

  it('fetches live star counts on mount', async () => {
    await renderAndWaitForStars();

    // Verify bulk stats API was called once
    const fetchCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const statsCalls = fetchCalls.filter((call) =>
      call[0].includes('/api/stats/counts')
    );
    expect(statsCalls.length).toBe(1);
  });

  it('displays live star counts when available', async () => {
    mockFetch({ 'supercollectible/Valence': 999 });

    await act(async () => {
      render(<SkillsetGrid skillsets={mockSkillsets} />);
    });

    await waitFor(() => {
      expect(screen.getByText('999')).toBeDefined();
    });
  });

  it('renders tags as chips', async () => {
    await renderAndWaitForStars();

    expect(screen.getByText('#sdlc')).toBeDefined();
    expect(screen.getByText('#planning')).toBeDefined();
  });

  it('test_ghost_cards_show_batch_id', async () => {
    mockFetch({}, {
      slots: { '5.10.001': { status: 'available' } },
      totalGhostSlots: 10,
      cohort: 1,
    });

    await act(async () => {
      render(<SkillsetGrid skillsets={mockSkillsets} />);
    });

    await waitFor(() => {
      expect(screen.getByText('5.10.001')).toBeDefined();
    });
  });

  it('test_submitted_slot_with_matching_skillset', async () => {
    mockFetch({}, {
      slots: { '5.10.001': { status: 'submitted', skillsetId: 'supercollectible/Valence' } },
      totalGhostSlots: 10,
      cohort: 1,
    });

    await act(async () => {
      render(<SkillsetGrid skillsets={mockSkillsets} />);
    });

    await waitFor(() => {
      // Real skillset card should be rendered
      expect(screen.getByText('Valence')).toBeDefined();
      // Batch ID should appear on the real card
      expect(screen.getByText('5.10.001')).toBeDefined();
      // Should not render a separate ghost card with "Submitted" label
      expect(screen.queryByText('Submitted')).toBeNull();
    });
  });

  it('test_submitted_slot_without_matching_skillset', async () => {
    mockFetch({}, {
      slots: { '5.10.001': { status: 'submitted', skillsetId: '@user/NonExistent' } },
      totalGhostSlots: 10,
      cohort: 1,
    });

    await act(async () => {
      render(<SkillsetGrid skillsets={mockSkillsets} />);
    });

    await waitFor(() => {
      // Ghost card in submitted state should be rendered
      expect(screen.getByText('Submitted')).toBeDefined();
      expect(screen.getByText('@user/NonExistent')).toBeDefined();
      expect(screen.getByText('5.10.001')).toBeDefined();
    });
  });

  it('test_ghost_card_hidden_when_skillset_has_matching_batch_id', async () => {
    // Test L126: return false when skillset.batch_id matches ghost slot ID
    const skillsetsWithBatch = [
      { ...mockSkillsets[0], batch_id: '5.10.001' },
      ...mockSkillsets.slice(1),
    ];

    mockFetch({}, {
      slots: { '5.10.001': { status: 'available' } },
      totalGhostSlots: 10,
      cohort: 1,
    });

    await act(async () => {
      render(<SkillsetGrid skillsets={skillsetsWithBatch} />);
    });

    await waitFor(() => {
      // The real skillset card should show the batch ID
      expect(screen.getByText('5.10.001')).toBeDefined();
    });

    // Ghost card should not be rendered (filtered out by L126)
    expect(screen.queryByTestId('ghost-card-5.10.001')).toBeNull();
  });

  it('test_onReserved_callback_updates_reservation_state', async () => {
    // Test L144-149: onReserved callback
    mockFetch({}, {
      slots: { '5.10.001': { status: 'available' } },
      totalGhostSlots: 10,
      cohort: 1,
    });

    await act(async () => {
      render(<SkillsetGrid skillsets={mockSkillsets} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('ghost-card-5.10.001')).toBeDefined();
    });

    // Trigger onReserved callback
    const reserveButton = screen.getByText('Reserve');
    await act(async () => {
      fireEvent.click(reserveButton);
    });

    // State should update: status becomes 'reserved' and userSlot is set
    await waitFor(() => {
      const statusEl = screen.getByTestId('status-5.10.001');
      expect(statusEl.textContent).toBe('Reserved');
      expect(screen.getByText('Own')).toBeDefined(); // isOwn should be true
    });
  });

  it('test_onCancelled_callback_clears_user_slot', async () => {
    // Test L150-159: onCancelled callback
    mockFetch({}, {
      slots: { '5.10.001': { status: 'reserved', expiresAt: Date.now() + 3600000 } },
      totalGhostSlots: 10,
      cohort: 1,
      userSlot: '5.10.001',
    });

    await act(async () => {
      render(<SkillsetGrid skillsets={mockSkillsets} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('ghost-card-5.10.001')).toBeDefined();
      expect(screen.getByText('Own')).toBeDefined(); // Initially owned
    });

    // Trigger onCancelled callback
    const cancelButton = screen.getByText('Cancel');
    await act(async () => {
      fireEvent.click(cancelButton);
    });

    // State should update: userSlot becomes null, status becomes 'available'
    await waitFor(() => {
      const statusEl = screen.getByTestId('status-5.10.001');
      expect(statusEl.textContent).toBe('Available');
      expect(screen.queryByText('Own')).toBeNull(); // No longer owned
    });
  });

  it('test_onConflict_callback_refetches_reservations', async () => {
    // Test L160-165: onConflict callback
    mockFetch({}, {
      slots: { '5.10.001': { status: 'available' } },
      totalGhostSlots: 10,
      cohort: 1,
    });

    await act(async () => {
      render(<SkillsetGrid skillsets={mockSkillsets} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('ghost-card-5.10.001')).toBeDefined();
    });

    const initialFetchCallCount = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    // Trigger onConflict callback
    const conflictButton = screen.getByText('Conflict');
    await act(async () => {
      fireEvent.click(conflictButton);
    });

    // Should trigger a refetch of /api/reservations
    await waitFor(() => {
      const newFetchCallCount = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(newFetchCallCount).toBeGreaterThan(initialFetchCallCount);

      // Verify it was a reservations API call
      const recentCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.slice(initialFetchCallCount);
      const hasReservationCall = recentCalls.some((call) => {
        const url = typeof call[0] === 'string' ? call[0] : call[0].toString();
        return url.includes('/api/reservations');
      });
      expect(hasReservationCall).toBe(true);
    });
  });
});
