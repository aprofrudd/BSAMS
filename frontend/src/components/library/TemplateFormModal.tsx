'use client';

import { useState, useEffect } from 'react';
import { sessionTemplatesApi } from '@/lib/api';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { ExerciseAutocomplete } from '@/components/training/ExerciseAutocomplete';
import type { SessionTemplate, TemplateExerciseCreate, ExerciseLibraryItem } from '@/lib/types';

interface TemplateFormModalProps {
  existingTemplate?: SessionTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}

const TRAINING_TYPES = [
  'Strength',
  'Boxing',
  'Conditioning',
  'Recovery',
  'Sparring',
  'Pads',
  'Technical',
  'Other',
];

interface ExerciseRow {
  key: number;
  exercise_name: string;
  exercise_category: string;
  exercise_library_id?: string;
  sets: string;
  reps: string;
  weight_kg: string;
  tempo: string;
  rest_seconds: string;
}

let rowKeyCounter = 0;
function nextKey() {
  return ++rowKeyCounter;
}

function createEmptyRow(): ExerciseRow {
  return {
    key: nextKey(),
    exercise_name: '',
    exercise_category: 'Strength',
    sets: '1',
    reps: '',
    weight_kg: '',
    tempo: '',
    rest_seconds: '',
  };
}

export function TemplateFormModal({
  existingTemplate,
  onClose,
  onSaved,
}: TemplateFormModalProps) {
  const focusTrapRef = useFocusTrap<HTMLDivElement>();
  const isEdit = !!existingTemplate;

  const [templateName, setTemplateName] = useState(existingTemplate?.template_name || '');
  const [trainingType, setTrainingType] = useState(existingTemplate?.training_type || 'Strength');
  const [notes, setNotes] = useState(existingTemplate?.notes || '');
  const [exerciseRows, setExerciseRows] = useState<ExerciseRow[]>(() => {
    if (existingTemplate?.exercises?.length) {
      return existingTemplate.exercises.map((ex) => ({
        key: nextKey(),
        exercise_name: ex.exercise_name,
        exercise_category: ex.exercise_category || 'Strength',
        exercise_library_id: ex.exercise_library_id || undefined,
        sets: String(ex.sets),
        reps: ex.reps ? String(ex.reps) : '',
        weight_kg: ex.weight_kg ? String(ex.weight_kg) : '',
        tempo: ex.tempo || '',
        rest_seconds: ex.rest_seconds ? String(ex.rest_seconds) : '',
      }));
    }
    return [createEmptyRow()];
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  function updateRow(index: number, field: keyof ExerciseRow, value: string) {
    setExerciseRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function handleLibrarySelect(index: number, item: ExerciseLibraryItem) {
    setExerciseRows((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        exercise_name: item.exercise_name,
        exercise_category: item.exercise_category || 'Strength',
        exercise_library_id: item.id,
        reps: item.default_reps ? String(item.default_reps) : updated[index].reps,
        weight_kg: item.default_weight_kg ? String(item.default_weight_kg) : updated[index].weight_kg,
        tempo: item.default_tempo || updated[index].tempo,
        rest_seconds: item.default_rest_seconds ? String(item.default_rest_seconds) : updated[index].rest_seconds,
      };
      return updated;
    });
  }

  function addRow() {
    setExerciseRows((prev) => [...prev, createEmptyRow()]);
  }

  function removeRow(index: number) {
    setExerciseRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  function moveRow(index: number, direction: 'up' | 'down') {
    setExerciseRows((prev) => {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const updated = [...prev];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!templateName.trim()) {
      setError('Template name is required');
      return;
    }

    // Build exercises list, filtering out empty rows
    const exercises: TemplateExerciseCreate[] = exerciseRows
      .filter((row) => row.exercise_name.trim())
      .map((row, index) => ({
        exercise_library_id: row.exercise_library_id || undefined,
        exercise_name: row.exercise_name.trim(),
        exercise_category: row.exercise_category || undefined,
        order_index: index + 1,
        sets: Number(row.sets) || 1,
        reps: row.reps ? Number(row.reps) : undefined,
        weight_kg: row.weight_kg ? Number(row.weight_kg) : undefined,
        tempo: row.tempo || undefined,
        rest_seconds: row.rest_seconds ? Number(row.rest_seconds) : undefined,
      }));

    setSaving(true);
    setError(null);

    try {
      if (isEdit && existingTemplate) {
        await sessionTemplatesApi.update(existingTemplate.id, {
          template_name: templateName.trim(),
          training_type: trainingType,
          notes: notes || undefined,
          exercises,
        });
      } else {
        await sessionTemplatesApi.create({
          template_name: templateName.trim(),
          training_type: trainingType,
          notes: notes || undefined,
          exercises,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
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
      <div ref={focusTrapRef} className="card w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true">
        <h2 className="section-title text-base mb-4">
          {isEdit ? 'Edit Template' : 'Create Template'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-white/60 mb-1">Template Name</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="input w-full"
                placeholder="e.g. Leg Day"
                required
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
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input w-full resize-none"
              rows={2}
              maxLength={1000}
              placeholder="Template description..."
            />
          </div>

          {/* Exercises */}
          <div>
            <h3 className="text-sm text-white/60 mb-2">Exercises</h3>
            <div className="space-y-2">
              {exerciseRows.map((row, index) => (
                <div key={row.key} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto] gap-2 items-end">
                  <div>
                    {index === 0 && <label className="block text-xs text-white/40 mb-1">Name</label>}
                    <ExerciseAutocomplete
                      value={row.exercise_name}
                      onChange={(val) => updateRow(index, 'exercise_name', val)}
                      onSelect={(item) => handleLibrarySelect(index, item)}
                    />
                  </div>
                  <div className="w-16">
                    {index === 0 && <label className="block text-xs text-white/40 mb-1">Sets</label>}
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={row.sets}
                      onChange={(e) => updateRow(index, 'sets', e.target.value)}
                      className="input w-full text-sm"
                    />
                  </div>
                  <div className="w-16">
                    {index === 0 && <label className="block text-xs text-white/40 mb-1">Reps</label>}
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={row.reps}
                      onChange={(e) => updateRow(index, 'reps', e.target.value)}
                      className="input w-full text-sm"
                    />
                  </div>
                  <div className="w-20">
                    {index === 0 && <label className="block text-xs text-white/40 mb-1">Weight</label>}
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={row.weight_kg}
                      onChange={(e) => updateRow(index, 'weight_kg', e.target.value)}
                      className="input w-full text-sm"
                    />
                  </div>
                  <div className="w-20">
                    {index === 0 && <label className="block text-xs text-white/40 mb-1">Tempo</label>}
                    <input
                      type="text"
                      value={row.tempo}
                      onChange={(e) => updateRow(index, 'tempo', e.target.value)}
                      className="input w-full text-sm"
                      placeholder="3-1-1-0"
                    />
                  </div>
                  <div className="w-16">
                    {index === 0 && <label className="block text-xs text-white/40 mb-1">Rest</label>}
                    <input
                      type="number"
                      min="0"
                      max="600"
                      value={row.rest_seconds}
                      onChange={(e) => updateRow(index, 'rest_seconds', e.target.value)}
                      className="input w-full text-sm"
                    />
                  </div>
                  <div className="flex gap-1">
                    {index === 0 && <label className="block text-xs text-white/40 mb-1">&nbsp;</label>}
                    <button
                      type="button"
                      onClick={() => moveRow(index, 'up')}
                      disabled={index === 0}
                      className="text-white/40 hover:text-white disabled:opacity-20 text-xs px-1"
                      title="Move up"
                    >
                      &#9650;
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRow(index, 'down')}
                      disabled={index === exerciseRows.length - 1}
                      className="text-white/40 hover:text-white disabled:opacity-20 text-xs px-1"
                      title="Move down"
                    >
                      &#9660;
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      disabled={exerciseRows.length <= 1}
                      className="text-white/40 hover:text-red-400 disabled:opacity-20 text-xs px-1"
                      title="Remove"
                    >
                      &#10005;
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addRow}
              className="mt-2 text-sm text-accent hover:text-accent/80 transition-colors"
            >
              + Add Exercise Row
            </button>
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
              {saving ? 'Saving...' : isEdit ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
