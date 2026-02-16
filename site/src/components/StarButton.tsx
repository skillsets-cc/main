import { useState, useEffect, type ReactElement } from 'react';

interface StarButtonProps {
  skillsetId: string;
  initialStars?: number;
}

const BASE_STYLES =
  'flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-mono font-bold transition-all border';
const STARRED_STYLES = 'bg-surface-paper border-accent text-accent';
const UNSTARRED_STYLES =
  'bg-surface-paper border-border-ink text-text-secondary hover:border-accent hover:text-accent';

export default function StarButton({
  skillsetId,
  initialStars = 0,
}: StarButtonProps): ReactElement {
  const [stars, setStars] = useState(initialStars);
  const [starred, setStarred] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch actual star state on mount
  useEffect(() => {
    async function fetchStarState(): Promise<void> {
      try {
        const response = await fetch(`/api/star?skillsetId=${encodeURIComponent(skillsetId)}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = (await response.json()) as { count: number; starred: boolean };
          setStars(data.count);
          setStarred(data.starred);
        }
      } catch (error) {
        console.error('[StarButton] Failed to fetch star state:', error);
      }
    }
    fetchStarState();
  }, [skillsetId]);

  async function handleToggleStar(): Promise<void> {
    setLoading(true);

    try {
      const response = await fetch('/api/star', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillsetId }),
        credentials: 'include',
      });

      if (response.status === 401) {
        window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to toggle star');
      }

      // Reconcile with server-authoritative response
      const result = (await response.json()) as { starred: boolean; count: number };
      setStarred(result.starred);
      setStars(result.count);
    } catch (error) {
      console.error('[StarButton] Error:', error);
    } finally {
      setLoading(false);
    }
  }

  const buttonStyles = starred ? STARRED_STYLES : UNSTARRED_STYLES;

  return (
    <button
      onClick={handleToggleStar}
      disabled={loading}
      className={`${BASE_STYLES} ${buttonStyles}`}
    >
      <svg
        className={`w-5 h-5 ${starred ? 'fill-current' : 'stroke-current fill-none'}`}
        viewBox="0 0 24 24"
        strokeWidth="2"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      <span>{stars}</span>
    </button>
  );
}
