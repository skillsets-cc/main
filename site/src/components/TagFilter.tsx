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
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  useEffect(() => {
    setMounted(true);
    const registry = document.getElementById('registry');
    if (!registry) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(registry);

    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      const onEnter = () => setSidebarExpanded(true);
      const onLeave = () => setSidebarExpanded(false);
      sidebar.addEventListener('mouseenter', onEnter);
      sidebar.addEventListener('mouseleave', onLeave);
      return () => {
        observer.disconnect();
        sidebar.removeEventListener('mouseenter', onEnter);
        sidebar.removeEventListener('mouseleave', onLeave);
      };
    }
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

  const base = 'px-3 py-1 text-sm rounded-sm transition-colors font-mono cursor-pointer flex-shrink-0';
  const active = 'bg-black border border-accent text-accent glow-border-hover';
  const inactive = 'bg-black border border-accent/20 text-text-secondary glow-border-hover';

  if (!mounted) return null;

  return createPortal(
    <div className={`fixed bottom-0 left-0 md:right-[14px] right-0 z-50 overflow-hidden border-t border-accent/20 bg-black/80 shadow-[0_-8px_32px_rgba(0,0,0,0.9),_0_-2px_15px_rgba(249,115,22,0.05)] transition-all duration-300 ${sidebarExpanded ? 'md:left-64' : 'md:left-16'} ${visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-full pointer-events-none'}`}>
      <div className="surface-speckle" />
      <div className="surface-gloss" />
      <div className="specular-edge-top" />
      <div className="relative z-10 flex overflow-x-auto scrollbar-hide px-4 py-3">
        <div className="flex gap-2 flex-nowrap">
          <button
            onClick={() => setSelectedTag(null)}
            className={`${base} ${selectedTag === null ? active : inactive}`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`${base} ${selectedTag === tag ? active : inactive}`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
