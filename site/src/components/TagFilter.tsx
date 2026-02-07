import { useState, useMemo, useEffect, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import type { SearchIndexEntry } from '@/types';

interface TagFilterProps {
  skillsets: SearchIndexEntry[];
  onResultsChange: (results: SearchIndexEntry[]) => void;
}

export default function TagFilter({
  skillsets,
  onResultsChange,
}: TagFilterProps): ReactElement | null {
  const [mounted, setMounted] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
  const activeStyles = 'bg-white border border-orange-500 text-orange-500';
  const inactiveStyles =
    'bg-stone-50 border border-border-ink text-text-secondary hover:border-orange-500';

  function getButtonStyles(isActive: boolean): string {
    return `${baseButtonStyles} ${isActive ? activeStyles : inactiveStyles}`;
  }

  const bar = (
    <div className="fixed bottom-0 left-0 right-0 md:left-64 z-50 border-t border-border-ink bg-white/90 backdrop-blur-sm px-4 py-3">
      <div className="flex justify-center overflow-x-auto">
        <div className="flex gap-2 flex-nowrap">
          <button
            onClick={() => setSelectedTag(null)}
            className={`${getButtonStyles(!selectedTag)} flex-shrink-0`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`${getButtonStyles(selectedTag === tag)} flex-shrink-0`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;

  return createPortal(bar, document.body);
}
