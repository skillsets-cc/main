import { useState, useEffect, useRef, type ReactElement } from 'react';

interface CopyCommandProps {
  command: string;
  heading?: string;
  disclaimer?: string;
}

export default function CopyCommand({ command, heading, disclaimer }: CopyCommandProps): ReactElement {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);

      // Clear any existing timeout before setting a new one
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('[CopyCommand] Failed to copy:', error);
    }
  }

  const isSection = !!heading;

  const inner = (
    <div className="bg-surface-white border border-border-ink p-4 rounded-none">
      <div className="flex items-center gap-2">
        <pre className="flex-1 overflow-x-auto">
          <code>{command}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="text-accent font-mono text-sm font-bold hover:underline transition-colors flex-shrink-0"
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );

  if (!isSection) {
    return inner;
  }

  return (
    <section className="border border-border-ink bg-surface-paper p-6 rounded-none">
      <h2 className="text-sm font-bold font-mono mb-4 text-text-ink uppercase tracking-wider border-b border-border-ink pb-2 inline-block">{heading}</h2>
      {inner}
      <p className="mt-3 text-xs text-text-tertiary font-mono">
        <a href="/cli" className="text-accent hover:underline">More CLI commands</a> — search, list
      </p>
      {disclaimer && (
        <p className="mt-2 text-lg text-text-tertiary font-serif italic">
          {disclaimer}
        </p>
      )}
    </section>
  );
}
