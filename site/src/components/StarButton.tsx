import { useState } from 'react';

interface StarButtonProps {
  skillsetId: string;
  initialStars?: number;
  initialStarred?: boolean;
}

export default function StarButton({
  skillsetId,
  initialStars = 0,
  initialStarred = false,
}: StarButtonProps) {
  const [stars, setStars] = useState(initialStars);
  const [starred, setStarred] = useState(initialStarred);
  const [loading, setLoading] = useState(false);

  const handleToggleStar = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/star', {
        method: starred ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillsetId }),
        credentials: 'include',
      });

      if (response.status === 401) {
        window.location.href = '/api/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to toggle star');
      }

      setStarred(!starred);
      setStars(starred ? stars - 1 : stars + 1);
    } catch (error) {
      console.error('[StarButton] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleStar}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-mono font-bold transition-all border ${starred
          ? 'bg-orange-500 text-white border-orange-500'
          : 'bg-stone-50 border-border-ink text-text-secondary hover:border-orange-500 hover:text-orange-500'
        }`}
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
