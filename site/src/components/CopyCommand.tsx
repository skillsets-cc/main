import { useState, type ReactElement } from 'react';

interface CopyCommandProps {
  command: string;
}

export default function CopyCommand({ command }: CopyCommandProps): ReactElement {
  const [copied, setCopied] = useState(false);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('[CopyCommand] Failed to copy:', error);
    }
  }

  return (
    <section className="border border-border-ink bg-stone-50 p-6 rounded-none">
      <h2 className="text-sm font-bold font-mono mb-4 text-text-ink uppercase tracking-wider border-b border-border-ink pb-2 inline-block">Install</h2>
      <div className="flex items-center gap-2 bg-white border border-border-ink p-4 rounded-none">
        <pre className="flex-1 overflow-x-auto">
          <code>{command}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="text-orange-500 font-mono text-sm font-bold hover:underline transition-colors flex-shrink-0"
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>
      <p className="mt-3 text-xs text-text-tertiary font-mono">
        <a href="/cli" className="text-orange-500 hover:underline">More CLI commands</a> — search, list, verify
      </p>
    </section>
  );
}
