import { useState, useEffect, type ReactElement } from 'react';

interface DownloadCountProps {
  skillsetId: string;
  initialCount?: number;
}

export default function DownloadCount({
  skillsetId,
  initialCount = 0,
}: DownloadCountProps): ReactElement {
  const [count, setCount] = useState(initialCount);

  // Fetch actual count on mount
  useEffect(() => {
    async function fetchCount(): Promise<void> {
      try {
        const response = await fetch('/api/stats/counts');
        if (response.ok) {
          const data = (await response.json()) as {
            downloads: Record<string, number>;
          };
          const downloads = data.downloads[skillsetId] ?? initialCount;
          setCount(downloads);
        }
      } catch (error) {
        console.error('[DownloadCount] Failed to fetch:', error);
      }
    }
    fetchCount();
  }, [skillsetId, initialCount]);

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-text-secondary">
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <span>{count}</span>
    </div>
  );
}
