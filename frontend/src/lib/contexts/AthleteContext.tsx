'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Athlete } from '@/lib/types';

interface AthleteContextType {
  selectedAthlete: Athlete | null;
  setSelectedAthlete: (athlete: Athlete | null) => void;
}

const AthleteContext = createContext<AthleteContextType | null>(null);

export function AthleteProvider({ children }: { children: ReactNode }) {
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);

  return (
    <AthleteContext.Provider value={{ selectedAthlete, setSelectedAthlete }}>
      {children}
    </AthleteContext.Provider>
  );
}

export function useAthleteContext() {
  const context = useContext(AthleteContext);
  if (!context) {
    throw new Error('useAthleteContext must be used within an AthleteProvider');
  }
  return context;
}
