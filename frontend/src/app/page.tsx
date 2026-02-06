'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { AthleteSelector } from '@/components/AthleteSelector';
import { DataViewControls } from '@/components/DataViewControls';
import { PerformanceTable } from '@/components/PerformanceTable';
import { PerformanceGraph } from '@/components/PerformanceGraph';
import { ZScoreRadar } from '@/components/ZScoreRadar';
import type { Athlete, ReferenceGroup, ViewMode } from '@/lib/types';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [referenceGroup, setReferenceGroup] = useState<ReferenceGroup>('cohort');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedMetric, setSelectedMetric] = useState<string>('height_cm');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {/* Sidebar - Athlete Selector */}
      <aside className="md:col-span-1">
        <AthleteSelector
          selectedAthlete={selectedAthlete}
          onSelectAthlete={setSelectedAthlete}
        />
      </aside>

      {/* Main Content */}
      <div className="md:col-span-2 lg:col-span-3 space-y-4 md:space-y-6">
        {/* Controls */}
        <DataViewControls
          referenceGroup={referenceGroup}
          onReferenceGroupChange={setReferenceGroup}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          selectedMetric={selectedMetric}
          onMetricChange={setSelectedMetric}
          athleteId={selectedAthlete?.id}
          disabled={!selectedAthlete}
        />

        {/* Data Display */}
        {selectedAthlete ? (
          <>
            <div className="card">
              {viewMode === 'table' ? (
                <PerformanceTable
                  athleteId={selectedAthlete.id}
                  referenceGroup={referenceGroup}
                  metric={selectedMetric}
                />
              ) : (
                <PerformanceGraph
                  athleteId={selectedAthlete.id}
                  referenceGroup={referenceGroup}
                  metric={selectedMetric}
                />
              )}
            </div>

            {/* Z-Score Radar Chart */}
            <div className="card">
              <ZScoreRadar
                athleteId={selectedAthlete.id}
                referenceGroup={referenceGroup}
              />
            </div>
          </>
        ) : (
          <div className="card text-center py-8 md:py-12">
            <p className="text-white/60">Select an athlete to view performance data</p>
          </div>
        )}
      </div>
    </div>
  );
}
