import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SearchBar from '../SearchBar';
import { mockSkillsets } from './fixtures';

describe('SearchBar', () => {
  it('renders input with placeholder', () => {
    const onResultsChange = vi.fn();
    render(<SearchBar skillsets={mockSkillsets} onResultsChange={onResultsChange} />);

    const input = screen.getByPlaceholderText('Search skillsets...');
    expect(input).toBeDefined();
  });

  it('calls onResultsChange with all skillsets initially', async () => {
    const onResultsChange = vi.fn();
    render(<SearchBar skillsets={mockSkillsets} onResultsChange={onResultsChange} />);

    await waitFor(() => {
      expect(onResultsChange).toHaveBeenCalledWith(mockSkillsets);
    });
  });

  it('filters results based on search query', async () => {
    const onResultsChange = vi.fn();
    render(<SearchBar skillsets={mockSkillsets} onResultsChange={onResultsChange} />);

    const input = screen.getByPlaceholderText('Search skillsets...');
    fireEvent.change(input, { target: { value: 'testing' } });

    await waitFor(() => {
      const lastCall = onResultsChange.mock.calls[onResultsChange.mock.calls.length - 1];
      const results = lastCall[0];
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Testing Framework');
    });
  });

  it('searches by name', async () => {
    const onResultsChange = vi.fn();
    render(<SearchBar skillsets={mockSkillsets} onResultsChange={onResultsChange} />);

    const input = screen.getByPlaceholderText('Search skillsets...');
    fireEvent.change(input, { target: { value: 'Skillset' } });

    await waitFor(() => {
      const lastCall = onResultsChange.mock.calls[onResultsChange.mock.calls.length - 1];
      const results = lastCall[0];
      expect(results.some((r: typeof mockSkillsets[0]) => r.name === 'The Skillset')).toBe(true);
    });
  });

  it('searches by description', async () => {
    const onResultsChange = vi.fn();
    render(<SearchBar skillsets={mockSkillsets} onResultsChange={onResultsChange} />);

    const input = screen.getByPlaceholderText('Search skillsets...');
    fireEvent.change(input, { target: { value: 'adversarial' } });

    await waitFor(() => {
      const lastCall = onResultsChange.mock.calls[onResultsChange.mock.calls.length - 1];
      const results = lastCall[0];
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('The Skillset');
    });
  });

  it('searches by tag', async () => {
    const onResultsChange = vi.fn();
    render(<SearchBar skillsets={mockSkillsets} onResultsChange={onResultsChange} />);

    const input = screen.getByPlaceholderText('Search skillsets...');
    fireEvent.change(input, { target: { value: 'quality' } });

    await waitFor(() => {
      const lastCall = onResultsChange.mock.calls[onResultsChange.mock.calls.length - 1];
      const results = lastCall[0];
      expect(results.length).toBe(2);
    });
  });

  it('displays result count when searching', async () => {
    const onResultsChange = vi.fn();
    render(<SearchBar skillsets={mockSkillsets} onResultsChange={onResultsChange} />);

    const input = screen.getByPlaceholderText('Search skillsets...');
    fireEvent.change(input, { target: { value: 'testing' } });

    await waitFor(() => {
      expect(screen.getByText('1 result')).toBeDefined();
    });
  });

  it('uses plural for multiple results', async () => {
    const onResultsChange = vi.fn();
    render(<SearchBar skillsets={mockSkillsets} onResultsChange={onResultsChange} />);

    const input = screen.getByPlaceholderText('Search skillsets...');
    fireEvent.change(input, { target: { value: 'quality' } });

    await waitFor(() => {
      expect(screen.getByText('2 results')).toBeDefined();
    });
  });

  it('returns all results when query is cleared', async () => {
    const onResultsChange = vi.fn();
    render(<SearchBar skillsets={mockSkillsets} onResultsChange={onResultsChange} />);

    const input = screen.getByPlaceholderText('Search skillsets...');
    fireEvent.change(input, { target: { value: 'testing' } });
    fireEvent.change(input, { target: { value: '' } });

    await waitFor(() => {
      const lastCall = onResultsChange.mock.calls[onResultsChange.mock.calls.length - 1];
      expect(lastCall[0].length).toBe(mockSkillsets.length);
    });
  });
});
