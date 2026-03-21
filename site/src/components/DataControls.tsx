import { useState, useEffect } from 'react';

type State = 'idle' | 'loading' | 'confirm' | 'deleted' | 'error';

export default function DataControls() {
  const [state, setState] = useState<State>('idle');
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then(res => setLoggedIn(res.ok))
      .catch(() => setLoggedIn(false));
  }, []);

  if (!loggedIn) return null;

  async function handleExport() {
    setState('loading');
    try {
      const res = await fetch('/api/me', { credentials: 'include' });
      if (res.status === 401) {
        window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'skillsets-cc-data.json';
      a.click();
      URL.revokeObjectURL(url);
      setState('idle');
    } catch {
      setState('error');
    }
  }

  function handleDelete() {
    setState('confirm');
  }

  async function confirmDelete() {
    setState('loading');
    try {
      const res = await fetch('/api/me', { method: 'DELETE', credentials: 'include' });
      if (res.status === 401) {
        window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      if (!res.ok) throw new Error('Delete failed');
      setState('deleted');
      setTimeout(() => { window.location.href = '/'; }, 2000);
    } catch {
      setState('error');
    }
  }

  const buttonBase = 'px-4 py-2 rounded-sm text-sm font-mono font-bold transition-all border';
  const primaryButton = `${buttonBase} bg-black border-accent text-accent hover:bg-accent hover:text-black`;
  const dangerButton = `${buttonBase} bg-black border-status-error text-status-error hover:bg-status-error hover:text-black`;
  const confirmButton = `${buttonBase} bg-status-error border-status-error text-white`;

  return (
    <section className="mt-12 pt-8 border-t border-accent/20">
      <h2 className="text-2xl font-medium font-serif text-text-ink mb-6">Your Data</h2>
      <div className="flex flex-wrap gap-4">
        <button onClick={handleExport} className={primaryButton} disabled={state === 'loading'}>
          Export My Data
        </button>
        {state === 'confirm' ? (
          <button onClick={confirmDelete} className={confirmButton}>
            Are you sure? This cannot be undone.
          </button>
        ) : (
          <button
            onClick={handleDelete}
            className={dangerButton}
            disabled={state === 'loading' || state === 'deleted'}
          >
            Delete My Account
          </button>
        )}
      </div>
      <div aria-live="polite" role="status" className="mt-4 text-sm font-mono">
        {state === 'deleted' && (
          <p className="text-status-success">Your data has been deleted. Redirecting...</p>
        )}
        {state === 'error' && (
          <p className="text-status-error">Something went wrong. Please try again.</p>
        )}
      </div>
    </section>
  );
}
