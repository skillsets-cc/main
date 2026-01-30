import { useState, useMemo } from 'react';
import type { SearchIndexEntry } from '@/types';

interface TagFilterProps {
  skillsets: SearchIndexEntry[];
  onResultsChange: (results: SearchIndexEntry[]) => void;
}

export default function TagFilter({ skillsets, onResultsChange }: TagFilterProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    skillsets.forEach(skillset => {
      skillset.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [skillsets]);

  const filteredResults = useMemo(() => {
    if (!selectedTag) return skillsets;
    return skillsets.filter(skillset => skillset.tags.includes(selectedTag));
  }, [selectedTag, skillsets]);

  useMemo(() => {
    onResultsChange(filteredResults);
  }, [filteredResults, onResultsChange]);

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      <button
        onClick={() => setSelectedTag(null)}
        className={`px-3 py-1 text-sm rounded-full transition-colors ${!selectedTag
          ? 'bg-orange-500 text-white'
          : 'bg-stone-50 border border-border-ink text-text-secondary hover:border-orange-500'
          }`}
      >
        All
      </button>
      {allTags.map(tag => (
        <button
          key={tag}
          onClick={() => setSelectedTag(tag)}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedTag === tag
            ? 'bg-orange-500 text-white'
            : 'bg-stone-50 border border-border-ink text-text-secondary hover:border-orange-500'
            }`}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
