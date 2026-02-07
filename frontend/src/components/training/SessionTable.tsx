'use client';

import { useState, useEffect, useCallback } from 'react';
import { trainingApi } from '@/lib/api';
import { SessionLogForm } from './SessionLogForm';
import { ExerciseTable } from './ExerciseTable';
import type { TrainingSession } from '@/lib/types';

interface SessionTableProps {
  athleteId: string;
  onDataChanged?: () => void;
}

export function SessionTable({ athleteId, onDataChanged }: SessionTableProps) {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);
  const [exerciseSessionId, setExerciseSessionId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await trainingApi.listSessions(athleteId);
      setSessions(data);
    } catch (err) {
      setError('Failed to load sessions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  async function handleDelete(sessionId: string) {
    if (!window.confirm('Delete this training session?')) return;
    try {
      await trainingApi.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      onDataChanged?.();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function getSrpeColor(srpe: number): string {
    if (srpe >= 500) return 'text-red-400';
    if (srpe >= 300) return 'text-yellow-400';
    return 'text-green-400';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title text-base">Training Sessions</h3>
        <button
          onClick={() => { setEditingSession(null); setShowForm(true); }}
          className="px-3 py-1.5 rounded text-sm font-medium bg-accent text-[#090A3D] hover:bg-accent/80 transition-colors"
        >
          + Log Session
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-red-400 text-sm py-4 text-center">{error}</p>
      ) : sessions.length === 0 ? (
        <p className="text-white/60 text-sm py-8 text-center">
          No training sessions logged yet
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/60 border-b border-secondary-muted">
                <th className="text-left py-2 px-2">Date</th>
                <th className="text-left py-2 px-2">Type</th>
                <th className="text-right py-2 px-2">Duration</th>
                <th className="text-right py-2 px-2">RPE</th>
                <th className="text-right py-2 px-2">sRPE</th>
                <th className="text-left py-2 px-2">Notes</th>
                <th className="text-right py-2 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr
                  key={session.id}
                  className="border-b border-secondary-muted/50 hover:bg-secondary-muted/20 transition-colors"
                >
                  <td className="py-2 px-2 whitespace-nowrap">
                    {formatDate(session.session_date)}
                  </td>
                  <td className="py-2 px-2">{session.training_type}</td>
                  <td className="py-2 px-2 text-right">{session.duration_minutes} min</td>
                  <td className="py-2 px-2 text-right">{session.rpe}</td>
                  <td className={`py-2 px-2 text-right font-medium ${getSrpeColor(session.srpe)}`}>
                    {session.srpe}
                  </td>
                  <td className="py-2 px-2 text-white/60 max-w-[200px] truncate">
                    {session.notes || '-'}
                  </td>
                  <td className="py-2 px-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => setExerciseSessionId(session.id)}
                      className="text-white/60 hover:text-accent text-xs mr-2 transition-colors"
                    >
                      Exercises
                    </button>
                    <button
                      onClick={() => { setEditingSession(session); setShowForm(true); }}
                      className="text-white/60 hover:text-accent text-xs mr-2 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(session.id)}
                      className="text-white/60 hover:text-red-400 text-xs transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <SessionLogForm
          athleteId={athleteId}
          existingSession={editingSession}
          onClose={() => { setShowForm(false); setEditingSession(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditingSession(null);
            loadSessions();
            onDataChanged?.();
          }}
        />
      )}

      {exerciseSessionId && (
        <ExerciseTable
          sessionId={exerciseSessionId}
          onClose={() => setExerciseSessionId(null)}
        />
      )}
    </div>
  );
}
