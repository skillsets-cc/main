import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import SkillsetGrid from '../SkillsetGrid';
import { mockSkillsets } from './fixtures';

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
});
