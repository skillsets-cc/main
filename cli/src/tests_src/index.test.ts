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

vi.mock('../commands/search.js', () => ({ search: vi.fn() }));
vi.mock('../commands/list.js', () => ({ list: vi.fn() }));
vi.mock('../commands/view.js', () => ({ view: vi.fn() }));
vi.mock('../commands/install.js', () => ({ install: vi.fn() }));
vi.mock('../commands/init.js', () => ({ init: vi.fn() }));
vi.mock('../commands/audit.js', () => ({ audit: vi.fn() }));
vi.mock('../commands/submit.js', () => ({ submit: vi.fn() }));
vi.mock('../lib/errors.js', () => ({ handleError: vi.fn() }));

describe('CLI entry point', () => {
  beforeAll(async () => {
    await import('../index.js');
  });

  it('registers all 7 commands', () => {
    expect(actions.size).toBe(7);
    for (const cmd of ['list', 'search', 'view', 'install', 'init', 'audit', 'submit']) {
      expect(actions.has(cmd)).toBe(true);
    }
  });

  it('run wrapper calls underlying command', async () => {
    const { list } = await import('../commands/list.js');
    vi.mocked(list).mockResolvedValue(undefined);

    await actions.get('list')!({});

    expect(list).toHaveBeenCalled();
  });

  it('run wrapper catches errors and delegates to handleError', async () => {
    const { search } = await import('../commands/search.js');
    const { handleError } = await import('../lib/errors.js');

    const error = new Error('test error');
    vi.mocked(search).mockRejectedValue(error);

    await actions.get('search')!('query', {});

    expect(handleError).toHaveBeenCalledWith(error);
  });
});
