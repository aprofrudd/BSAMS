'use client';

import { useState, useEffect } from 'react';
import { analysisApi } from '@/lib/api';
import { getMetricLabel } from '@/lib/metricRegistry';

export { getMetricLabel };

interface MetricSelectorProps {
  athleteId: string;
  selectedMetric: string;
  onMetricChange: (metric: string) => void;
  disabled?: boolean;
  dataVersion?: number;
}

export function MetricSelector({
  athleteId,
  selectedMetric,
  onMetricChange,
  disabled = false,
  dataVersion = 0,
}: MetricSelectorProps) {
  const [metrics, setMetrics] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!athleteId) return;

    setIsLoading(true);
    analysisApi
      .getAvailableMetrics(athleteId)
      .then((data) => {
        setMetrics(data);
        // If current selection isn't available, select the first metric
        if (data.length > 0 && !data.includes(selectedMetric)) {
          onMetricChange(data[0]);
        }
      })
      .catch(() => {
        setMetrics([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [athleteId, dataVersion]);

  return (
    <select
      value={selectedMetric}
      onChange={(e) => onMetricChange(e.target.value)}
      disabled={disabled || isLoading || metrics.length === 0}
      className="select w-full"
    >
      {metrics.length === 0 ? (
        <option value="">
          {isLoading ? 'Loading...' : 'No metrics available'}
        </option>
      ) : (
        metrics.map((key) => (
          <option key={key} value={key}>
            {getMetricLabel(key)}
          </option>
        ))
      )}
    </select>
  );
}
