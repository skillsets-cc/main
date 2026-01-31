import { useState, useMemo, type ReactElement } from 'react';
import type { SearchIndexEntry } from '@/types';
import SearchBar from './SearchBar.js';
import TagFilter from './TagFilter.js';

interface SkillsetGridProps {
  skillsets: SearchIndexEntry[];
}

export default function SkillsetGrid({
  skillsets,
}: SkillsetGridProps): ReactElement {
  const [searchResults, setSearchResults] =
    useState<SearchIndexEntry[]>(skillsets);
  const [tagResults, setTagResults] = useState<SearchIndexEntry[]>(skillsets);

  const tagResultIds = useMemo(
    () => new Set(tagResults.map((s) => s.id)),
    [tagResults]
  );

  const finalResults = useMemo(
    () => searchResults.filter((s) => tagResultIds.has(s.id)),
    [searchResults, tagResultIds]
  );

  return (
    <div>
      <SearchBar skillsets={skillsets} onResultsChange={setSearchResults} />
      <TagFilter skillsets={skillsets} onResultsChange={setTagResults} />

      <div className="flex flex-col border-t border-border-ink">
        {finalResults.map(skillset => {
          const [namespace, name] = skillset.id.split('/');
          return (
            <article key={skillset.id} className="group border-b border-border-ink py-6 hover:bg-stone-50 transition-colors cursor-pointer">
              <a href={`/skillset/${namespace}/${name}`} className="block">
                <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2 mb-2">
                  <h3 className="text-2xl font-serif font-bold text-text-ink group-hover:text-orange-500 transition-colors">
                    {skillset.name}
                  </h3>
                  <span className="font-mono text-xs text-text-tertiary">
                    v{skillset.version} • {skillset.author.handle}
                  </span>
                </div>
                <p className="text-text-secondary font-serif leading-relaxed max-w-3xl mb-3">
                  {skillset.description}
                </p>

                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-xs font-mono text-text-tertiary">
                    <svg className="w-3 h-3 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    {skillset.stars}
                  </span>

                  {skillset.tags.map(tag => (
                    <span key={tag} className="text-xs font-mono text-text-tertiary border border-border-light px-1 rounded-none">
                      #{tag}
                    </span>
                  ))}
                </div>
              </a>
            </article>
          );
        })}
      </div>

      {finalResults.length === 0 && (
        <div className="text-center py-12 text-text-secondary">
          <p>No skillsets found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
