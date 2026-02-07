'use client';

import { useState, useEffect } from 'react';
import { eventsApi } from '@/lib/api';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import type { PerformanceEvent, EventMetrics } from '@/lib/types';

interface EventFormModalProps {
  athleteId: string;
  existingEvent?: PerformanceEvent | null;
  onClose: () => void;
  onSaved: () => void;
}

const METRIC_FIELDS: { key: string; label: string; max: number }[] = [
  { key: 'body_mass_kg', label: 'Body Mass (kg)', max: 300 },
  { key: 'height_cm', label: 'CMJ Height (cm)', max: 500 },
  { key: 'sj_height_cm', label: 'SJ Height (cm)', max: 500 },
  { key: 'flight_time_ms', label: 'Flight Time (ms)', max: 500 },
  { key: 'contraction_time_ms', label: 'Contact Time (ms)', max: 500 },
];

function toInputDate(isoDate: string): string {
  return isoDate.slice(0, 10);
}

export function EventFormModal({
  athleteId,
  existingEvent,
  onClose,
  onSaved,
}: EventFormModalProps) {
  const focusTrapRef = useFocusTrap<HTMLDivElement>();
  const isEdit = !!existingEvent;
  const [eventDate, setEventDate] = useState(
    existingEvent ? toInputDate(existingEvent.event_date) : ''
  );
  const [metricValues, setMetricValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingEvent) {
      const vals: Record<string, string> = {};
      for (const field of METRIC_FIELDS) {
        const v = existingEvent.metrics[field.key];
        if (v != null) vals[field.key] = String(v);
      }
      setMetricValues(vals);
    }
  }, [existingEvent]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  function setMetric(key: string, value: string) {
    setMetricValues((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    if (!isEdit && !eventDate) return 'Event date is required';
    for (const field of METRIC_FIELDS) {
      const raw = metricValues[field.key];
      if (raw != null && raw !== '') {
        const num = Number(raw);
        if (isNaN(num) || num < 0 || num > field.max) {
          return `${field.label} must be 0-${field.max}`;
        }
      }
    }
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
      const metrics: EventMetrics = {};
      for (const field of METRIC_FIELDS) {
        const raw = metricValues[field.key];
        if (raw != null && raw !== '') {
          metrics[field.key] = Number(raw);
        }
      }

      // Auto-calculate EUR = CMJ - SJ
      if (metrics.height_cm != null && metrics.sj_height_cm != null) {
        metrics.eur_cm = Number((Number(metrics.height_cm) - Number(metrics.sj_height_cm)).toFixed(2));
      }

      // Auto-calculate RSI = Flight Time / Contact Time
      if (metrics.flight_time_ms != null && metrics.contraction_time_ms != null && Number(metrics.contraction_time_ms) !== 0) {
        metrics.rsi = Number((Number(metrics.flight_time_ms) / Number(metrics.contraction_time_ms)).toFixed(2));
      }

      if (isEdit && existingEvent) {
        await eventsApi.update(existingEvent.id, {
          ...(eventDate ? { event_date: eventDate } : {}),
          metrics,
        });
      } else {
        await eventsApi.create({
          athlete_id: athleteId,
          event_date: eventDate,
          metrics,
        });
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event');
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
          {isEdit ? 'Edit Data' : 'Add Data'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-white/60 mb-1">Event Date</label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="input w-full"
              required={!isEdit}
            />
          </div>

          {METRIC_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-sm text-white/60 mb-1">{field.label}</label>
              <input
                type="number"
                step="any"
                min="0"
                max={field.max}
                value={metricValues[field.key] ?? ''}
                onChange={(e) => setMetric(field.key, e.target.value)}
                className="input w-full"
                placeholder="-"
              />
            </div>
          ))}

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
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
