import { useState, useEffect, type ReactElement } from 'react';
import type { SearchIndexEntry, ReservationState } from '@/types';
import TagFilter from './TagFilter.js';
import GhostCard from './GhostCard.js';

interface SkillsetGridProps {
  skillsets: SearchIndexEntry[];
}

function StarIcon(): ReactElement {
  return (
    <svg className="w-3 h-3 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

export default function SkillsetGrid({
  skillsets,
}: SkillsetGridProps): ReactElement {
  const [tagResults, setTagResults] = useState<SearchIndexEntry[]>(skillsets);
  const [liveStars, setLiveStars] = useState<Record<string, number>>({});
  const [reservations, setReservations] = useState<ReservationState | null>(null);

  // Fetch all live star counts in a single request
  useEffect(() => {
    async function fetchStars(): Promise<void> {
      try {
        const response = await fetch('/api/stats/counts');
        if (response.ok) {
          const data = (await response.json()) as { stars: Record<string, number> };
          setLiveStars(data.stars);
        }
      } catch {
        // Keep build-time values on error
      }
    }
    fetchStars();
  }, [skillsets]);

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
  const submittedMap = new Map<string, string>();
  if (reservations) {
    for (const [slotId, slot] of Object.entries(reservations.slots)) {
      if (slot.status === 'submitted' && slot.skillsetId) {
        submittedMap.set(slot.skillsetId, slotId);
      }
    }
  }

  const finalResults = tagResults;

  return (
    <div>
      <TagFilter skillsets={skillsets} onResultsChange={setTagResults} />

      <div className="flex flex-col">
        {finalResults.map(skillset => {
          const [namespace, name] = skillset.id.split('/');
          // Check if this skillset has a batch ID (from static data or submitted map)
          const batchId = skillset.batch_id ?? submittedMap.get(skillset.id);

          return (
            <article key={skillset.id} className="group border-b border-border-ink py-6 hover:bg-stone-50 transition-colors cursor-pointer">
              <a href={`/skillset/${namespace}/${name}`} className="block">
                <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2 mb-2">
                  <h3 className="text-xl font-serif font-bold text-text-ink group-hover:text-orange-500 transition-colors">
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
                    <StarIcon />
                    {liveStars[skillset.id] ?? skillset.stars}
                  </span>

                  {skillset.mcp_servers && skillset.mcp_servers.length > 0 && (
                    <span className="text-xs font-mono text-orange-500 border border-orange-300 px-1 rounded-none" title={`${skillset.mcp_servers.length} MCP server(s)`}>
                      MCP
                    </span>
                  )}

                  {skillset.tags.map(tag => (
                    <span key={tag} className="text-xs font-mono text-text-tertiary border border-border-ink px-1 rounded-none">
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
            .filter(([slotId, slot]) => {
              // Hide ghost card if a real skillset with this batch_id exists
              if (skillsets.some(s => s.batch_id === slotId)) {
                return false;
              }
              // Hide submitted slots if matching by skillsetId
              if (slot.status === 'submitted' && slot.skillsetId) {
                return !skillsets.some(s => s.id === slot.skillsetId);
              }
              return true;
            })
            .map(([slotId, slot]) => (
              <GhostCard
                key={slotId}
                slotId={slotId}
                batchId={slotId}
                status={slot.status}
                expiresAt={slot.expiresAt}
                skillsetId={slot.skillsetId}
                isOwn={reservations.userSlot === slotId}
                onReserved={(sid, exp) => {
                  setReservations(prev => prev ? {
                    ...prev,
                    userSlot: sid,
                    slots: { ...prev.slots, [sid]: { status: 'reserved', expiresAt: exp } },
                  } : prev);
                }}
                onCancelled={() => {
                  setReservations(prev => prev ? {
                    ...prev,
                    userSlot: null,
                    slots: {
                      ...prev.slots,
                      ...(prev.userSlot ? { [prev.userSlot]: { status: 'available' } } : {}),
                    },
                  } : prev);
                }}
                onConflict={() => {
                  fetch('/api/reservations', { credentials: 'include' })
                    .then(r => r.json())
                    .then(data => setReservations(data as ReservationState))
                    .catch(() => {});
                }}
              />
            ))}
        </div>
      )}

      {finalResults.length === 0 && (
        <div className="text-center py-12 text-text-secondary">
          <p>No skillsets found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
