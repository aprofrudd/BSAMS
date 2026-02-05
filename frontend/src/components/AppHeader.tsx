'use client';

import { useAuth } from '@/lib/auth';

export function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-primary-dark border-b border-secondary-muted px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-50">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <h1 className="text-lg sm:text-xl font-bold text-accent">BSAMS</h1>
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-white/60 text-sm hidden sm:inline">
                {user.email}
              </span>
              <button
                onClick={logout}
                className="text-white/60 hover:text-white text-sm transition-colors"
              >
                Log Out
              </button>
            </>
          ) : (
            <span className="text-white/60 text-sm">Dashboard</span>
          )}
        </nav>
      </div>
    </header>
  );
}
