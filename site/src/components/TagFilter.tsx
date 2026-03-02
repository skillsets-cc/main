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
  const [visible, setVisible] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const registry = document.getElementById('registry');
    if (!registry) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(registry);
    return () => observer.disconnect();
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
    'px-3 py-1 text-sm rounded-sm transition-colors font-mono cursor-pointer';
  const activeStyles = 'bg-surface-white border border-accent text-accent glow-border-hover shadow-[0_0_10px_rgba(59,130,246,0.1)]';
  const inactiveStyles =
    'bg-surface-paper border border-accent/20 text-text-secondary hover:border-text-secondary hover:text-text-ink';

  function getButtonStyles(isActive: boolean): string {
    return `${baseButtonStyles} ${isActive ? activeStyles : inactiveStyles}`;
  }

  const bar = (
    <div className={`fixed bottom-0 left-0 right-0 z-50 border-t border-accent/20 bg-[#020202]/90 backdrop-blur-sm pl-4 pr-4 py-3 md:pl-20 transition-all duration-300 ${visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-full pointer-events-none'}`}>
      <div className="flex overflow-x-auto scrollbar-hide">
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
