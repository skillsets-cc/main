import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import SkillsetGrid from '../SkillsetGrid';
import { mockSkillsets } from './fixtures';

describe('SkillsetGrid', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch() {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/star')) {
        const skillsetId = new URL(url, 'http://localhost').searchParams.get('skillsetId');
        const skillset = mockSkillsets.find((s) => s.id === skillsetId);
        return Promise.resolve({
          ok: true,
          json: async () => ({ count: skillset?.stars ?? 0, starred: false }),
        });
      }
      return Promise.resolve({ ok: false });
    }) as typeof fetch;
  }

  // Helper to render and wait for all star fetches to complete
  async function renderAndWaitForStars() {
    mockFetch();

    await act(async () => {
      render(<SkillsetGrid skillsets={mockSkillsets} />);
    });

    // Wait for all star count fetches to complete
    await waitFor(() => {
      const fetchCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const starCalls = fetchCalls.filter((call) => call[0].includes('/api/star'));
      expect(starCalls.length).toBe(mockSkillsets.length);
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

    // Verify API was called for each skillset
    const fetchCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const starCalls = fetchCalls.filter((call) =>
      call[0].includes('/api/star')
    );
    expect(starCalls.length).toBe(mockSkillsets.length);
  });

  it('displays live star counts when available', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('supercollectible') && url.includes('The_Skillset')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ count: 999, starred: false }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ count: 0, starred: false }),
      });
    }) as typeof fetch;

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
