'use client';

import { useState, useEffect } from 'react';
import { eventsApi, analysisApi } from '@/lib/api';
import { getMetricLabel } from './MetricSelector';
import type { PerformanceEvent, ReferenceGroup, PerformanceRow } from '@/lib/types';

interface PerformanceTableProps {
  athleteId: string;
  referenceGroup: ReferenceGroup;
  metric: string;
}

export function PerformanceTable({
  athleteId,
  referenceGroup,
  metric,
}: PerformanceTableProps) {
  const [rows, setRows] = useState<PerformanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [athleteId, referenceGroup, metric]);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch events and bulk Z-scores in parallel
      const [events, zScores] = await Promise.all([
        eventsApi.listForAthlete(athleteId),
        analysisApi.getZScoresBulk(athleteId, {
          metric,
          referenceGroup,
        }).catch(() => ({} as Record<string, { z_score: number }>)),
      ]);

      const rowsWithZScores: PerformanceRow[] = events.map((event) => {
        const metricValue = event.metrics[metric] != null ? Number(event.metrics[metric]) : null;
        const zResult = zScores[event.id];

        return {
          id: event.id,
          date: event.event_date,
          bodyMass: event.metrics.body_mass_kg ?? null,
          value: metricValue,
          zScore: zResult?.z_score ?? null,
        };
      });

      setRows(rowsWithZScores);
    } catch (err) {
      setError('Failed to load performance data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const label = getMetricLabel(metric);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="mt-2 text-white/60">Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">{error}</p>
        <button onClick={loadData} className="btn-secondary mt-4">
          Retry
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-white/60">No performance data recorded</p>
      </div>
    );
  }

  return (
    <div className="-mx-4 sm:mx-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[400px]">
          <thead>
            <tr className="border-b border-secondary-muted">
              <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-white/60 font-medium text-sm sm:text-base">
                Date
              </th>
              <th className="text-right py-2 sm:py-3 px-3 sm:px-4 text-white/60 font-medium text-sm sm:text-base">
                Mass (kg)
              </th>
              <th className="text-right py-2 sm:py-3 px-3 sm:px-4 text-white/60 font-medium text-sm sm:text-base">
                {label}
              </th>
              <th className="text-right py-2 sm:py-3 px-3 sm:px-4 text-white/60 font-medium text-sm sm:text-base">
                Z-Score
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-secondary-muted/50 hover:bg-secondary-muted/20"
              >
                <td className="py-2 sm:py-3 px-3 sm:px-4 text-sm sm:text-base">
                  {formatDate(row.date)}
                </td>
                <td className="py-2 sm:py-3 px-3 sm:px-4 text-right text-sm sm:text-base">
                  {row.bodyMass?.toFixed(1) ?? '-'}
                </td>
                <td className="py-2 sm:py-3 px-3 sm:px-4 text-right font-medium text-accent text-sm sm:text-base">
                  {row.value?.toFixed(2) ?? '-'}
                </td>
                <td className="py-2 sm:py-3 px-3 sm:px-4 text-right text-sm sm:text-base">
                  {row.zScore !== null ? (
                    <span className={getZScoreColor(row.zScore)}>
                      {row.zScore >= 0 ? '+' : ''}
                      {row.zScore.toFixed(2)}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getZScoreColor(zScore: number): string {
  if (zScore >= 1) return 'text-green-400';
  if (zScore >= 0) return 'text-accent';
  if (zScore >= -1) return 'text-yellow-400';
  return 'text-red-400';
}
