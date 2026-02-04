import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import SkillsetGrid from '../SkillsetGrid';
import { mockSkillsets } from './fixtures';

describe('SkillsetGrid', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch(starOverrides: Record<string, number> = {}) {
    const stars: Record<string, number> = {};
    for (const s of mockSkillsets) {
      stars[s.id] = starOverrides[s.id] ?? s.stars;
    }
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/stats/counts')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ stars, downloads: {} }),
        });
      }
      return Promise.resolve({ ok: false });
    }) as typeof fetch;
  }

  // Helper to render and wait for stats fetch to complete
  async function renderAndWaitForStars() {
    mockFetch();

    await act(async () => {
      render(<SkillsetGrid skillsets={mockSkillsets} />);
    });

    // Wait for the stats fetch to complete
    await waitFor(() => {
      const fetchCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const statsCalls = fetchCalls.filter((call) => call[0].includes('/api/stats/counts'));
      expect(statsCalls.length).toBe(1);
    });
  }

  it('renders all skillsets', async () => {
    await renderAndWaitForStars();

    expect(screen.getByText('The Skillset')).toBeDefined();
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

  it('renders search bar', async () => {
    await renderAndWaitForStars();

    expect(screen.getByPlaceholderText('Search skillsets...')).toBeDefined();
  });

  it('renders tag filter', async () => {
    await renderAndWaitForStars();

    expect(screen.getByText('All')).toBeDefined();
  });

  it('filters by search query', async () => {
    await renderAndWaitForStars();

    const input = screen.getByPlaceholderText('Search skillsets...');
    fireEvent.change(input, { target: { value: 'testing' } });

    await waitFor(() => {
      expect(screen.getByText('Testing Framework')).toBeDefined();
      expect(screen.queryByText('The Skillset')).toBeNull();
    });
  });

  it('filters by tag', async () => {
    await renderAndWaitForStars();

    fireEvent.click(screen.getByText('sdlc'));

    await waitFor(() => {
      expect(screen.getByText('The Skillset')).toBeDefined();
      expect(screen.queryByText('Code Review Assistant')).toBeNull();
    });
  });

  it('combines search and tag filters', async () => {
    await renderAndWaitForStars();

    // Filter by quality tag (matches 2 skillsets)
    fireEvent.click(screen.getByText('quality'));

    await waitFor(() => {
      expect(screen.getByText('Code Review Assistant')).toBeDefined();
      expect(screen.getByText('Testing Framework')).toBeDefined();
    });

    // Then search for "testing" (matches 1 of those 2)
    const input = screen.getByPlaceholderText('Search skillsets...');
    fireEvent.change(input, { target: { value: 'testing' } });

    await waitFor(() => {
      expect(screen.getByText('Testing Framework')).toBeDefined();
      expect(screen.queryByText('Code Review Assistant')).toBeNull();
    });
  });

  it('shows empty message when no results', async () => {
    await renderAndWaitForStars();

    const input = screen.getByPlaceholderText('Search skillsets...');
    fireEvent.change(input, { target: { value: 'nonexistent-query-xyz' } });

    await waitFor(() => {
      expect(screen.getByText('No skillsets found matching your criteria.')).toBeDefined();
    });
  });

  it('links to skillset detail page', async () => {
    await renderAndWaitForStars();

    const link = screen.getByText('The Skillset').closest('a');
    expect(link?.getAttribute('href')).toBe('/skillset/supercollectible/The_Skillset');
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
    mockFetch({ 'supercollectible/The_Skillset': 999 });

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
});
