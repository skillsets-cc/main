import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CopyCommand from '../CopyCommand';

describe('CopyCommand', () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    vi.useRealTimers();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.assign(navigator, { clipboard: originalClipboard });
  });

  it('renders the command', () => {
    render(<CopyCommand command="npx skillsets install test/skillset" />);

    expect(screen.getByText('npx skillsets install test/skillset')).toBeDefined();
  });

  it('renders Copy button', () => {
    render(<CopyCommand command="npx skillsets install test/skillset" />);

    expect(screen.getByText('Copy')).toBeDefined();
  });

  it('copies command to clipboard on click', async () => {
    render(<CopyCommand command="npx skillsets install test/skillset" />);

    fireEvent.click(screen.getByText('Copy'));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'npx skillsets install test/skillset'
      );
    });
  });

  it('shows Copied! after clicking', async () => {
    render(<CopyCommand command="npx skillsets install test/skillset" />);

    fireEvent.click(screen.getByText('Copy'));

    await waitFor(() => {
      expect(screen.getByText('✓ Copied!')).toBeDefined();
    });
  });

  it('reverts to Copy after timeout', async () => {
    vi.useFakeTimers();

    render(<CopyCommand command="npx skillsets install test/skillset" />);

    // Click and wait for clipboard promise to resolve
    await act(async () => {
      fireEvent.click(screen.getByText('Copy'));
      // Let the clipboard promise resolve
      await Promise.resolve();
    });

    // Should show Copied! now
    expect(screen.getByText('✓ Copied!')).toBeDefined();

    // Advance past the 2 second timeout
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });

    // Should be back to Copy
    expect(screen.getByText('Copy')).toBeDefined();

    vi.useRealTimers();
  });

  it('handles clipboard error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Clipboard access denied')
    );

    render(<CopyCommand command="npx skillsets install test/skillset" />);

    fireEvent.click(screen.getByText('Copy'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '[CopyCommand] Failed to copy:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('renders Install heading', () => {
    render(<CopyCommand command="npx skillsets install test/skillset" />);

    expect(screen.getByText('Install')).toBeDefined();
  });

  it('renders link to CLI docs', () => {
    render(<CopyCommand command="npx skillsets install test/skillset" />);

    const link = screen.getByText('More CLI commands');
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/cli');
  });
});
