'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { AthleteSelector } from '@/components/AthleteSelector';
import { DataViewControls } from '@/components/DataViewControls';
import { PerformanceTable } from '@/components/PerformanceTable';
import { PerformanceGraph } from '@/components/PerformanceGraph';
import { ZScoreRadar } from '@/components/ZScoreRadar';
import { DataSharingConsent } from '@/components/DataSharingConsent';
import { SharedDataView } from '@/components/SharedDataView';
import type { Athlete, ReferenceGroup, ViewMode, BenchmarkSource } from '@/lib/types';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [referenceGroup, setReferenceGroup] = useState<ReferenceGroup>('cohort');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedMetric, setSelectedMetric] = useState<string>('height_cm');
  const [showRadar, setShowRadar] = useState(false);
  const [benchmarkSource, setBenchmarkSource] = useState<BenchmarkSource>('boxing_science');
  const [adminTab, setAdminTab] = useState<'my_athletes' | 'shared_data'>('my_athletes');
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  // Set correct default benchmarkSource once user role is known
  useEffect(() => {
    if (user?.role === 'admin') {
      setBenchmarkSource('own');
    }
  }, [user?.role]);

  useEffect(() => {
    setShowRadar(false);
  }, [selectedAthlete]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Admin Tab Toggle */}
      {user?.role === 'admin' && (
        <div className="flex rounded-lg overflow-hidden border border-secondary-muted w-fit">
          <button
            onClick={() => setAdminTab('my_athletes')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              adminTab === 'my_athletes'
                ? 'bg-accent text-primary'
                : 'bg-primary-dark text-white hover:bg-secondary-muted'
            }`}
          >
            My Athletes
          </button>
          <button
            onClick={() => setAdminTab('shared_data')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              adminTab === 'shared_data'
                ? 'bg-accent text-primary'
                : 'bg-primary-dark text-white hover:bg-secondary-muted'
            }`}
          >
            Shared Data
          </button>
        </div>
      )}

      {/* Shared Data View (admin only) */}
      {user?.role === 'admin' && adminTab === 'shared_data' ? (
        <SharedDataView />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Sidebar - Athlete Selector */}
          <aside className="md:col-span-1 space-y-4">
            <AthleteSelector
              selectedAthlete={selectedAthlete}
              onSelectAthlete={setSelectedAthlete}
              onAthleteUpdated={(updated) => setSelectedAthlete(updated)}
            />
            {user?.role !== 'admin' && <DataSharingConsent />}
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
              benchmarkSource={benchmarkSource}
              onBenchmarkSourceChange={setBenchmarkSource}
              role={user?.role}
              dataVersion={dataVersion}
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
                      benchmarkSource={benchmarkSource}
                      onDataChanged={() => setDataVersion((v) => v + 1)}
                    />
                  ) : (
                    <PerformanceGraph
                      athleteId={selectedAthlete.id}
                      referenceGroup={referenceGroup}
                      metric={selectedMetric}
                      athleteGender={selectedAthlete.gender}
                      benchmarkSource={benchmarkSource}
                    />
                  )}
                </div>

                {/* Z-Score Radar Chart */}
                <div className="card">
                  {showRadar ? (
                    <>
                      <ZScoreRadar
                        athleteId={selectedAthlete.id}
                        referenceGroup={referenceGroup}
                        benchmarkSource={benchmarkSource}
                      />
                      <button
                        onClick={() => setShowRadar(false)}
                        className="mt-4 w-full px-4 py-2 text-sm font-medium rounded bg-[#2D5585]/30 text-white/60 hover:bg-[#2D5585]/50 transition-colors"
                      >
                        Hide Radar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowRadar(true)}
                      className="w-full px-4 py-2 text-sm font-medium rounded bg-accent text-[#090A3D] hover:bg-accent/80 transition-colors"
                    >
                      Generate Radar Plot
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="card text-center py-8 md:py-12">
                <p className="text-white/60">Select an athlete to view performance data</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
