import { useState, useMemo, useEffect, type ReactElement } from 'react';
import type { SearchIndexEntry } from '@/types';

interface TagFilterProps {
  skillsets: SearchIndexEntry[];
  onResultsChange: (results: SearchIndexEntry[]) => void;
}

export default function TagFilter({
  skillsets,
  onResultsChange,
}: TagFilterProps): ReactElement {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const skillset of skillsets) {
      for (const tag of skillset.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }, [skillsets]);

  const filteredResults = useMemo(() => {
    if (!selectedTag) return skillsets;
    return skillsets.filter((skillset) => skillset.tags.includes(selectedTag));
  }, [selectedTag, skillsets]);

  useEffect(() => {
    onResultsChange(filteredResults);
  }, [filteredResults, onResultsChange]);

  const baseButtonStyles =
    'px-3 py-1 text-sm rounded-none transition-colors';
  const activeStyles = 'bg-orange-500 text-white';
  const inactiveStyles =
    'bg-stone-50 border border-border-ink text-text-secondary hover:border-orange-500';

  function getButtonStyles(isActive: boolean): string {
    return `${baseButtonStyles} ${isActive ? activeStyles : inactiveStyles}`;
  }

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      <button
        onClick={() => setSelectedTag(null)}
        className={getButtonStyles(!selectedTag)}
      >
        All
      </button>
      {allTags.map((tag) => (
        <button
          key={tag}
          onClick={() => setSelectedTag(tag)}
          className={getButtonStyles(selectedTag === tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
