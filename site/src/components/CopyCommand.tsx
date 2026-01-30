import { useState } from 'react';

interface CopyCommandProps {
  command: string;
}

export default function CopyCommand({ command }: CopyCommandProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('[CopyCommand] Failed to copy:', error);
    }
  };

  return (
    <div className="glass-surface p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Install</h2>
      <div className="flex items-center gap-2 bg-surface-glassDark p-4 rounded">
        <pre className="flex-1 overflow-x-auto">
          <code>{command}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="px-4 py-2 rounded-none bg-orange-500 text-white hover:bg-opacity-90 transition-colors flex-shrink-0 font-mono text-sm font-bold"
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
