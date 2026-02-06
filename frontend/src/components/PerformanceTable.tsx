'use client';

import { useState, useEffect } from 'react';
import { eventsApi, analysisApi } from '@/lib/api';
import { getMetricLabel } from './MetricSelector';
import { EventFormModal } from './EventFormModal';
import type { ReferenceGroup, PerformanceRow, PerformanceEvent, BenchmarkSource } from '@/lib/types';

interface PerformanceTableProps {
  athleteId: string;
  referenceGroup: ReferenceGroup;
  metric: string;
  benchmarkSource?: BenchmarkSource;
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
  benchmarkSource,
}: PerformanceTableProps) {
  const [rows, setRows] = useState<PerformanceRow[]>([]);
  const [rawEvents, setRawEvents] = useState<PerformanceEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>({
    mass: true,
    groupAvg: true,
    diff: true,
    pctDiff: true,
    zScore: true,
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PerformanceEvent | null>(null);

  useEffect(() => {
    loadData();
  }, [athleteId, referenceGroup, metric, benchmarkSource]);

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
          benchmarkSource,
        }).catch(() => ({} as Record<string, { z_score: number; mean: number }>)),
      ]);

      setRawEvents(events);

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

  async function handleDelete(eventId: string) {
    if (!window.confirm('Delete this event? This cannot be undone.')) return;
    try {
      await eventsApi.delete(eventId);
      loadData();
    } catch {
      setError('Failed to delete event');
    }
  }

  function handleEdit(rowId: string) {
    const event = rawEvents.find((e) => e.id === rowId);
    if (event) setEditingEvent(event);
  }

  function toggleColumn(key: keyof ColumnVisibility) {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const label = getMetricLabel(metric);

  const addEventButton = (
    <button
      onClick={() => setShowAddModal(true)}
      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-accent text-[#090A3D] hover:bg-accent/80 transition-colors"
    >
      + Add Data
    </button>
  );

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
        <p className="text-white/60 mb-4">No performance data recorded</p>
        {addEventButton}
        {showAddModal && (
          <EventFormModal
            athleteId={athleteId}
            onClose={() => setShowAddModal(false)}
            onSaved={() => { setShowAddModal(false); loadData(); }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="-mx-4 sm:mx-0">
      {/* Column toggles + Add Data */}
      <div className="flex flex-wrap items-center gap-2 px-3 sm:px-0 mb-3">
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
        <div className="ml-auto">
          {addEventButton}
        </div>
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
              <th className="w-20 py-2 sm:py-3 px-2" />
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
                  <td className="py-2 sm:py-3 px-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(row.id)}
                      className="p-1.5 rounded hover:bg-secondary-muted/50 text-white/40 hover:text-accent transition-colors"
                      title="Edit event"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="p-1.5 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                      title="Delete event"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <EventFormModal
          athleteId={athleteId}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); loadData(); }}
        />
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <EventFormModal
          athleteId={athleteId}
          existingEvent={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSaved={() => { setEditingEvent(null); loadData(); }}
        />
      )}
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
