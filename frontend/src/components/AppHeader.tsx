'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

interface NavItem {
  label: string;
  href: string;
  matchPaths: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Testing', href: '/testing', matchPaths: ['/testing', '/'] },
  { label: 'Training', href: '/training', matchPaths: ['/training'] },
  { label: 'Upload', href: '/upload', matchPaths: ['/upload'] },
];

export function AppHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="bg-primary-dark border-b border-secondary-muted px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-50">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <h1 className="text-lg sm:text-xl font-bold text-accent">BSAMS</h1>
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              {NAV_ITEMS.map((item) => {
                const isActive = item.matchPaths.includes(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm transition-colors ${
                      isActive
                        ? 'text-accent'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
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
