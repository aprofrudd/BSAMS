'use client';

import { useState, useEffect } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { analysisApi, eventsApi } from '@/lib/api';
import { getMetricLabel } from './MetricSelector';
import type { ReferenceGroup, ZScoreResult } from '@/lib/types';

interface ZScoreRadarProps {
  athleteId: string;
  referenceGroup: ReferenceGroup;
}

interface RadarDataPoint {
  metric: string;
  label: string;
  zScore: number;
  fullMark: 3;
}

export function ZScoreRadar({ athleteId, referenceGroup }: ZScoreRadarProps) {
  const [data, setData] = useState<RadarDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [athleteId, referenceGroup]);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);

      // Get available metrics for the athlete
      const metrics = await analysisApi.getAvailableMetrics(athleteId);

      if (metrics.length === 0) {
        setData([]);
        return;
      }

      // For each metric, get the latest Z-score
      const zScorePromises = metrics.map((metric) =>
        analysisApi
          .getZScore(athleteId, { metric, referenceGroup })
          .then((result) => ({ metric, result }))
          .catch(() => null)
      );

      const results = await Promise.all(zScorePromises);

      const radarData: RadarDataPoint[] = results
        .filter((r): r is { metric: string; result: ZScoreResult } => r !== null)
        .map((r) => ({
          metric: r.metric,
          label: getMetricLabel(r.metric),
          zScore: r.result.z_score,
          fullMark: 3,
        }));

      setData(radarData);
    } catch (err) {
      setError('Failed to load radar data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="mt-2 text-white/60">Loading radar chart...</p>
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

  if (data.length < 3) {
    return (
      <div className="text-center py-8">
        <p className="text-white/60">
          Need at least 3 metrics for radar chart ({data.length} available)
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-white font-medium mb-4">Z-Score Profile</h3>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <span className="text-white/60">Above average (Z &gt; 1)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#33CBF4]" />
          <span className="text-white/60">Average (0 to 1)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="text-white/60">Below average (-1 to 0)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <span className="text-white/60">Well below (Z &lt; -1)</span>
        </div>
      </div>

      <div className="h-[350px] sm:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="80%">
            <PolarGrid stroke="#2D5585" />
            <PolarAngleAxis
              dataKey="label"
              tick={{ fill: '#ffffff99', fontSize: 11 }}
            />
            <PolarRadiusAxis
              domain={[-3, 3]}
              tick={{ fill: '#ffffff66', fontSize: 10 }}
              tickCount={7}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#07083D',
                border: '1px solid #2D5585',
                borderRadius: '8px',
              }}
              formatter={(value: number, name: string) => [
                `${value >= 0 ? '+' : ''}${value.toFixed(2)}`,
                'Z-Score',
              ]}
              labelStyle={{ color: '#ffffff99' }}
            />
            <Radar
              name="Z-Score"
              dataKey="zScore"
              stroke="#33CBF4"
              fill="#33CBF4"
              fillOpacity={0.25}
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const z = payload.zScore;
                let color = '#33CBF4';
                if (z >= 1) color = '#4ade80';
                else if (z >= 0) color = '#33CBF4';
                else if (z >= -1) color = '#facc15';
                else color = '#f87171';

                return (
                  <circle
                    key={payload.metric}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={color}
                    stroke={color}
                    strokeWidth={1}
                  />
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
