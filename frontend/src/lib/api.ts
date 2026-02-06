import type {
  Athlete,
  AthleteCreate,
  AthleteUpdate,
  BenchmarkSource,
  PerformanceEvent,
  PerformanceEventCreate,
  PerformanceEventUpdate,
  Benchmarks,
  ZScoreResult,
  ReferenceGroup,
  UploadResult,
} from './types';

const API_BASE = '/api/v1';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(response.status, error.detail || 'Request failed');
  }

  return response.json();
}

// Auth API
export interface AuthResponse {
  access_token: string;
  user_id: string;
  email: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    fetchApi<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signup: (email: string, password: string) =>
    fetchApi<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    fetchApi<void>('/auth/logout', { method: 'POST' }),

  me: () =>
    fetchApi<{ user_id: string; role: string }>('/auth/me'),
};

// Athletes API
export const athletesApi = {
  list: () => fetchApi<Athlete[]>('/athletes/?limit=200'),

  get: (id: string) => fetchApi<Athlete>(`/athletes/${id}`),

  create: (data: AthleteCreate) =>
    fetchApi<Athlete>('/athletes/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: AthleteUpdate) =>
    fetchApi<Athlete>(`/athletes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/athletes/${id}`, { method: 'DELETE' }),

  deleteAll: () =>
    fetchApi<{ deleted_athletes: number; deleted_events: number }>('/athletes/', {
      method: 'DELETE',
    }),

  merge: (keepId: string, mergeId: string) =>
    fetchApi<{ kept_athlete_id: string; merged_events: number; deleted_athlete_id: string }>(
      '/athletes/merge',
      { method: 'POST', body: JSON.stringify({ keep_id: keepId, merge_id: mergeId }) }
    ),
};

// Events API
export const eventsApi = {
  listForAthlete: (
    athleteId: string,
    options?: { startDate?: string; endDate?: string }
  ) => {
    const params = new URLSearchParams();
    if (options?.startDate) params.set('start_date', options.startDate);
    if (options?.endDate) params.set('end_date', options.endDate);
    const query = params.toString();
    return fetchApi<PerformanceEvent[]>(
      `/events/athlete/${athleteId}${query ? `?${query}` : ''}`
    );
  },

  get: (id: string) => fetchApi<PerformanceEvent>(`/events/${id}`),

  create: (data: PerformanceEventCreate) =>
    fetchApi<PerformanceEvent>('/events/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: PerformanceEventUpdate) =>
    fetchApi<PerformanceEvent>(`/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/events/${id}`, { method: 'DELETE' }),
};

// Analysis API
export const analysisApi = {
  getBenchmarks: (params: {
    metric: string;
    referenceGroup: ReferenceGroup;
    gender?: 'male' | 'female';
    massBand?: string;
    benchmarkSource?: BenchmarkSource;
  }) => {
    const searchParams = new URLSearchParams({
      metric: params.metric,
      reference_group: params.referenceGroup,
    });
    if (params.gender) searchParams.set('gender', params.gender);
    if (params.massBand) searchParams.set('mass_band', params.massBand);
    if (params.benchmarkSource) searchParams.set('benchmark_source', params.benchmarkSource);

    return fetchApi<Benchmarks>(`/analysis/benchmarks?${searchParams}`);
  },

  getZScore: (
    athleteId: string,
    params: {
      metric: string;
      referenceGroup: ReferenceGroup;
      eventId?: string;
      benchmarkSource?: BenchmarkSource;
    }
  ) => {
    const searchParams = new URLSearchParams({
      metric: params.metric,
      reference_group: params.referenceGroup,
    });
    if (params.eventId) searchParams.set('event_id', params.eventId);
    if (params.benchmarkSource) searchParams.set('benchmark_source', params.benchmarkSource);

    return fetchApi<ZScoreResult>(
      `/analysis/athlete/${athleteId}/zscore?${searchParams}`
    );
  },

  getZScoresBulk: (
    athleteId: string,
    params: {
      metric: string;
      referenceGroup: ReferenceGroup;
      benchmarkSource?: BenchmarkSource;
    }
  ) => {
    const searchParams = new URLSearchParams({
      metric: params.metric,
      reference_group: params.referenceGroup,
    });
    if (params.benchmarkSource) searchParams.set('benchmark_source', params.benchmarkSource);

    return fetchApi<Record<string, ZScoreResult>>(
      `/analysis/athlete/${athleteId}/zscores?${searchParams}`
    );
  },

  getAvailableMetrics: (athleteId: string) =>
    fetchApi<string[]>(`/analysis/athlete/${athleteId}/metrics`),
};

// Upload API
export const uploadApi = {
  uploadCsv: async (file: File, athleteId?: string): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const url = athleteId
      ? `${API_BASE}/uploads/csv?athlete_id=${athleteId}`
      : `${API_BASE}/uploads/csv`;

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new ApiError(response.status, error.detail);
    }

    return response.json();
  },

  previewCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/uploads/csv/preview`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Preview failed' }));
      throw new ApiError(response.status, error.detail);
    }

    return response.json();
  },
};

// Admin API
export interface AnonymisedAthlete {
  id: string;
  anonymous_name: string;
  gender: string;
  coach_id: string;
}

export interface SharedEvent {
  id: string;
  athlete_id: string;
  event_date: string;
  metrics: Record<string, string | number | undefined>;
}

export const adminApi = {
  listSharedAthletes: (skip = 0, limit = 50) =>
    fetchApi<AnonymisedAthlete[]>(`/admin/shared-athletes?skip=${skip}&limit=${limit}`),

  getSharedEvents: (athleteId: string, skip = 0, limit = 50) =>
    fetchApi<SharedEvent[]>(`/admin/shared-athletes/${athleteId}/events?skip=${skip}&limit=${limit}`),
};

// Consent API
export interface ConsentResponse {
  data_sharing_enabled: boolean;
  consented_at: string | null;
  revoked_at: string | null;
  info_text: string;
}

export const consentApi = {
  get: () => fetchApi<ConsentResponse>('/consent/'),

  update: (dataSharingEnabled: boolean) =>
    fetchApi<ConsentResponse>('/consent/', {
      method: 'PUT',
      body: JSON.stringify({ data_sharing_enabled: dataSharingEnabled }),
    }),
};

export { ApiError };
