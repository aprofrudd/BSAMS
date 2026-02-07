'use client';

import { useState, useEffect } from 'react';
import { exerciseLibraryApi } from '@/lib/api';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import type { ExerciseLibraryItem } from '@/lib/types';

interface ExerciseLibraryFormModalProps {
  existingExercise?: ExerciseLibraryItem | null;
  onClose: () => void;
  onSaved: () => void;
}

const EXERCISE_CATEGORIES = ['Strength', 'Plyometric', 'Conditioning', 'Other'];

export function ExerciseLibraryFormModal({
  existingExercise,
  onClose,
  onSaved,
}: ExerciseLibraryFormModalProps) {
  const focusTrapRef = useFocusTrap<HTMLDivElement>();
  const isEdit = !!existingExercise;

  const [exerciseName, setExerciseName] = useState(existingExercise?.exercise_name || '');
  const [category, setCategory] = useState(existingExercise?.exercise_category || 'Strength');
  const [defaultReps, setDefaultReps] = useState(
    existingExercise?.default_reps ? String(existingExercise.default_reps) : ''
  );
  const [defaultWeight, setDefaultWeight] = useState(
    existingExercise?.default_weight_kg ? String(existingExercise.default_weight_kg) : ''
  );
  const [defaultTempo, setDefaultTempo] = useState(existingExercise?.default_tempo || '');
  const [defaultRest, setDefaultRest] = useState(
    existingExercise?.default_rest_seconds ? String(existingExercise.default_rest_seconds) : ''
  );
  const [notes, setNotes] = useState(existingExercise?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!exerciseName.trim()) {
      setError('Exercise name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data = {
        exercise_name: exerciseName.trim(),
        exercise_category: category || undefined,
        default_reps: defaultReps ? Number(defaultReps) : undefined,
        default_weight_kg: defaultWeight ? Number(defaultWeight) : undefined,
        default_tempo: defaultTempo || undefined,
        default_rest_seconds: defaultRest ? Number(defaultRest) : undefined,
        notes: notes || undefined,
      };

      if (isEdit && existingExercise) {
        await exerciseLibraryApi.update(existingExercise.id, data);
      } else {
        await exerciseLibraryApi.create(data);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save exercise');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={focusTrapRef} className="card w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true">
        <h2 className="section-title text-base mb-4">
          {isEdit ? 'Edit Exercise' : 'Add Exercise'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-white/60 mb-1">Exercise Name</label>
            <input
              type="text"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              className="input w-full"
              placeholder="e.g. Back Squat"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="select w-full"
            >
              {EXERCISE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-white/60 mb-1">Default Reps</label>
              <input
                type="number"
                min="1"
                max="100"
                value={defaultReps}
                onChange={(e) => setDefaultReps(e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Default Weight (kg)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={defaultWeight}
                onChange={(e) => setDefaultWeight(e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Default Tempo</label>
              <input
                type="text"
                value={defaultTempo}
                onChange={(e) => setDefaultTempo(e.target.value)}
                className="input w-full"
                placeholder="e.g. 3-1-1-0"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Default Rest (s)</label>
              <input
                type="number"
                min="0"
                max="600"
                value={defaultRest}
                onChange={(e) => setDefaultRest(e.target.value)}
                className="input w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input w-full resize-none"
              rows={2}
              maxLength={500}
              placeholder="Coaching cues, notes..."
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Add Exercise'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
