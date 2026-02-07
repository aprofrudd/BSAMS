'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useAthleteContext } from '@/lib/contexts/AthleteContext';
import { athletesApi } from '@/lib/api';
import { AthleteEditModal } from './AthleteEditModal';
import { AthleteCreateModal } from './AthleteCreateModal';
import type { Athlete } from '@/lib/types';

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
  const { selectedAthlete, setSelectedAthlete } = useAthleteContext();

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load athletes when user is authenticated
  useEffect(() => {
    if (user) {
      loadAthletes();
    }
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  async function loadAthletes() {
    try {
      setIsLoading(true);
      const data = await athletesApi.list();
      setAthletes(data);
    } catch {
      // Silently handle — dropdown will show empty state
    } finally {
      setIsLoading(false);
    }
  }

  // Build duplicate names set
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

  const filteredAthletes = athletes.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function handleSelectAthlete(athlete: Athlete) {
    setSelectedAthlete(athlete);
    setIsOpen(false);
    setSearchQuery('');
  }

  // Check if we're on a page that uses athletes
  const showAthleteSelector = user && pathname !== '/login' && pathname !== '/upload';

  return (
    <>
      <header className="bg-primary-dark border-b border-secondary-muted sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto px-4 sm:px-6 h-14">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-6">
            <h1 className="font-heading text-lg sm:text-xl font-bold text-accent tracking-wider uppercase">
              BSAMS
            </h1>
            {user && (
              <nav className="flex items-center gap-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = item.matchPaths.includes(pathname);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`font-heading text-xs sm:text-sm uppercase tracking-wider px-3 py-1.5 rounded-md transition-colors ${
                        isActive
                          ? 'text-accent bg-accent/10'
                          : 'text-white/50 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Center: Athlete Selector */}
          {showAthleteSelector && (
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg border border-secondary-muted hover:border-accent/50 transition-colors bg-primary-dark min-w-[160px] sm:min-w-[220px]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-accent shrink-0">
                  <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                </svg>
                <span className="font-heading text-sm uppercase tracking-wider truncate">
                  {selectedAthlete ? selectedAthlete.name : 'Select Athlete'}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Dropdown Panel */}
              {isOpen && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-72 sm:w-80 bg-primary-dark border border-secondary-muted rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                  {/* Search */}
                  <div className="p-3 border-b border-secondary-muted/50">
                    <input
                      ref={searchRef}
                      type="text"
                      placeholder="Search athletes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input w-full text-sm"
                    />
                  </div>

                  {/* Athlete list */}
                  <div className="max-h-64 overflow-y-auto">
                    {isLoading ? (
                      <div className="text-center py-6">
                        <div className="inline-block w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : filteredAthletes.length === 0 ? (
                      <div className="text-white/40 text-sm py-6 text-center">
                        {searchQuery ? 'No athletes found' : 'No athletes yet'}
                      </div>
                    ) : (
                      filteredAthletes.map((athlete) => (
                        <button
                          key={athlete.id}
                          onClick={() => handleSelectAthlete(athlete)}
                          className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors ${
                            selectedAthlete?.id === athlete.id
                              ? 'bg-accent/15 text-white'
                              : 'hover:bg-white/5 text-white/80'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-sm truncate">{athlete.name}</span>
                            {duplicateNames.has(athlete.name.toLowerCase().trim()) && (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 shrink-0">
                                Dup
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-white/30 capitalize">{athlete.gender}</span>
                            {selectedAthlete?.id === athlete.id && (
                              <span
                                role="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingAthlete(athlete);
                                  setIsOpen(false);
                                }}
                                className="p-0.5 rounded hover:bg-white/10 transition-colors"
                                title="Edit athlete"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-accent">
                                  <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                                </svg>
                              </span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Add Athlete footer */}
                  <div className="p-2 border-t border-secondary-muted/50">
                    <button
                      onClick={() => {
                        setShowCreateModal(true);
                        setIsOpen(false);
                      }}
                      className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                    >
                      + Add Athlete
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Right: User info + Logout */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-white/40 text-xs hidden sm:inline truncate max-w-[140px]">
                  {user.email}
                </span>
                <button
                  onClick={logout}
                  className="text-white/40 hover:text-white text-xs transition-colors"
                >
                  Log Out
                </button>
              </>
            ) : (
              <span className="text-white/40 text-xs">Dashboard</span>
            )}
          </div>
        </div>
      </header>

      {/* Modals */}
      {editingAthlete && (
        <AthleteEditModal
          athlete={editingAthlete}
          onClose={() => setEditingAthlete(null)}
          onSaved={(updated) => {
            setEditingAthlete(null);
            setAthletes((prev) =>
              prev.map((a) => (a.id === updated.id ? updated : a))
            );
            if (selectedAthlete?.id === updated.id) {
              setSelectedAthlete(updated);
            }
          }}
        />
      )}

      {showCreateModal && (
        <AthleteCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(created) => {
            setShowCreateModal(false);
            setAthletes((prev) => [...prev, created]);
            setSelectedAthlete(created);
          }}
        />
      )}
    </>
  );
}
