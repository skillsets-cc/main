import { useState, type ReactElement } from 'react';
import { useCountdown } from './useCountdown.js';
import SurfaceLayers from './SurfaceLayers.js';

interface GhostCardProps {
  batchId: string;
  status: 'available' | 'reserved' | 'submitted';
  expiresAt?: number;
  skillsetId?: string;
  isOwn: boolean;
  onReserved: (batchId: string, expiresAt: number) => void;
  onCancelled: () => void;
  onConflict: () => void;
}

export default function GhostCard({
  batchId,
  status,
  expiresAt,
  skillsetId,
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
        body: JSON.stringify({ batchId }),
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
        const data = await response.json() as { batchId: string; expiresAt: number };
        onReserved(data.batchId, data.expiresAt);
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

  // Handle submitted state
  if (status === 'submitted') {
    const href = skillsetId
      ? `/skillset/${skillsetId.replace('@', '')}`
      : undefined;

    const content = (
      <article className="group surface-panel mb-4 border border-dashed border-status-success/30 hover:border-status-success/60 transition-colors">
        <SurfaceLayers />
        <div className="relative z-10 py-4 px-4 md:py-6 md:px-6">
          <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2 mb-2">
            <span className="text-text-secondary font-mono text-sm">
              {skillsetId ?? 'Submitted — pending rebuild'}
            </span>
            <span className="font-mono text-xs text-status-success/80">{batchId}</span>
          </div>
          <div className="pt-2 border-t border-status-success/10 mt-2">
            <span className="text-xs font-mono text-status-success border border-status-success/30 px-2 py-0.5 rounded-sm bg-status-success/10">Submitted</span>
          </div>
        </div>
      </article>
    );

    return href ? <a href={href}>{content}</a> : content;
  }

  const placeholderColor = status === 'available' ? 'bg-border-ink/20' : 'bg-border-ink/30';

  return (
    <article
      className={`group surface-panel mb-4 border border-dashed transition-all ${status === 'available'
          ? 'border-accent/20 hover:border-accent/40'
          : 'border-accent/30 hover:border-accent/50'
        }`}
    >
      <SurfaceLayers />
      <div className="relative z-10 py-4 px-4 md:py-6 md:px-6">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-1 md:gap-2 mb-1 md:mb-2">
          {status === 'reserved' ? (
            <span className="text-text-tertiary font-mono text-sm flex items-center gap-2">
              Claimed by <span className={`${placeholderColor} inline-block h-5 w-28 rounded-sm`} />
            </span>
          ) : (
            <div className={`${placeholderColor} rounded-sm h-5 w-48`} />
          )}
          <span className={`font-mono text-xs ${status === 'reserved' ? 'text-accent/80' : 'text-text-tertiary'}`}>{batchId}</span>
        </div>

        <div className="mb-4 space-y-2">
          <div className={`${placeholderColor} rounded-sm h-4 w-full max-w-lg`} />
          <div className={`${placeholderColor} rounded-sm h-4 w-3/4 max-w-sm`} />
        </div>

        <div className="flex items-center gap-4 pt-2 border-t border-border-ink/50">
          {status === 'available' ? (
            <button
              onClick={handleReserve}
              disabled={loading}
              className="border border-accent/20 bg-black text-text-secondary hover:border-accent hover:text-accent px-4 py-1.5 text-sm font-mono transition-colors disabled:opacity-50 rounded-sm glow-border-hover"
            >
              CLAIM_SLOT
            </button>
          ) : (
            <>
              <span className={`font-mono text-sm font-bold ${isOwn ? 'text-accent' : 'text-accent/50'}`}>
                {countdown}
              </span>
              {isOwn && (
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="text-xs text-status-warning hover:text-status-error underline disabled:opacity-50 ml-auto"
                >
                  Cancel Reservation
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
