import { useState, useEffect, useMemo, type ReactElement } from 'react';
import type { SearchIndexEntry, ReservationState } from '@/types';
import TagFilter from './TagFilter.js';
import GhostCard from './GhostCard.js';

interface SkillsetGridProps {
  skillsets: SearchIndexEntry[];
}

function StarIcon(): ReactElement {
  return (
    <svg className="w-3 h-3 text-accent" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

export default function SkillsetGrid({
  skillsets,
}: SkillsetGridProps): ReactElement {
  const [tagResults, setTagResults] = useState<SearchIndexEntry[]>(skillsets);
  const [reservations, setReservations] = useState<ReservationState | null>(null);

  // Fetch reservation state
  useEffect(() => {
    async function fetchReservations(): Promise<void> {
      try {
        const response = await fetch('/api/reservations', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json() as ReservationState;
          setReservations(data);
        }
      } catch {
        // No ghost cards on error
      }
    }
    fetchReservations();
  }, []);

  // Build submitted slot cross-reference: skillsetId → batchId
  const submittedMap = useMemo(() => {
    const map = new Map<string, string>();
    if (reservations) {
      for (const [batchId, slot] of Object.entries(reservations.slots)) {
        if (slot.status === 'submitted' && slot.skillsetId) {
          map.set(slot.skillsetId, batchId);
        }
      }
    }
    return map;
  }, [reservations]);

  const handleSlotReserved = (sid: string, exp: number) => {
    setReservations(prev => prev ? {
      ...prev,
      userSlot: sid,
      slots: { ...prev.slots, [sid]: { status: 'reserved', expiresAt: exp } },
    } : prev);
  };

  const handleSlotCancelled = () => {
    setReservations(prev => prev ? {
      ...prev,
      userSlot: null,
      slots: {
        ...prev.slots,
        ...(prev.userSlot ? { [prev.userSlot]: { status: 'available' } } : {}),
      },
    } : prev);
  };

  const handleSlotConflict = async () => {
    try {
      const response = await fetch('/api/reservations', { credentials: 'include' });
      const data = await response.json() as ReservationState;
      setReservations(data);
    } catch {
      // Keep current state on conflict refetch failure
    }
  };

  return (
    <div>
      <TagFilter skillsets={skillsets} onResultsChange={setTagResults} />

      <div className="flex flex-col">
        {tagResults.map(skillset => {
          const [namespace, name] = skillset.id.split('/');
          // Check if this skillset has a batch ID (from static data or submitted map)
          const batchId = skillset.batch_id ?? submittedMap.get(skillset.id);

          return (
            <article key={skillset.id} className="group border border-border-ink bg-surface-paper py-4 px-4 md:py-6 md:px-6 mb-4 rounded-none hover:bg-surface-white transition-all cursor-pointer glow-border-hover">
              <a href={`/skillset/${namespace}/${name}`} className="block">
                <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-1 md:gap-2 mb-1 md:mb-2">
                  <h3 className="text-lg md:text-xl font-serif font-bold text-text-ink group-hover:text-accent transition-colors">
                    {skillset.name}
                  </h3>
                  <span className="font-mono text-xs text-text-tertiary">
                    v{skillset.version} • {skillset.author.handle}
                  </span>
                </div>
                <p className="text-sm md:text-base text-text-secondary font-serif leading-relaxed max-w-3xl mb-4 line-clamp-2 md:line-clamp-none">
                  {skillset.description}
                </p>

                <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pt-2 border-t border-border-ink/50 group-hover:border-accent/30 transition-colors">
                  <span className="flex items-center gap-1 text-xs font-mono text-text-tertiary">
                    <StarIcon />
                    {skillset.stars}
                  </span>

                  {skillset.mcp_servers && skillset.mcp_servers.length > 0 && (
                    <span className="text-xs font-mono text-accent border border-accent/50 px-1.5 py-0.5 rounded-sm" title={`${skillset.mcp_servers.length} MCP server(s)`}>
                      MCP
                    </span>
                  )}

                  {skillset.tags.map(tag => (
                    <span key={tag} className="hidden md:inline text-xs font-mono text-text-tertiary border border-accent/20 px-1.5 py-0.5 rounded-sm bg-surface-white">
                      #{tag}
                    </span>
                  ))}

                  {batchId && (
                    <span className="font-mono text-xs text-text-tertiary">{batchId}</span>
                  )}
                </div>
              </a>
            </article>
          );
        })}
      </div>

      {reservations && Object.keys(reservations.slots).length > 0 && (
        <div className="flex flex-col border-t border-dashed border-border-ink mt-0">
          {Object.entries(reservations.slots)
            .filter(([batchId, slot]) => {
              // Hide ghost card if a real skillset with this batch_id exists
              if (skillsets.some(s => s.batch_id === batchId)) {
                return false;
              }
              // Hide submitted slots if matching by skillsetId
              if (slot.status === 'submitted' && slot.skillsetId) {
                return !skillsets.some(s => s.id === slot.skillsetId);
              }
              return true;
            })
            .map(([batchId, slot]) => (
              <GhostCard
                key={batchId}
                batchId={batchId}
                status={slot.status}
                expiresAt={slot.expiresAt}
                skillsetId={slot.skillsetId}
                isOwn={reservations.userSlot === batchId}
                onReserved={handleSlotReserved}
                onCancelled={handleSlotCancelled}
                onConflict={handleSlotConflict}
              />
            ))}
        </div>
      )}

      {tagResults.length === 0 && (
        <div className="text-center py-12 text-text-secondary">
          <p>No skillsets found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
