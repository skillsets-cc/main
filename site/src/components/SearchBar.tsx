import { useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import type { SearchIndexEntry } from '@/types';

interface SearchBarProps {
  skillsets: SearchIndexEntry[];
  onResultsChange: (results: SearchIndexEntry[]) => void;
}

export default function SearchBar({ skillsets, onResultsChange }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const fuse = useMemo(
    () =>
      new Fuse(skillsets, {
        keys: ['name', 'description', 'tags', 'author'],
        threshold: 0.3,
      }),
    [skillsets]
  );

  const results = useMemo(() => {
    if (!query) return skillsets;
    return fuse.search(query).map((result) => result.item);
  }, [query, fuse, skillsets]);

  useMemo(() => {
    onResultsChange(results);
  }, [results, onResultsChange]);

  return (
    <div className="mb-8">
      <input
        type="text"
        placeholder="Search skillsets..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-4 py-3 rounded-none bg-white border border-border-ink focus:border-orange-500 focus:outline-none transition-colors text-text-ink font-mono placeholder:text-text-tertiary"
      />

      {query && (
        <p className="mt-2 text-sm text-text-secondary">
          {results.length} result{results.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
