import type {
  Athlete,
  AthleteCreate,
  PerformanceEvent,
  PerformanceEventCreate,
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

// Athletes API
export const athletesApi = {
  list: () => fetchApi<Athlete[]>('/athletes/'),

  get: (id: string) => fetchApi<Athlete>(`/athletes/${id}`),

  create: (data: AthleteCreate) =>
    fetchApi<Athlete>('/athletes/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/athletes/${id}`, { method: 'DELETE' }),
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
  }) => {
    const searchParams = new URLSearchParams({
      metric: params.metric,
      reference_group: params.referenceGroup,
    });
    if (params.gender) searchParams.set('gender', params.gender);
    if (params.massBand) searchParams.set('mass_band', params.massBand);

    return fetchApi<Benchmarks>(`/analysis/benchmarks?${searchParams}`);
  },

  getZScore: (
    athleteId: string,
    params: {
      metric: string;
      referenceGroup: ReferenceGroup;
      eventId?: string;
    }
  ) => {
    const searchParams = new URLSearchParams({
      metric: params.metric,
      reference_group: params.referenceGroup,
    });
    if (params.eventId) searchParams.set('event_id', params.eventId);

    return fetchApi<ZScoreResult>(
      `/analysis/athlete/${athleteId}/zscore?${searchParams}`
    );
  },
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
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Preview failed' }));
      throw new ApiError(response.status, error.detail);
    }

    return response.json();
  },
};

export { ApiError };
