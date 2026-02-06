'use client';

import { useState, useEffect } from 'react';
import { eventsApi, analysisApi } from '@/lib/api';
import { getMetricLabel } from './MetricSelector';
import type { ReferenceGroup, PerformanceRow } from '@/lib/types';

interface PerformanceTableProps {
  athleteId: string;
  referenceGroup: ReferenceGroup;
  metric: string;
}

interface ColumnVisibility {
  mass: boolean;
  groupAvg: boolean;
  diff: boolean;
  pctDiff: boolean;
  zScore: boolean;
}

const TOGGLE_COLUMNS: { key: keyof ColumnVisibility; label: string }[] = [
  { key: 'mass', label: 'Mass' },
  { key: 'groupAvg', label: 'Group Avg' },
  { key: 'diff', label: 'Diff' },
  { key: 'pctDiff', label: '% Diff' },
  { key: 'zScore', label: 'Z-Score' },
];

export function PerformanceTable({
  athleteId,
  referenceGroup,
  metric,
}: PerformanceTableProps) {
  const [rows, setRows] = useState<PerformanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>({
    mass: true,
    groupAvg: true,
    diff: true,
    pctDiff: true,
    zScore: true,
  });

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
        }).catch(() => ({} as Record<string, { z_score: number; mean: number }>)),
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
          groupMean: zResult?.mean ?? null,
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

  function toggleColumn(key: keyof ColumnVisibility) {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
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
      {/* Column toggles */}
      <div className="flex flex-wrap gap-2 px-3 sm:px-0 mb-3">
        {TOGGLE_COLUMNS.map(({ key, label: colLabel }) => (
          <button
            key={key}
            onClick={() => toggleColumn(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              visibleColumns[key]
                ? 'bg-accent text-primary-bg'
                : 'border border-secondary-muted text-white/40 hover:text-white/60'
            }`}
          >
            {colLabel}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[400px]">
          <thead>
            <tr className="border-b border-secondary-muted">
              <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-white/60 font-medium text-sm sm:text-base">
                Date
              </th>
              {visibleColumns.mass && (
                <th className="text-right py-2 sm:py-3 px-3 sm:px-4 text-white/60 font-medium text-sm sm:text-base">
                  Mass (kg)
                </th>
              )}
              <th className="text-right py-2 sm:py-3 px-3 sm:px-4 text-white/60 font-medium text-sm sm:text-base">
                {label}
              </th>
              {visibleColumns.groupAvg && (
                <th className="text-right py-2 sm:py-3 px-3 sm:px-4 text-white/60 font-medium text-sm sm:text-base">
                  Group Avg
                </th>
              )}
              {visibleColumns.diff && (
                <th className="text-right py-2 sm:py-3 px-3 sm:px-4 text-white/60 font-medium text-sm sm:text-base">
                  Diff
                </th>
              )}
              {visibleColumns.pctDiff && (
                <th className="text-right py-2 sm:py-3 px-3 sm:px-4 text-white/60 font-medium text-sm sm:text-base">
                  % Diff
                </th>
              )}
              {visibleColumns.zScore && (
                <th className="text-right py-2 sm:py-3 px-3 sm:px-4 text-white/60 font-medium text-sm sm:text-base">
                  Z-Score
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const diff = row.value != null && row.groupMean != null
                ? row.value - row.groupMean
                : null;
              const pctDiff = row.value != null && row.groupMean != null && row.groupMean !== 0
                ? ((row.value - row.groupMean) / row.groupMean) * 100
                : null;

              return (
                <tr
                  key={row.id}
                  className="border-b border-secondary-muted/50 hover:bg-secondary-muted/20"
                >
                  <td className="py-2 sm:py-3 px-3 sm:px-4 text-sm sm:text-base">
                    {formatDate(row.date)}
                  </td>
                  {visibleColumns.mass && (
                    <td className="py-2 sm:py-3 px-3 sm:px-4 text-right text-sm sm:text-base">
                      {row.bodyMass?.toFixed(1) ?? '-'}
                    </td>
                  )}
                  <td className="py-2 sm:py-3 px-3 sm:px-4 text-right font-medium text-accent text-sm sm:text-base">
                    {row.value?.toFixed(2) ?? '-'}
                  </td>
                  {visibleColumns.groupAvg && (
                    <td className="py-2 sm:py-3 px-3 sm:px-4 text-right text-sm sm:text-base text-white/60">
                      {row.groupMean?.toFixed(2) ?? '-'}
                    </td>
                  )}
                  {visibleColumns.diff && (
                    <td className={`py-2 sm:py-3 px-3 sm:px-4 text-right text-sm sm:text-base ${getDiffColor(diff)}`}>
                      {diff != null ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}` : '-'}
                    </td>
                  )}
                  {visibleColumns.pctDiff && (
                    <td className={`py-2 sm:py-3 px-3 sm:px-4 text-right text-sm sm:text-base ${getDiffColor(pctDiff)}`}>
                      {pctDiff != null ? `${pctDiff >= 0 ? '+' : ''}${pctDiff.toFixed(1)}%` : '-'}
                    </td>
                  )}
                  {visibleColumns.zScore && (
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
                  )}
                </tr>
              );
            })}
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

function getDiffColor(value: number | null): string {
  if (value == null || value === 0) return 'text-white/60';
  return value > 0 ? 'text-green-400' : 'text-red-400';
}

function getZScoreColor(zScore: number): string {
  if (zScore >= 1) return 'text-green-400';
  if (zScore >= 0) return 'text-accent';
  if (zScore >= -1) return 'text-yellow-400';
  return 'text-red-400';
}
