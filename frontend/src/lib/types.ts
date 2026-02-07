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

// Benchmark source types
export type BenchmarkSource = 'own' | 'boxing_science' | 'shared_pool';

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

// Training Session types
export interface TrainingSession {
  id: string;
  athlete_id: string;
  session_date: string;
  training_type: string;
  duration_minutes: number;
  rpe: number;
  srpe: number;
  notes: string | null;
  metrics: Record<string, string | number | undefined>;
  created_at: string;
  updated_at: string;
}

export interface TrainingSessionCreate {
  athlete_id: string;
  session_date: string;
  training_type: string;
  duration_minutes: number;
  rpe: number;
  notes?: string;
  metrics?: Record<string, string | number | undefined>;
}

export interface TrainingSessionUpdate {
  session_date?: string;
  training_type?: string;
  duration_minutes?: number;
  rpe?: number;
  notes?: string;
  metrics?: Record<string, string | number | undefined>;
}

// Exercise Prescription types
export interface ExercisePrescription {
  id: string;
  session_id: string;
  exercise_name: string;
  exercise_category: string | null;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  tempo: string | null;
  rest_seconds: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExercisePrescriptionCreate {
  exercise_name: string;
  exercise_category?: string;
  set_number: number;
  reps?: number;
  weight_kg?: number;
  tempo?: string;
  rest_seconds?: number;
  duration_seconds?: number;
  distance_meters?: number;
  notes?: string;
}

export interface ExercisePrescriptionUpdate {
  exercise_name?: string;
  exercise_category?: string;
  set_number?: number;
  reps?: number;
  weight_kg?: number;
  tempo?: string;
  rest_seconds?: number;
  duration_seconds?: number;
  distance_meters?: number;
  notes?: string;
}

// Training Load Analysis types
export interface DailyLoadData {
  date: string;
  total_srpe: number;
  session_count: number;
}

export interface TrainingLoadAnalysis {
  daily_loads: DailyLoadData[];
  weekly_load: number | null;
  monotony: number | null;
  strain: number | null;
  acwr: number | null;
  acute_load: number | null;
  chronic_load: number | null;
}

// Wellness types
export interface WellnessEntry {
  id: string;
  athlete_id: string;
  entry_date: string;
  sleep_quality: number;
  fatigue: number;
  soreness: number;
  stress: number;
  mood: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WellnessEntryCreate {
  athlete_id: string;
  entry_date: string;
  sleep_quality: number;
  fatigue: number;
  soreness: number;
  stress: number;
  mood: number;
  notes?: string;
}

export interface WellnessEntryUpdate {
  entry_date?: string;
  sleep_quality?: number;
  fatigue?: number;
  soreness?: number;
  stress?: number;
  mood?: number;
  notes?: string;
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
