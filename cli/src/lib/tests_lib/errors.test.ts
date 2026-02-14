import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleError } from '../errors.js';

describe('handleError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  it('logs Error message and exits with code 1', () => {
    handleError(new Error('test error'));

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('test error'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('logs non-Error values and exits with code 1', () => {
    handleError('string error');

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Unexpected error'));
    expect(console.error).toHaveBeenCalledWith('string error');
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
