'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useAthleteContext } from '@/lib/contexts/AthleteContext';
import { DataSharingConsent } from '@/components/DataSharingConsent';
import { SessionTable } from '@/components/training/SessionTable';
import { WellnessChart } from '@/components/training/WellnessChart';
import { LoadChart } from '@/components/training/LoadChart';
import { ReadinessIndicator } from '@/components/training/ReadinessIndicator';

export default function TrainingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { selectedAthlete } = useAthleteContext();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h2 className="section-title text-lg">Training</h2>
        {user?.role !== 'admin' && <DataSharingConsent />}
      </div>

      {/* Main Content — full width */}
      {selectedAthlete ? (
        <>
          <ReadinessIndicator athleteId={selectedAthlete.id} />

          {/* Two-column layout for Load + Wellness on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="card">
              <LoadChart athleteId={selectedAthlete.id} />
            </div>
            <div className="card">
              <WellnessChart athleteId={selectedAthlete.id} />
            </div>
          </div>

          <div className="card">
            <SessionTable athleteId={selectedAthlete.id} />
          </div>
        </>
      ) : (
        <div className="card text-center py-12 md:py-16">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 text-white/20 mx-auto mb-3">
            <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
          </svg>
          <p className="text-white/40 font-heading uppercase tracking-wider text-sm">
            Select an athlete to view training data
          </p>
        </div>
      )}
    </div>
  );
}
