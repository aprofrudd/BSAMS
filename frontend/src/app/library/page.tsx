'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ExerciseLibraryTable } from '@/components/library/ExerciseLibraryTable';
import { TemplateTable } from '@/components/library/TemplateTable';

type LibraryTab = 'exercises' | 'templates';

export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LibraryTab>('exercises');

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="section-title text-lg">Library</h2>

        {/* Tab Toggle */}
        <div className="flex bg-secondary-muted/30 rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab('exercises')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'exercises'
                ? 'bg-accent text-[#090A3D]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Exercises
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'templates'
                ? 'bg-accent text-[#090A3D]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Templates
          </button>
        </div>
      </div>

      <div className="card">
        {activeTab === 'exercises' ? (
          <ExerciseLibraryTable />
        ) : (
          <TemplateTable />
        )}
      </div>
    </main>
  );
}
