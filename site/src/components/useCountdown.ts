import { useState, useEffect } from 'react';

function formatCountdown(secondsRemaining: number): string {
  if (secondsRemaining <= 0) return 'Expired';
  const days = Math.floor(secondsRemaining / 86400);
  const hours = Math.floor((secondsRemaining % 86400) / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return 'delivers within ' + parts.join(' ');
}

export function useCountdown(expiresAt: number): string {
  const [display, setDisplay] = useState(() =>
    formatCountdown(expiresAt - Math.floor(Date.now() / 1000))
  );

  useEffect(() => {
    function update() {
      setDisplay(formatCountdown(expiresAt - Math.floor(Date.now() / 1000)));
    }
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return display;
}
