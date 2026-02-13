import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TagFilter from '../TagFilter';
import { mockSkillsets } from './fixtures';

describe('TagFilter', () => {
  it('renders All button', () => {
    const onResultsChange = vi.fn();
    render(<TagFilter skillsets={mockSkillsets} onResultsChange={onResultsChange} />);

    expect(screen.getByText('All')).toBeDefined();
  });

  it('renders all unique tags from skillsets', () => {
    const onResultsChange = vi.fn();
    render(<TagFilter skillsets={mockSkillsets} onResultsChange={onResultsChange} />);

    // Tags from fixtures: sdlc, planning, multi-agent, code-review, quality, testing
    expect(screen.getByText('sdlc')).toBeDefined();
    expect(screen.getByText('planning')).toBeDefined();
    expect(screen.getByText('multi-agent')).toBeDefined();
    expect(screen.getByText('code-review')).toBeDefined();
    expect(screen.getByText('quality')).toBeDefined();
    expect(screen.getByText('testing')).toBeDefined();
  });

  it('calls onResultsChange with all skillsets initially', async () => {
    const onResultsChange = vi.fn();
    render(<TagFilter skillsets={mockSkillsets} onResultsChange={onResultsChange} />);

    await waitFor(() => {
      expect(onResultsChange).toHaveBeenCalledWith(mockSkillsets);
    });
  });

  it('filters by selected tag', async () => {
    const onResultsChange = vi.fn();
    render(<TagFilter skillsets={mockSkillsets} onResultsChange={onResultsChange} />);

    fireEvent.click(screen.getByText('testing'));

    await waitFor(() => {
      const lastCall = onResultsChange.mock.calls[onResultsChange.mock.calls.length - 1];
      const results = lastCall[0];
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Testing Framework');
    });
  });

  it('filters to skillsets with shared tag', async () => {
    const onResultsChange = vi.fn();
    render(<TagFilter skillsets={mockSkillsets} onResultsChange={onResultsChange} />);

    fireEvent.click(screen.getByText('quality'));

    await waitFor(() => {
      const lastCall = onResultsChange.mock.calls[onResultsChange.mock.calls.length - 1];
      const results = lastCall[0];
      expect(results.length).toBe(2);
      expect(results.some((r: typeof mockSkillsets[0]) => r.name === 'Code Review Assistant')).toBe(true);
      expect(results.some((r: typeof mockSkillsets[0]) => r.name === 'Testing Framework')).toBe(true);
    });
  });

  it('returns all skillsets when All is clicked', async () => {
    const onResultsChange = vi.fn();
    render(<TagFilter skillsets={mockSkillsets} onResultsChange={onResultsChange} />);

    // First select a tag
    fireEvent.click(screen.getByText('testing'));

    // Then click All
    fireEvent.click(screen.getByText('All'));

    await waitFor(() => {
      const lastCall = onResultsChange.mock.calls[onResultsChange.mock.calls.length - 1];
      expect(lastCall[0].length).toBe(mockSkillsets.length);
    });
  });

  it('sorts tags alphabetically', () => {
    const onResultsChange = vi.fn();
    render(<TagFilter skillsets={mockSkillsets} onResultsChange={onResultsChange} />);

    const buttons = screen.getAllByRole('button');
    // First button is "All", rest should be sorted
    const tagButtons = buttons.slice(1);
    const tagTexts = tagButtons.map((b) => b.textContent);

    const sorted = [...tagTexts].sort();
    expect(tagTexts).toEqual(sorted);
  });
});
