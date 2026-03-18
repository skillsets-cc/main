import { describe, it, expect, vi, beforeAll } from 'vitest';

const actions = new Map<string, Function>();

vi.mock('commander', () => {
  let lastCmd = '';
  const chain: Record<string, any> = {};
  for (const m of ['name', 'description', 'version', 'argument', 'option']) {
    chain[m] = vi.fn(() => chain);
  }
  chain.command = vi.fn((name: string) => { lastCmd = name; return chain; });
  chain.action = vi.fn((cb: Function) => { actions.set(lastCmd, cb); return chain; });
  chain.parse = vi.fn();
  return { program: chain };
});

vi.mock('../commands/install.js', () => ({ install: vi.fn() }));
vi.mock('../commands/init.js', () => ({ init: vi.fn() }));
vi.mock('../commands/audit.js', () => ({ audit: vi.fn() }));
vi.mock('../commands/submit.js', () => ({ submit: vi.fn() }));
vi.mock('../lib/errors.js', () => ({ handleError: vi.fn() }));

describe('CLI entry point', () => {
  beforeAll(async () => {
    await import('../index.js');
  });

  it('registers all 4 commands', () => {
    expect(actions.size).toBe(4);
    for (const cmd of ['install', 'init', 'audit', 'submit']) {
      expect(actions.has(cmd)).toBe(true);
    }
  });

  it('run wrapper calls underlying command', async () => {
    const { install } = await import('../commands/install.js');
    vi.mocked(install).mockResolvedValue(undefined);

    await actions.get('install')!('@user/test', {});

    expect(install).toHaveBeenCalled();
  });

  it('run wrapper catches errors and delegates to handleError', async () => {
    const { install } = await import('../commands/install.js');
    const { handleError } = await import('../lib/errors.js');

    const error = new Error('test error');
    vi.mocked(install).mockRejectedValue(error);

    await actions.get('install')!('@user/test', {});

    expect(handleError).toHaveBeenCalledWith(error);
  });
});
