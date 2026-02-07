'use client';

import { useState, useEffect, useMemo } from 'react';
import { athletesApi } from '@/lib/api';
import { AthleteEditModal } from './AthleteEditModal';
import { AthleteCreateModal } from './AthleteCreateModal';
import type { Athlete } from '@/lib/types';

interface AthleteSelectorProps {
  selectedAthlete: Athlete | null;
  onSelectAthlete: (athlete: Athlete | null) => void;
  onAthleteUpdated?: (athlete: Athlete) => void;
}

export function AthleteSelector({
  selectedAthlete,
  onSelectAthlete,
  onAthleteUpdated,
}: AthleteSelectorProps) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);
  const [mergeMessage, setMergeMessage] = useState<string | null>(null);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
      <h2 className="section-title text-base mb-4">Athletes</h2>

      {/* Search Input */}
      <input
        type="text"
        placeholder="Search athletes..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="input w-full mb-3"
      />

      {/* Add Athlete Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="w-full mb-3 px-3 py-2 rounded-lg text-sm font-medium bg-accent text-[#090A3D] hover:bg-accent/80 transition-colors"
      >
        + Add Athlete
      </button>

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
                {selectedAthlete?.id === athlete.id && (
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingAthlete(athlete);
                    }}
                    className="ml-auto p-0.5 rounded hover:bg-black/20 transition-colors"
                    title="Edit athlete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                    </svg>
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

      {/* Edit Athlete Modal */}
      {editingAthlete && (
        <AthleteEditModal
          athlete={editingAthlete}
          onClose={() => setEditingAthlete(null)}
          onSaved={(updated) => {
            setEditingAthlete(null);
            setAthletes((prev) =>
              prev.map((a) => (a.id === updated.id ? updated : a))
            );
            onAthleteUpdated?.(updated);
          }}
        />
      )}

      {/* Create Athlete Modal */}
      {showCreateModal && (
        <AthleteCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(created) => {
            setShowCreateModal(false);
            setAthletes((prev) => [...prev, created]);
            onSelectAthlete(created);
          }}
        />
      )}
    </div>
  );
}
