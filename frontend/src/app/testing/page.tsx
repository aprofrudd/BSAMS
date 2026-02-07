'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useAthleteContext } from '@/lib/contexts/AthleteContext';
import { DataViewControls } from '@/components/DataViewControls';
import { PerformanceTable } from '@/components/PerformanceTable';
import { PerformanceGraph } from '@/components/PerformanceGraph';
import { ZScoreRadar } from '@/components/ZScoreRadar';
import { DataSharingConsent } from '@/components/DataSharingConsent';
import { SharedDataView } from '@/components/SharedDataView';
import type { ReferenceGroup, ViewMode, BenchmarkSource } from '@/lib/types';

export default function TestingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { selectedAthlete, setSelectedAthlete } = useAthleteContext();
  const [referenceGroup, setReferenceGroup] = useState<ReferenceGroup>('cohort');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedMetric, setSelectedMetric] = useState<string>('height_cm');
  const [showRadar, setShowRadar] = useState(false);
  const [benchmarkSource, setBenchmarkSource] = useState<BenchmarkSource>('own');
  const [adminTab, setAdminTab] = useState<'my_athletes' | 'shared_data'>('my_athletes');
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    setShowRadar(false);
  }, [selectedAthlete]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Page Header + Admin Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="section-title text-lg">Testing</h2>
        <div className="flex items-center gap-3">
          {user?.role !== 'admin' && <DataSharingConsent />}
          {user?.role === 'admin' && (
            <div className="flex rounded-lg overflow-hidden border border-secondary-muted">
              <button
                onClick={() => setAdminTab('my_athletes')}
                className={`px-4 py-1.5 text-xs font-heading uppercase tracking-wider transition-colors ${
                  adminTab === 'my_athletes'
                    ? 'bg-accent text-primary'
                    : 'bg-primary-dark text-white/60 hover:bg-secondary-muted'
                }`}
              >
                My Athletes
              </button>
              <button
                onClick={() => setAdminTab('shared_data')}
                className={`px-4 py-1.5 text-xs font-heading uppercase tracking-wider transition-colors ${
                  adminTab === 'shared_data'
                    ? 'bg-accent text-primary'
                    : 'bg-primary-dark text-white/60 hover:bg-secondary-muted'
                }`}
              >
                Shared Data
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Shared Data View (admin only) */}
      {user?.role === 'admin' && adminTab === 'shared_data' ? (
        <SharedDataView />
      ) : (
        <div className="space-y-4 md:space-y-6">
          {/* Controls — full width */}
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

          {/* Data Display — full width */}
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
                    className="w-full px-4 py-2 text-sm font-heading uppercase tracking-wider rounded bg-accent text-[#090A3D] hover:bg-accent/80 transition-colors"
                  >
                    Generate Radar Plot
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="card text-center py-12 md:py-16">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 text-white/20 mx-auto mb-3">
                <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
              </svg>
              <p className="text-white/40 font-heading uppercase tracking-wider text-sm">
                Select an athlete to view performance data
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
