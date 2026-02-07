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

const HOOPER_FIELDS: { key: string; label: string; lowLabel: string; highLabel: string }[] = [
  { key: 'sleep', label: 'Sleep Quality', lowLabel: 'Very Good', highLabel: 'Very Bad' },
  { key: 'fatigue', label: 'Fatigue', lowLabel: 'Very Low', highLabel: 'Very High' },
  { key: 'stress', label: 'Stress', lowLabel: 'Very Low', highLabel: 'Very High' },
  { key: 'doms', label: 'DOMS', lowLabel: 'Very Low', highLabel: 'Very High' },
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
        sleep: existingEntry.sleep,
        fatigue: existingEntry.fatigue,
        stress: existingEntry.stress,
        doms: existingEntry.doms,
      };
    }
    return {
      sleep: 1,
      fatigue: 1,
      stress: 1,
      doms: 1,
    };
  });
  const [notes, setNotes] = useState(existingEntry?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hooperIndex = scores.sleep + scores.fatigue + scores.stress + scores.doms;

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

  function getHooperColor(index: number): string {
    if (index <= 10) return 'text-green-400';
    if (index <= 16) return 'text-yellow-400';
    return 'text-red-400';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (isEdit && existingEntry) {
        await wellnessApi.updateEntry(existingEntry.id, {
          ...(entryDate ? { entry_date: entryDate } : {}),
          sleep: scores.sleep,
          fatigue: scores.fatigue,
          stress: scores.stress,
          doms: scores.doms,
          notes: notes || undefined,
        });
      } else {
        await wellnessApi.createEntry({
          athlete_id: athleteId,
          entry_date: entryDate,
          sleep: scores.sleep,
          fatigue: scores.fatigue,
          stress: scores.stress,
          doms: scores.doms,
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
          {isEdit ? 'Edit Hooper Index' : 'Log Hooper Index'}
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

          {HOOPER_FIELDS.map((field) => (
            <div key={field.key}>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm text-white/60">{field.label}</label>
                <span className="text-accent text-sm font-medium">{scores[field.key]}/7</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40 w-16">{field.lowLabel}</span>
                <input
                  type="range"
                  min="1"
                  max="7"
                  step="1"
                  value={scores[field.key]}
                  onChange={(e) => setScore(field.key, Number(e.target.value))}
                  className="flex-1 accent-accent"
                />
                <span className="text-xs text-white/40 w-16 text-right">{field.highLabel}</span>
              </div>
            </div>
          ))}

          {/* Hooper Index display */}
          <div className="bg-secondary-muted/30 rounded-lg p-3 text-center">
            <div className="text-xs text-white/60 mb-1">Hooper Index</div>
            <div className={`text-2xl font-bold ${getHooperColor(hooperIndex)}`}>
              {hooperIndex}
            </div>
            <div className="text-xs text-white/40 mt-1">Range: 4 (best) - 28 (worst)</div>
          </div>

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
