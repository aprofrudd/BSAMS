// Athlete types
export interface Athlete {
  id: string;
  coach_id: string;
  name: string;
  gender: 'male' | 'female';
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
}

export interface AthleteCreate {
  name: string;
  gender: 'male' | 'female';
  date_of_birth?: string;
}

export interface AthleteUpdate {
  name?: string;
  gender?: 'male' | 'female';
  date_of_birth?: string | null;
}

// Performance Event types
export interface PerformanceEvent {
  id: string;
  athlete_id: string;
  event_date: string;
  metrics: EventMetrics;
  created_at: string;
  updated_at: string;
}

export interface EventMetrics {
  test_type?: string;
  height_cm?: number;
  rsi?: number;
  flight_time_ms?: number;
  contraction_time_ms?: number;
  body_mass_kg?: number;
  [key: string]: string | number | undefined;
}

export interface PerformanceEventCreate {
  athlete_id: string;
  event_date: string;
  metrics: EventMetrics;
}

export interface PerformanceEventUpdate {
  event_date?: string;
  metrics?: EventMetrics;
}

// Analysis types
export type ReferenceGroup = 'cohort' | 'gender' | 'mass_band';

export interface Benchmarks {
  mean: number | null;
  std_dev: number | null;
  mode: number | null;
  ci_lower: number | null;
  ci_upper: number | null;
  count: number;
  reference_group: string;
  metric: string;
}

export interface ZScoreResult {
  value: number;
  z_score: number;
  mean: number;
  std_dev: number;
  reference_group: string;
  metric: string;
}

// UI types
export type ViewMode = 'table' | 'graph';

// Table row with calculated Z-score
export interface PerformanceRow {
  id: string;
  date: string;
  bodyMass: number | null;
  value: number | null;
  zScore: number | null;
  groupMean: number | null;
}

// Upload types
export interface UploadResult {
  processed: number;
  errors: UploadError[];
  athlete_id: string | null;
}

export interface UploadError {
  row: number;
  reason: string;
}
