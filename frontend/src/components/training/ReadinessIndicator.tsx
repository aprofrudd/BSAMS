'use client';

import { useState, useEffect, useCallback } from 'react';
import { trainingApi, wellnessApi } from '@/lib/api';
import type { TrainingLoadAnalysis, WellnessEntry } from '@/lib/types';

interface ReadinessIndicatorProps {
  athleteId: string;
  dataVersion?: number;
}

type ReadinessLevel = 'green' | 'amber' | 'red' | 'unknown';

function getReadinessLevel(
  acwr: number | null,
  latestWellness: WellnessEntry | null,
): ReadinessLevel {
  if (acwr === null && !latestWellness) return 'unknown';

  let score = 0;
  let factors = 0;

  // ACWR scoring
  if (acwr !== null) {
    factors++;
    if (acwr >= 0.8 && acwr <= 1.3) score += 2; // Optimal
    else if (acwr > 1.5 || acwr < 0.5) score += 0; // High risk
    else score += 1; // Moderate
  }

  // Wellness scoring using Hooper Index (4-28, lower is better)
  if (latestWellness) {
    factors++;
    const hi = latestWellness.hooper_index;
    if (hi <= 10) score += 2;       // Good recovery
    else if (hi <= 16) score += 1;  // Moderate
    else score += 0;                // Poor recovery
  }

  if (factors === 0) return 'unknown';
  const avg = score / factors;
  if (avg >= 1.5) return 'green';
  if (avg >= 0.5) return 'amber';
  return 'red';
}

const READINESS_CONFIG: Record<ReadinessLevel, { label: string; color: string; bgColor: string }> = {
  green: { label: 'Good to Go', color: 'text-green-400', bgColor: 'bg-green-400/20' },
  amber: { label: 'Caution', color: 'text-yellow-400', bgColor: 'bg-yellow-400/20' },
  red: { label: 'High Risk', color: 'text-red-400', bgColor: 'bg-red-400/20' },
  unknown: { label: 'No Data', color: 'text-white/60', bgColor: 'bg-secondary-muted/20' },
};

export function ReadinessIndicator({ athleteId, dataVersion }: ReadinessIndicatorProps) {
  const [loadData, setLoadData] = useState<TrainingLoadAnalysis | null>(null);
  const [latestWellness, setLatestWellness] = useState<WellnessEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReadiness = useCallback(async () => {
    try {
      setLoading(true);
      const [load, wellness] = await Promise.all([
        trainingApi.getLoadAnalysis(athleteId, 28).catch(() => null),
        wellnessApi.listEntries(athleteId).catch(() => []),
      ]);
      setLoadData(load);
      setLatestWellness(wellness.length > 0 ? wellness[0] : null);
    } catch {
      // Silently handle - indicator is supplementary
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    loadReadiness();
  }, [loadReadiness, dataVersion]);

  if (loading) {
    return (
      <div className="bg-secondary-muted/20 rounded-lg p-3 text-center animate-pulse">
        <div className="text-xs text-white/40">Readiness</div>
        <div className="text-sm text-white/40 mt-1">Loading...</div>
      </div>
    );
  }

  const level = getReadinessLevel(loadData?.acwr ?? null, latestWellness);
  const config = READINESS_CONFIG[level];

  return (
    <div className={`${config.bgColor} rounded-lg p-3 text-center`}>
      <div className="text-xs text-white/60 mb-1">Readiness</div>
      <div className={`text-lg font-bold ${config.color}`}>
        {config.label}
      </div>
      <div className="flex justify-center gap-3 mt-2 text-xs text-white/60">
        {loadData?.acwr !== null && loadData?.acwr !== undefined && (
          <span>ACWR: {loadData.acwr}</span>
        )}
        {latestWellness && (
          <span>Wellness: {latestWellness.entry_date}</span>
        )}
      </div>
    </div>
  );
}
