'use client';

import { useState, useEffect } from 'react';
import { trainingApi } from '@/lib/api';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import type { TrainingSession } from '@/lib/types';

interface SessionLogFormProps {
  athleteId: string;
  existingSession?: TrainingSession | null;
  onClose: () => void;
  onSaved: () => void;
}

const TRAINING_TYPES = [
  'Strength',
  'Boxing',
  'Conditioning',
  'Plyometric',
  'Recovery',
  'Sparring',
  'Pads',
  'Technical',
  'Other',
];

function toInputDate(isoDate: string): string {
  return isoDate.slice(0, 10);
}

export function SessionLogForm({
  athleteId,
  existingSession,
  onClose,
  onSaved,
}: SessionLogFormProps) {
  const focusTrapRef = useFocusTrap<HTMLDivElement>();
  const isEdit = !!existingSession;

  const [sessionDate, setSessionDate] = useState(
    existingSession ? toInputDate(existingSession.session_date) : ''
  );
  const [trainingType, setTrainingType] = useState(
    existingSession?.training_type || 'Strength'
  );
  const [durationMinutes, setDurationMinutes] = useState(
    existingSession ? String(existingSession.duration_minutes) : ''
  );
  const [rpe, setRpe] = useState(
    existingSession ? String(existingSession.rpe) : ''
  );
  const [notes, setNotes] = useState(existingSession?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const computedSrpe = rpe && durationMinutes
    ? Number(rpe) * Number(durationMinutes)
    : null;

  function validate(): string | null {
    if (!isEdit && !sessionDate) return 'Session date is required';
    if (!durationMinutes || Number(durationMinutes) < 1 || Number(durationMinutes) > 600)
      return 'Duration must be 1-600 minutes';
    if (!rpe || Number(rpe) < 1 || Number(rpe) > 10)
      return 'RPE must be 1-10';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEdit && existingSession) {
        await trainingApi.updateSession(existingSession.id, {
          ...(sessionDate ? { session_date: sessionDate } : {}),
          training_type: trainingType,
          duration_minutes: Number(durationMinutes),
          rpe: Number(rpe),
          notes: notes || undefined,
        });
      } else {
        await trainingApi.createSession({
          athlete_id: athleteId,
          session_date: sessionDate,
          training_type: trainingType,
          duration_minutes: Number(durationMinutes),
          rpe: Number(rpe),
          notes: notes || undefined,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save session');
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
          {isEdit ? 'Edit Session' : 'Log Session'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-white/60 mb-1">Session Date</label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="input w-full"
              required={!isEdit}
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Training Type</label>
            <select
              value={trainingType}
              onChange={(e) => setTrainingType(e.target.value)}
              className="select w-full"
            >
              {TRAINING_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Duration (minutes)</label>
            <input
              type="number"
              min="1"
              max="600"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="input w-full"
              placeholder="e.g. 60"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">RPE (1-10)</label>
            <input
              type="number"
              min="1"
              max="10"
              value={rpe}
              onChange={(e) => setRpe(e.target.value)}
              className="input w-full"
              placeholder="1 = very easy, 10 = maximal"
              required
            />
          </div>

          {computedSrpe !== null && (
            <div className="text-sm text-white/60">
              sRPE: <span className="text-accent font-medium">{computedSrpe}</span>
              <span className="text-white/40 ml-1">(RPE x Duration)</span>
            </div>
          )}

          <div>
            <label className="block text-sm text-white/60 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input w-full resize-none"
              rows={3}
              maxLength={1000}
              placeholder="Session notes..."
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
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Log Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
