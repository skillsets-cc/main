import { useState, type ReactElement } from 'react';
import { useCountdown } from './useCountdown.js';

interface GhostCardProps {
  slotId: string;
  index: number;
  total: number;
  status: 'available' | 'reserved';
  expiresAt?: number;
  isOwn: boolean;
  onReserved: (slotId: string, expiresAt: number) => void;
  onCancelled: () => void;
  onConflict: () => void;
}

export default function GhostCard({
  slotId,
  index,
  total,
  status,
  expiresAt,
  isOwn,
  onReserved,
  onCancelled,
  onConflict,
}: GhostCardProps): ReactElement {
  const [loading, setLoading] = useState(false);
  const countdown = useCountdown(expiresAt ?? 0);

  const handleReserve = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId }),
        credentials: 'include',
      });

      if (response.status === 401) {
        window.location.href = '/login?returnTo=/';
        return;
      }

      if (response.status === 409) {
        onConflict();
        return;
      }

      if (response.status === 201) {
        const data = await response.json() as { slotId: string; expiresAt: number };
        onReserved(data.slotId, data.expiresAt);
      }
    } catch (error) {
      console.error('[GhostCard] Reserve failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reservations', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        onCancelled();
      }
    } catch (error) {
      console.error('[GhostCard] Cancel failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const placeholderColor = status === 'available' ? 'bg-border-ink/20' : 'bg-border-ink/30';

  return (
    <article
      className={`group border-b border-dashed py-6 transition-colors ${
        status === 'available'
          ? 'border-border-ink'
          : 'border-orange-500/30'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2 mb-2">
        {status === 'reserved' ? (
          <span className="text-text-tertiary font-mono text-sm flex items-center gap-2">
            Claimed by <span className={`${placeholderColor} inline-block h-3 w-28 rounded-none`} />
          </span>
        ) : (
          <div className={`${placeholderColor} rounded-none h-4 w-48`} />
        )}
        <span className="font-mono text-xs text-text-tertiary">{index}/{total}</span>
      </div>

      <div className="mb-3 space-y-2">
        <div className={`${placeholderColor} rounded-none h-3 w-full max-w-lg`} />
        <div className={`${placeholderColor} rounded-none h-3 w-3/4 max-w-sm`} />
      </div>

      <div className="flex items-center gap-4">
        {status === 'available' ? (
          <button
            onClick={handleReserve}
            disabled={loading}
            className="border border-border-ink text-text-secondary hover:border-orange-500 hover:text-orange-500 px-3 py-1 text-sm font-mono transition-colors disabled:opacity-50"
          >
            Claim
          </button>
        ) : (
          <>
            <span
              className={`font-mono text-xs ${
                isOwn ? 'text-orange-500' : 'text-orange-500/50'
              }`}
            >
              {countdown}
            </span>
            {isOwn && (
              <button
                onClick={handleCancel}
                disabled={loading}
                className="text-xs text-text-tertiary hover:text-status-error underline disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
}
