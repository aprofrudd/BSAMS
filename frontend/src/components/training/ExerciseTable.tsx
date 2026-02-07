'use client';

import { useState, useEffect, useCallback } from 'react';
import { exercisesApi } from '@/lib/api';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import type { ExercisePrescription } from '@/lib/types';

interface ExerciseTableProps {
  sessionId: string;
  onClose: () => void;
}

const EXERCISE_CATEGORIES = ['Strength', 'Plyometric', 'Conditioning', 'Other'];

export function ExerciseTable({ sessionId, onClose }: ExerciseTableProps) {
  const focusTrapRef = useFocusTrap<HTMLDivElement>();
  const [exercises, setExercises] = useState<ExercisePrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New exercise form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [category, setCategory] = useState('Strength');
  const [setNumber, setSetNumber] = useState('1');
  const [reps, setReps] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [tempo, setTempo] = useState('');
  const [restSeconds, setRestSeconds] = useState('');
  const [saving, setSaving] = useState(false);

  const loadExercises = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await exercisesApi.list(sessionId);
      setExercises(data);
    } catch (err) {
      setError('Failed to load exercises');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  async function handleAddExercise(e: React.FormEvent) {
    e.preventDefault();
    if (!exerciseName.trim()) return;

    setSaving(true);
    try {
      await exercisesApi.create(sessionId, {
        exercise_name: exerciseName.trim(),
        exercise_category: category,
        set_number: Number(setNumber) || 1,
        reps: reps ? Number(reps) : undefined,
        weight_kg: weightKg ? Number(weightKg) : undefined,
        tempo: tempo || undefined,
        rest_seconds: restSeconds ? Number(restSeconds) : undefined,
      });
      // Reset form
      setExerciseName('');
      setSetNumber(String((exercises.length > 0 ? Math.max(...exercises.map(e => e.set_number)) : 0) + 1));
      setReps('');
      setWeightKg('');
      setTempo('');
      setRestSeconds('');
      setShowAddForm(false);
      loadExercises();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add exercise');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(exerciseId: string) {
    try {
      await exercisesApi.delete(sessionId, exerciseId);
      setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));
    } catch (err) {
      console.error('Failed to delete exercise:', err);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={focusTrapRef} className="card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-accent">Exercises</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-red-400 text-sm py-4 text-center">{error}</p>
        ) : exercises.length === 0 && !showAddForm ? (
          <p className="text-white/60 text-sm py-4 text-center">
            No exercises logged for this session
          </p>
        ) : (
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/60 border-b border-secondary-muted">
                  <th className="text-left py-2 px-2">Set</th>
                  <th className="text-left py-2 px-2">Exercise</th>
                  <th className="text-left py-2 px-2">Category</th>
                  <th className="text-right py-2 px-2">Reps</th>
                  <th className="text-right py-2 px-2">Weight</th>
                  <th className="text-left py-2 px-2">Tempo</th>
                  <th className="text-right py-2 px-2">Rest</th>
                  <th className="text-right py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {exercises.map((ex) => (
                  <tr
                    key={ex.id}
                    className="border-b border-secondary-muted/50 hover:bg-secondary-muted/20 transition-colors"
                  >
                    <td className="py-2 px-2">{ex.set_number}</td>
                    <td className="py-2 px-2 font-medium">{ex.exercise_name}</td>
                    <td className="py-2 px-2 text-white/60">{ex.exercise_category || '-'}</td>
                    <td className="py-2 px-2 text-right">{ex.reps ?? '-'}</td>
                    <td className="py-2 px-2 text-right">{ex.weight_kg != null ? `${ex.weight_kg} kg` : '-'}</td>
                    <td className="py-2 px-2 text-white/60">{ex.tempo || '-'}</td>
                    <td className="py-2 px-2 text-right">{ex.rest_seconds != null ? `${ex.rest_seconds}s` : '-'}</td>
                    <td className="py-2 px-2 text-right">
                      <button
                        onClick={() => handleDelete(ex.id)}
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

        {/* Add Exercise Form */}
        {showAddForm ? (
          <form onSubmit={handleAddExercise} className="space-y-3 border-t border-secondary-muted pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/60 mb-1">Exercise Name</label>
                <input
                  type="text"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  className="input w-full text-sm"
                  placeholder="e.g. Back Squat"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="select w-full text-sm"
                >
                  {EXERCISE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Set #</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={setNumber}
                  onChange={(e) => setSetNumber(e.target.value)}
                  className="input w-full text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Reps</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  className="input w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Weight (kg)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="input w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Tempo</label>
                <input
                  type="text"
                  value={tempo}
                  onChange={(e) => setTempo(e.target.value)}
                  className="input w-full text-sm"
                  placeholder="e.g. 3-1-1-0"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Rest (seconds)</label>
                <input
                  type="number"
                  min="0"
                  max="600"
                  value={restSeconds}
                  onChange={(e) => setRestSeconds(e.target.value)}
                  className="input w-full text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Exercise'}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => {
              setSetNumber(String((exercises.length > 0 ? Math.max(...exercises.map(e => e.set_number)) : 0) + 1));
              setShowAddForm(true);
            }}
            className="w-full px-3 py-2 rounded text-sm font-medium bg-accent text-[#090A3D] hover:bg-accent/80 transition-colors"
          >
            + Add Exercise
          </button>
        )}
      </div>
    </div>
  );
}
