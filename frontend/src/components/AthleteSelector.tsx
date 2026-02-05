'use client';

import { useState, useEffect } from 'react';
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
              <div className="font-medium">{athlete.name}</div>
              <div className="text-xs opacity-70 capitalize">{athlete.gender}</div>
            </button>
          ))
        )}
      </div>

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
