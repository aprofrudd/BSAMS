'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { eventsApi, analysisApi } from '@/lib/api';
import { getMetricLabel } from './MetricSelector';
import type { PerformanceEvent, ReferenceGroup, Benchmarks } from '@/lib/types';

interface PerformanceGraphProps {
  athleteId: string;
  referenceGroup: ReferenceGroup;
  metric: string;
}

interface ChartDataPoint {
  date: string;
  dateFormatted: string;
  value: number | null;
}

export function PerformanceGraph({
  athleteId,
  referenceGroup,
  metric,
}: PerformanceGraphProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [benchmarks, setBenchmarks] = useState<Benchmarks | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [athleteId, referenceGroup, metric]);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch events and benchmarks in parallel
      const [events, benchmarkData] = await Promise.all([
        eventsApi.listForAthlete(athleteId),
        analysisApi.getBenchmarks({
          metric,
          referenceGroup,
        }).catch(() => null),
      ]);

      // Transform events to chart data
      const chartData: ChartDataPoint[] = events
        .map((event) => ({
          date: event.event_date,
          dateFormatted: formatDate(event.event_date),
          value: event.metrics[metric] != null ? Number(event.metrics[metric]) : null,
        }))
        .filter((d) => d.value !== null)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setData(chartData);
      setBenchmarks(benchmarkData);
    } catch (err) {
      setError('Failed to load graph data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const label = getMetricLabel(metric);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="mt-2 text-white/60">Loading graph...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">{error}</p>
        <button onClick={loadData} className="btn-secondary mt-4">
          Retry
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-white/60">No data for {label}</p>
      </div>
    );
  }

  // Calculate Y-axis domain with padding
  const values = data.map((d) => d.value).filter((v): v is number => v !== null);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = (maxValue - minValue) * 0.1 || 5;
  const yMin = Math.floor(minValue - padding);
  const yMax = Math.ceil(maxValue + padding);

  return (
    <div>
      {/* Benchmark Legend */}
      {benchmarks && benchmarks.mean !== null && (
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-white/60" />
            <span className="text-white/60">
              Mean: {benchmarks.mean.toFixed(1)}
            </span>
          </div>
          {benchmarks.ci_lower !== null && benchmarks.ci_upper !== null && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-secondary-muted/30" />
              <span className="text-white/60">
                95% CI: {benchmarks.ci_lower.toFixed(1)} - {benchmarks.ci_upper.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="h-[300px] sm:h-[350px] md:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2D5585" opacity={0.5} />
            <XAxis
              dataKey="dateFormatted"
              stroke="#ffffff99"
              tick={{ fill: '#ffffff99', fontSize: 12 }}
              tickLine={{ stroke: '#ffffff99' }}
            />
            <YAxis
              domain={[yMin, yMax]}
              stroke="#ffffff99"
              tick={{ fill: '#ffffff99', fontSize: 12 }}
              tickLine={{ stroke: '#ffffff99' }}
              label={{
                value: label,
                angle: -90,
                position: 'insideLeft',
                fill: '#ffffff99',
                fontSize: 12,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#07083D',
                border: '1px solid #2D5585',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#ffffff99' }}
              itemStyle={{ color: '#33CBF4' }}
              formatter={(value: number) => [`${value.toFixed(2)}`, label]}
            />

            {/* Benchmark overlays */}
            {benchmarks && benchmarks.ci_lower !== null && benchmarks.ci_upper !== null && (
              <ReferenceArea
                y1={benchmarks.ci_lower}
                y2={benchmarks.ci_upper}
                fill="#2D5585"
                fillOpacity={0.3}
              />
            )}
            {benchmarks && benchmarks.mean !== null && (
              <ReferenceLine
                y={benchmarks.mean}
                stroke="#ffffff99"
                strokeDasharray="5 5"
              />
            )}

            {/* Data line */}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#33CBF4"
              strokeWidth={2}
              dot={{ fill: '#33CBF4', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: '#33CBF4' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
}
