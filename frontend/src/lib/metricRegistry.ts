/**
 * Central metric registry — single source of truth for all metric definitions.
 *
 * Replaces scattered METRIC_LABELS in MetricSelector, CsvPreviewTable, etc.
 * Mirrors backend app/schemas/metric_registry.py
 */

export interface MetricDefinition {
  key: string;
  label: string;
  unit: string;
  domain: 'testing' | 'training' | 'wellness';
  higherIsBetter: boolean;
}

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  // Testing metrics
  { key: 'height_cm', label: 'CMJ Height (cm)', unit: 'cm', domain: 'testing', higherIsBetter: true },
  { key: 'sj_height_cm', label: 'SJ Height (cm)', unit: 'cm', domain: 'testing', higherIsBetter: true },
  { key: 'eur_cm', label: 'Eccentric Utilisation Ratio (cm)', unit: 'cm', domain: 'testing', higherIsBetter: true },
  { key: 'rsi', label: 'Reactive Strength Index', unit: '', domain: 'testing', higherIsBetter: true },
  { key: 'flight_time_ms', label: 'Flight Time (ms)', unit: 'ms', domain: 'testing', higherIsBetter: true },
  { key: 'contraction_time_ms', label: 'Contact Time (ms)', unit: 'ms', domain: 'testing', higherIsBetter: false },
  { key: 'body_mass_kg', label: 'Body Mass (kg)', unit: 'kg', domain: 'testing', higherIsBetter: false },
];

// Lookup helpers
export const METRIC_BY_KEY: Record<string, MetricDefinition> = Object.fromEntries(
  METRIC_DEFINITIONS.map((m) => [m.key, m])
);

export const METRIC_LABELS: Record<string, string> = Object.fromEntries(
  METRIC_DEFINITIONS.map((m) => [m.key, m.label])
);

export function getMetricLabel(key: string): string {
  return METRIC_LABELS[key] || key;
}
