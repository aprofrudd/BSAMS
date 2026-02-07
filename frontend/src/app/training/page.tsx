'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useAthleteContext } from '@/lib/contexts/AthleteContext';
import { AthleteSelector } from '@/components/AthleteSelector';
import { DataSharingConsent } from '@/components/DataSharingConsent';
import { SessionTable } from '@/components/training/SessionTable';
import { WellnessChart } from '@/components/training/WellnessChart';
import { LoadChart } from '@/components/training/LoadChart';
import { ReadinessIndicator } from '@/components/training/ReadinessIndicator';

export default function TrainingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { selectedAthlete, setSelectedAthlete } = useAthleteContext();

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
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Sidebar */}
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
          {selectedAthlete ? (
            <>
              <ReadinessIndicator athleteId={selectedAthlete.id} />
              <div className="card">
                <SessionTable athleteId={selectedAthlete.id} />
              </div>
              <div className="card">
                <LoadChart athleteId={selectedAthlete.id} />
              </div>
              <div className="card">
                <WellnessChart athleteId={selectedAthlete.id} />
              </div>
            </>
          ) : (
            <div className="card text-center py-8 md:py-12">
              <p className="text-white/60">Select an athlete to view training data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
