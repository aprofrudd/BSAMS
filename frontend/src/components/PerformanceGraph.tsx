'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
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
import type { ReferenceGroup, Benchmarks } from '@/lib/types';

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

type DatePreset = '3M' | '6M' | '1Y' | 'All';

export function PerformanceGraph({
  athleteId,
  referenceGroup,
  metric,
}: PerformanceGraphProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [benchmarks, setBenchmarks] = useState<Benchmarks | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date filter state
  const [datePreset, setDatePreset] = useState<DatePreset>('All');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [excludedDates, setExcludedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [athleteId, referenceGroup, metric]);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);

      const [events, benchmarkData] = await Promise.all([
        eventsApi.listForAthlete(athleteId),
        analysisApi.getBenchmarks({
          metric,
          referenceGroup,
        }).catch(() => null),
      ]);

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

  // Client-side date filtering
  const filteredData = useMemo(() => {
    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    if (customFrom || customTo) {
      // Custom range takes priority
      if (customFrom) fromDate = new Date(customFrom);
      if (customTo) {
        toDate = new Date(customTo);
        toDate.setHours(23, 59, 59, 999);
      }
    } else if (datePreset !== 'All') {
      const now = new Date();
      toDate = now;
      fromDate = new Date(now);
      if (datePreset === '3M') fromDate.setMonth(fromDate.getMonth() - 3);
      else if (datePreset === '6M') fromDate.setMonth(fromDate.getMonth() - 6);
      else if (datePreset === '1Y') fromDate.setFullYear(fromDate.getFullYear() - 1);
    }

    if (!fromDate && !toDate) return data;

    return data.filter((d) => {
      const t = new Date(d.date).getTime();
      if (fromDate && t < fromDate.getTime()) return false;
      if (toDate && t > toDate.getTime()) return false;
      return true;
    });
  }, [data, datePreset, customFrom, customTo]);

  // Filter out manually excluded dates
  const visibleData = useMemo(
    () => filteredData.filter((d) => !excludedDates.has(d.date)),
    [filteredData, excludedDates]
  );

  // Reset excluded dates when filtered data changes
  useEffect(() => {
    setExcludedDates(new Set());
  }, [data, datePreset, customFrom, customTo]);

  function toggleDate(date: string) {
    setExcludedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  function handlePreset(preset: DatePreset) {
    setDatePreset(preset);
    setCustomFrom('');
    setCustomTo('');
  }

  function handleCustomFrom(value: string) {
    setCustomFrom(value);
    setDatePreset('All');
  }

  function handleCustomTo(value: string) {
    setCustomTo(value);
    setDatePreset('All');
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

  // Calculate Y-axis domain including benchmark band
  const values = visibleData.map((d) => d.value).filter((v): v is number => v !== null);
  let minValue = values.length > 0 ? Math.min(...values) : 0;
  let maxValue = values.length > 0 ? Math.max(...values) : 100;

  // Extend domain to include benchmark band
  if (benchmarks && benchmarks.mean !== null && benchmarks.std_dev !== null) {
    const bandLow = benchmarks.mean - benchmarks.std_dev;
    const bandHigh = benchmarks.mean + benchmarks.std_dev;
    minValue = Math.min(minValue, bandLow);
    maxValue = Math.max(maxValue, bandHigh);
  }

  const padding = (maxValue - minValue) * 0.1 || 5;
  const yMin = Math.floor(minValue - padding);
  const yMax = Math.ceil(maxValue + padding);

  // Compute explicit 5-unit tick intervals
  const yTicks: number[] = [];
  for (let t = Math.floor(yMin / 5) * 5; t <= yMax; t += 5) {
    yTicks.push(t);
  }

  const hasBenchmarkBand = benchmarks && benchmarks.mean !== null && benchmarks.std_dev !== null;
  const bandLow = hasBenchmarkBand ? benchmarks.mean! - benchmarks.std_dev! : 0;
  const bandHigh = hasBenchmarkBand ? benchmarks.mean! + benchmarks.std_dev! : 0;

  const presets: DatePreset[] = ['3M', '6M', '1Y', 'All'];

  return (
    <div>
      {/* Date Filter Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Preset buttons */}
        <div className="flex gap-1">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => handlePreset(p)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                datePreset === p && !customFrom && !customTo
                  ? 'bg-accent text-[#090A3D]'
                  : 'bg-[#2D5585]/30 text-white/60 hover:bg-[#2D5585]/50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        <div className="flex items-center gap-2 text-xs">
          <label className="text-white/40">From</label>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => handleCustomFrom(e.target.value)}
            className="bg-[#07083D] border border-[#2D5585] rounded px-2 py-1 text-white/80 text-xs"
          />
          <label className="text-white/40">To</label>
          <input
            type="date"
            value={customTo}
            onChange={(e) => handleCustomTo(e.target.value)}
            className="bg-[#07083D] border border-[#2D5585] rounded px-2 py-1 text-white/80 text-xs"
          />
        </div>
      </div>

      {/* Entry Toggle Pills */}
      {filteredData.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-white/40">Entries:</span>
            <button
              onClick={() => setExcludedDates(new Set())}
              className="text-xs text-accent hover:text-accent/80 underline"
            >
              All
            </button>
            <button
              onClick={() => setExcludedDates(new Set(filteredData.map((d) => d.date)))}
              className="text-xs text-accent hover:text-accent/80 underline"
            >
              None
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-[72px] overflow-y-auto">
            {filteredData.map((d) => {
              const checked = !excludedDates.has(d.date);
              return (
                <button
                  key={d.date}
                  onClick={() => toggleDate(d.date)}
                  className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border transition-colors ${
                    checked
                      ? 'border-accent bg-accent/20 text-white'
                      : 'border-[#2D5585] bg-transparent text-white/40'
                  }`}
                >
                  <span className={`inline-block w-2.5 h-2.5 rounded-sm border ${
                    checked ? 'bg-accent border-accent' : 'border-white/30'
                  }`} />
                  {d.dateFormatted}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Benchmark Legend */}
      {benchmarks && benchmarks.mean !== null && (
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-white/60" style={{ borderTop: '2px dashed rgba(255,255,255,0.6)' }} />
            <span className="text-white/60">
              Mean: {benchmarks.mean.toFixed(1)}
            </span>
          </div>
          {hasBenchmarkBand && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-[#2D5585]/30" />
              <span className="text-white/60">
                ±1 SD: {bandLow.toFixed(1)} – {bandHigh.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      {visibleData.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-white/60">No data in selected date range</p>
        </div>
      ) : (
        <div className="h-[300px] sm:h-[350px] md:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={visibleData}
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
                ticks={yTicks}
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

              {/* Mean ± SD band */}
              {hasBenchmarkBand && (
                <ReferenceArea
                  y1={bandLow}
                  y2={bandHigh}
                  fill="#2D5585"
                  fillOpacity={0.3}
                />
              )}
              {benchmarks && benchmarks.mean !== null && (
                <ReferenceLine
                  y={benchmarks.mean}
                  stroke="#ffffff99"
                  strokeDasharray="5 5"
                  label={{
                    value: 'Mean',
                    position: 'insideTopRight',
                    fill: '#ffffff99',
                    fontSize: 11,
                  }}
                />
              )}

              {/* Data bars */}
              <Bar
                dataKey="value"
                fill="#33CBF4"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}
