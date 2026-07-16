/**
 * ┌─── SUB-COMPONENT: NASMAnalyticsCharts ─────────────────────┐
 * │ PARENT: WorkoutChartsTab                                     │
 * │ PURPOSE: NASM OPT-specific Victory charts — 1RM progression, │
 * │          muscle group radar, RPE trend                        │
 * │ OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-23         │
 * │ WIREFRAME:                                                   │
 * │ ┌─ 1RM Progression ────┐ ┌─ Muscle Radar ──────┐           │
 * │ │ ╱‾╲_╱‾‾╲__╱‾‾‾╲     │ │    ╱╲                │           │
 * │ │ (multi-line chart)    │ │  ╱    ╲  ◆           │           │
 * │ └──────────────────────┘ └──────────────────────┘           │
 * │ ┌─ RPE Trend (full width) ────────────────────┐             │
 * │ │ ██▆▇████▅▇██ (area + line + zone bands)     │             │
 * │ └─────────────────────────────────────────────┘             │
 * │ Props: { data: AnalyticsData }                               │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useMemo } from 'react';
import {
  VictoryChart, VictoryAxis, VictoryLine, VictoryArea,
  VictoryTooltip, VictoryGroup, VictoryScatter, VictoryPolarAxis,
  VictoryLabel,
} from 'victory';
import type { AnalyticsData } from '../../../../../hooks/analytics/useWorkoutAnalytics';
import { sanitizeNASMChartsData } from './workoutChartsSanitizers';

// ─────────────────────────────────────────────────────────────
// SECTION: Shared Chart Config
// ─────────────────────────────────────────────────────────────

const COLORS = {
  cyan: '#60C0F0', purple: '#8B5CF6', gold: '#C6A84B',
  green: '#4caf50', coral: '#FF6B6B', text: '#E0ECF4',
  textDim: '#8BA8C8', grid: 'rgba(255,255,255,0.08)', surface: '#1A1A24',
};

const AXIS_STYLE = {
  tickLabels: { fill: COLORS.textDim, fontSize: 9, fontFamily: "'Fira Code', monospace" },
  axis: { stroke: COLORS.grid },
  grid: { stroke: COLORS.grid },
};

const TOOLTIP_STYLE = {
  style: { fill: COLORS.text, fontSize: 10, fontFamily: "'Fira Code', monospace" },
  flyoutStyle: { fill: '#0A0A0F', stroke: COLORS.cyan, strokeWidth: 0.5 },
};

// Line colors for top exercises in 1RM chart
const LINE_COLORS = [COLORS.cyan, COLORS.purple, COLORS.gold, COLORS.green, COLORS.coral];

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Container (uses CSS class to avoid import)
// ─────────────────────────────────────────────────────────────

interface ChartWrapperProps {
  title: string;
  span?: boolean;
  icon?: string;
  children: React.ReactNode;
}

const ChartWrapper: React.FC<ChartWrapperProps> = ({ title, span, icon, children }) => (
  <div style={{
    background: 'var(--bg-surface, #141419)',
    border: '1px solid rgba(96, 192, 240, 0.12)',
    borderRadius: 12,
    padding: 20,
    gridColumn: span ? '1 / -1' : undefined,
  }}>
    <h4 style={{
      color: 'var(--text-primary, #E0ECF4)',
      fontSize: '0.875rem',
      fontWeight: 600,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      margin: '0 0 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      {icon && <span>{icon}</span>}
      {title}
    </h4>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

interface Props { data: AnalyticsData; }

const NASMAnalyticsCharts: React.FC<Props> = ({ data }) => {
  const chartData = useMemo(() => sanitizeNASMChartsData(data), [data]);
  const has1RM = chartData.oneRMProgression.length > 0;
  const hasMuscle = chartData.muscleGroupVolume.length > 2;
  const hasRPE = chartData.rpeTrend.length > 1;

  // Top 5 exercises by volume for 1RM line chart
  const top1RMExercises = useMemo(() => {
    const totals = new Map<string, number>();
    for (const p of chartData.oneRMProgression) {
      totals.set(p.exercise, (totals.get(p.exercise) || 0) + p.estimated1RM);
    }
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  }, [chartData.oneRMProgression]);

  // Normalize muscle group volume for radar (0-100 scale)
  const radarData = useMemo(() => {
    const maxVol = Math.max(...chartData.muscleGroupVolume.map(m => m.volume), 1);
    return chartData.muscleGroupVolume
      .filter(m => m.group !== 'Other')
      .slice(0, 6)
      .map(m => ({ x: m.group, y: Math.round((m.volume / maxVol) * 100) }));
  }, [chartData.muscleGroupVolume]);

  if (!has1RM && !hasMuscle && !hasRPE) return null;

  return (
    <>
      {/* 1RM Progression (Brzycki) — multi-line chart */}
      {has1RM && top1RMExercises.length > 0 && (
        <ChartWrapper title="Estimated 1RM Progression (Brzycki)" span icon="🏋️">
          <VictoryChart height={240} padding={{ top: 20, bottom: 50, left: 55, right: 20 }}>
            <VictoryAxis
              tickFormat={(t: string) => {
                const d = new Date(t);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
              style={{ ...AXIS_STYLE, tickLabels: { ...AXIS_STYLE.tickLabels, angle: -30 } }}
            />
            <VictoryAxis dependentAxis
              tickFormat={(t: number) => `${t} lb`}
              style={AXIS_STYLE}
            />
            {top1RMExercises.map((exercise, i) => {
              const exerciseData = chartData.oneRMProgression
                .filter(p => p.exercise === exercise)
                .map(p => ({ x: p.date, y: p.estimated1RM }));
              if (exerciseData.length < 1) return null;
              return (
                <VictoryGroup key={exercise}>
                  <VictoryLine
                    data={exerciseData}
                    style={{ data: { stroke: LINE_COLORS[i], strokeWidth: 2 } }}
                    interpolation="monotoneX"
                  />
                  <VictoryScatter
                    data={exerciseData}
                    size={3}
                    style={{ data: { fill: LINE_COLORS[i] } }}
                    labels={({ datum }: any) => `${exercise}\n${datum.y} lbs`}
                    labelComponent={<VictoryTooltip {...TOOLTIP_STYLE} />}
                  />
                </VictoryGroup>
              );
            })}
          </VictoryChart>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingLeft: 8 }}>
            {top1RMExercises.map((name, i) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: COLORS.textDim }}>
                <div style={{ width: 12, height: 3, background: LINE_COLORS[i], borderRadius: 2 }} />
                {name.length > 20 ? name.slice(0, 18) + '…' : name}
              </div>
            ))}
          </div>
        </ChartWrapper>
      )}

      {/* Muscle Group Balance Radar */}
      {hasMuscle && radarData.length >= 3 && (
        <ChartWrapper title="Muscle Group Balance" icon="💪">
          <VictoryChart polar height={260} padding={{ top: 40, bottom: 40, left: 40, right: 40 }}>
            <VictoryPolarAxis
              style={{
                axis: { stroke: COLORS.grid },
                tickLabels: { fill: COLORS.text, fontSize: 10, fontFamily: "'Sora', sans-serif", padding: 15 },
                grid: { stroke: COLORS.grid, strokeDasharray: '4,4' },
              }}
            />
            <VictoryPolarAxis dependentAxis
              style={{
                axis: { stroke: 'transparent' },
                tickLabels: { fill: 'transparent' },
                grid: { stroke: COLORS.grid, opacity: 0.3 },
              }}
              tickFormat={() => ''}
            />
            <VictoryArea
              data={radarData}
              style={{
                data: {
                  fill: 'rgba(96, 192, 240, 0.2)',
                  stroke: COLORS.cyan,
                  strokeWidth: 2,
                },
              }}
            />
            <VictoryScatter
              data={radarData}
              size={4}
              style={{ data: { fill: COLORS.cyan } }}
              labels={({ datum }: any) => `${datum.x}: ${datum.y}%`}
              labelComponent={<VictoryTooltip {...TOOLTIP_STYLE} />}
            />
          </VictoryChart>
        </ChartWrapper>
      )}

      {/* RPE Trend with Zone Bands */}
      {hasRPE && (
        <ChartWrapper title="RPE Trend (Rate of Perceived Exertion)" icon="📊">
          <VictoryChart height={200} padding={{ top: 20, bottom: 40, left: 40, right: 20 }}>
            {/* Zone bands: Green (1-4 easy), Gold (5-7 moderate), Red (8-10 hard) */}
            <VictoryArea
              data={[{ x: 0, y: 4 }, { x: 1, y: 4 }]}
              style={{ data: { fill: 'rgba(76, 175, 80, 0.06)', stroke: 'transparent' } }}
              y0={() => 0}
            />
            <VictoryArea
              data={[{ x: 0, y: 7 }, { x: 1, y: 7 }]}
              style={{ data: { fill: 'rgba(198, 168, 75, 0.06)', stroke: 'transparent' } }}
              y0={() => 4}
            />
            <VictoryArea
              data={[{ x: 0, y: 10 }, { x: 1, y: 10 }]}
              style={{ data: { fill: 'rgba(201, 42, 84, 0.06)', stroke: 'transparent' } }}
              y0={() => 7}
            />
            <VictoryAxis
              tickFormat={(t: string) => {
                const d = new Date(t);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
              style={{ ...AXIS_STYLE, tickLabels: { ...AXIS_STYLE.tickLabels, angle: -30 } }}
            />
            <VictoryAxis dependentAxis domain={[0, 10]}
              tickValues={[2, 4, 6, 8, 10]}
              style={AXIS_STYLE}
            />
            <VictoryArea
              data={chartData.rpeTrend}
              x="date" y="avgRPE"
              style={{
                data: { fill: 'rgba(139, 92, 246, 0.15)', stroke: COLORS.purple, strokeWidth: 2 },
              }}
              interpolation="monotoneX"
            />
            <VictoryScatter
              data={chartData.rpeTrend}
              x="date" y="avgRPE"
              size={4}
              style={{ data: { fill: COLORS.purple } }}
              labels={({ datum }: any) => `RPE: ${datum.avgRPE}`}
              labelComponent={<VictoryTooltip {...TOOLTIP_STYLE} />}
            />
          </VictoryChart>
          <div style={{ display: 'flex', gap: 16, fontSize: '0.7rem', color: COLORS.textDim, paddingLeft: 8 }}>
            <span style={{ color: COLORS.green }}>● Easy (1-4)</span>
            <span style={{ color: COLORS.gold }}>● Moderate (5-7)</span>
            <span style={{ color: '#C92A54' }}>● Hard (8-10)</span>
          </div>
        </ChartWrapper>
      )}
    </>
  );
};

export default React.memo(NASMAnalyticsCharts);
