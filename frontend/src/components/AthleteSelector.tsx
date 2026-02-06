'use client';

import { useState, useEffect, useMemo } from 'react';
import { athletesApi } from '@/lib/api';
import type { Athlete } from '@/lib/types';

interface AthleteSelectorProps {
  selectedAthlete: Athlete | null;
  onSelectAthlete: (athlete: Athlete | null) => void;
}

export function AthleteSelector({
  selectedAthlete,
  onSelectAthlete,
}: AthleteSelectorProps) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);
  const [mergeMessage, setMergeMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAthletes();
  }, []);

  async function loadAthletes() {
    try {
      setIsLoading(true);
      setError(null);
      const data = await athletesApi.list();
      setAthletes(data);
    } catch (err) {
      setError('Failed to load athletes');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  // Build a set of duplicate names (case-insensitive)
  const duplicateNames = useMemo(() => {
    const nameCounts: Record<string, number> = {};
    for (const a of athletes) {
      const key = a.name.toLowerCase().trim();
      nameCounts[key] = (nameCounts[key] || 0) + 1;
    }
    const dupes = new Set<string>();
    Object.entries(nameCounts).forEach(([key, count]) => {
      if (count > 1) dupes.add(key);
    });
    return dupes;
  }, [athletes]);

  const isDuplicate = (athlete: Athlete) =>
    duplicateNames.has(athlete.name.toLowerCase().trim());

  // Check if the selected athlete is part of a duplicate group
  const selectedDuplicateGroup = useMemo(() => {
    if (!selectedAthlete || !duplicateNames.has(selectedAthlete.name.toLowerCase().trim())) return null;
    const key = selectedAthlete.name.toLowerCase().trim();
    return athletes
      .filter((a) => a.name.toLowerCase().trim() === key)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [selectedAthlete, athletes, duplicateNames]);

  async function handleMerge() {
    if (!selectedDuplicateGroup || selectedDuplicateGroup.length < 2) return;

    const name = selectedDuplicateGroup[0].name;
    const confirmed = window.confirm(
      `Merge duplicates of "${name}"? All events will be combined under one athlete.`
    );
    if (!confirmed) return;

    setMerging(true);
    setMergeMessage(null);

    try {
      // Keep the earliest created athlete, merge all others into it
      const keepAthlete = selectedDuplicateGroup[0];
      let totalMerged = 0;

      for (let i = 1; i < selectedDuplicateGroup.length; i++) {
        const result = await athletesApi.merge(keepAthlete.id, selectedDuplicateGroup[i].id);
        totalMerged += result.merged_events;
      }

      setMergeMessage(`Merged ${totalMerged} event${totalMerged !== 1 ? 's' : ''} into "${keepAthlete.name}"`);

      // Refresh list and auto-select the kept athlete
      const data = await athletesApi.list();
      setAthletes(data);
      const kept = data.find((a) => a.id === keepAthlete.id) || null;
      onSelectAthlete(kept);
    } catch (err) {
      setMergeMessage('Merge failed. Please try again.');
      console.error(err);
    } finally {
      setMerging(false);
    }
  }

  const filteredAthletes = athletes.filter((athlete) =>
    athlete.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4 text-accent">Athletes</h2>

      {/* Search Input */}
      <input
        type="text"
        placeholder="Search athletes..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="input w-full mb-4"
      />

      {/* Athlete List */}
      <div className="space-y-2 max-h-[40vh] md:max-h-[60vh] overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-4">
            <div className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-red-400 text-sm py-4 text-center">{error}</div>
        ) : filteredAthletes.length === 0 ? (
          <div className="text-white/60 text-sm py-4 text-center">
            {searchQuery ? 'No athletes found' : 'No athletes yet'}
          </div>
        ) : (
          filteredAthletes.map((athlete) => (
            <button
              key={athlete.id}
              onClick={() => onSelectAthlete(athlete)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                selectedAthlete?.id === athlete.id
                  ? 'bg-accent text-primary'
                  : 'hover:bg-secondary-muted'
              }`}
            >
              <div className="font-medium flex items-center gap-2">
                {athlete.name}
                {isDuplicate(athlete) && (
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                    Duplicate
                  </span>
                )}
              </div>
              <div className="text-xs opacity-70 capitalize">{athlete.gender}</div>
            </button>
          ))
        )}
      </div>

      {/* Merge Duplicates Button */}
      {selectedDuplicateGroup && selectedDuplicateGroup.length > 1 && (
        <button
          onClick={handleMerge}
          disabled={merging}
          className="w-full mt-3 px-3 py-2 rounded-lg text-sm font-medium bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
        >
          {merging ? 'Merging...' : `Merge ${selectedDuplicateGroup.length} Duplicates`}
        </button>
      )}

      {/* Merge Result Message */}
      {mergeMessage && (
        <div className="mt-2 text-xs text-center text-white/70">{mergeMessage}</div>
      )}

      {/* Refresh Button */}
      <button
        onClick={loadAthletes}
        disabled={isLoading}
        className="btn-secondary w-full mt-4 text-sm"
      >
        {isLoading ? 'Loading...' : 'Refresh'}
      </button>
    </div>
  );
}
