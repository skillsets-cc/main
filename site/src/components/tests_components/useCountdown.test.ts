import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCountdown } from '../useCountdown';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-06T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const now = () => Math.floor(Date.now() / 1000);

  it('test_formats_days_hours_minutes', () => {
    const expiresAt = now() + 6 * 86400 + 14 * 3600 + 32 * 60;
    const { result } = renderHook(() => useCountdown(expiresAt));
    expect(result.current).toBe('delivers within 6d 14h 32m');
  });

  it('test_formats_hours_minutes_only', () => {
    const expiresAt = now() + 2 * 3600 + 15 * 60;
    const { result } = renderHook(() => useCountdown(expiresAt));
    expect(result.current).toBe('delivers within 2h 15m');
  });

  it('test_formats_minutes_only', () => {
    const expiresAt = now() + 45 * 60;
    const { result } = renderHook(() => useCountdown(expiresAt));
    expect(result.current).toBe('delivers within 45m');
  });

  it('test_expired', () => {
    const expiresAt = now() - 60;
    const { result } = renderHook(() => useCountdown(expiresAt));
    expect(result.current).toBe('Expired');
  });

  it('test_zero_remaining', () => {
    const expiresAt = now();
    const { result } = renderHook(() => useCountdown(expiresAt));
    expect(result.current).toBe('Expired');
  });

  it('test_interval_cleanup', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const expiresAt = now() + 3600;
    const { unmount } = renderHook(() => useCountdown(expiresAt));
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
