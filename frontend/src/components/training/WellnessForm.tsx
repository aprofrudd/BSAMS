'use client';

import { useState, useEffect } from 'react';
import { wellnessApi } from '@/lib/api';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import type { WellnessEntry } from '@/lib/types';

interface WellnessFormProps {
  athleteId: string;
  existingEntry?: WellnessEntry | null;
  onClose: () => void;
  onSaved: () => void;
}

const WELLNESS_FIELDS: { key: string; label: string; lowLabel: string; highLabel: string }[] = [
  { key: 'sleep_quality', label: 'Sleep Quality', lowLabel: 'Poor', highLabel: 'Excellent' },
  { key: 'fatigue', label: 'Fatigue', lowLabel: 'Low', highLabel: 'High' },
  { key: 'soreness', label: 'Soreness', lowLabel: 'Low', highLabel: 'High' },
  { key: 'stress', label: 'Stress', lowLabel: 'Low', highLabel: 'High' },
  { key: 'mood', label: 'Mood', lowLabel: 'Poor', highLabel: 'Excellent' },
];

function toInputDate(isoDate: string): string {
  return isoDate.slice(0, 10);
}

export function WellnessForm({
  athleteId,
  existingEntry,
  onClose,
  onSaved,
}: WellnessFormProps) {
  const focusTrapRef = useFocusTrap<HTMLDivElement>();
  const isEdit = !!existingEntry;

  const [entryDate, setEntryDate] = useState(
    existingEntry ? toInputDate(existingEntry.entry_date) : new Date().toISOString().slice(0, 10)
  );
  const [scores, setScores] = useState<Record<string, number>>(() => {
    if (existingEntry) {
      return {
        sleep_quality: existingEntry.sleep_quality,
        fatigue: existingEntry.fatigue,
        soreness: existingEntry.soreness,
        stress: existingEntry.stress,
        mood: existingEntry.mood,
      };
    }
    return {
      sleep_quality: 3,
      fatigue: 3,
      soreness: 3,
      stress: 3,
      mood: 3,
    };
  });
  const [notes, setNotes] = useState(existingEntry?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  function setScore(key: string, value: number) {
    setScores((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (isEdit && existingEntry) {
        await wellnessApi.updateEntry(existingEntry.id, {
          ...(entryDate ? { entry_date: entryDate } : {}),
          sleep_quality: scores.sleep_quality,
          fatigue: scores.fatigue,
          soreness: scores.soreness,
          stress: scores.stress,
          mood: scores.mood,
          notes: notes || undefined,
        });
      } else {
        await wellnessApi.createEntry({
          athlete_id: athleteId,
          entry_date: entryDate,
          sleep_quality: scores.sleep_quality,
          fatigue: scores.fatigue,
          soreness: scores.soreness,
          stress: scores.stress,
          mood: scores.mood,
          notes: notes || undefined,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save wellness entry');
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
        <h2 className="text-lg font-semibold text-accent mb-4">
          {isEdit ? 'Edit Wellness' : 'Log Wellness'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Date</label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="input w-full"
              required
            />
          </div>

          {WELLNESS_FIELDS.map((field) => (
            <div key={field.key}>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm text-white/60">{field.label}</label>
                <span className="text-accent text-sm font-medium">{scores[field.key]}/5</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40 w-16">{field.lowLabel}</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={scores[field.key]}
                  onChange={(e) => setScore(field.key, Number(e.target.value))}
                  className="flex-1 accent-accent"
                />
                <span className="text-xs text-white/40 w-16 text-right">{field.highLabel}</span>
              </div>
            </div>
          ))}

          <div>
            <label className="block text-sm text-white/60 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input w-full resize-none"
              rows={2}
              maxLength={1000}
              placeholder="How are you feeling?"
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
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Log Wellness'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
