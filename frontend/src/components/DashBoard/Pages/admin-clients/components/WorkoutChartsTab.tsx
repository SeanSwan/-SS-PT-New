/**
 * ┌─── SUB-COMPONENT: WorkoutChartsTab ────────────────────────┐
 * │ PARENT: EnhancedWorkoutsModal                               │
 * │ PURPOSE: Premium Victory charts + NASM OPT analytics        │
 * │ OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-23        │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────┐                    │
 * │ │ ┌─ Weekly Volume Bar ─────(span)──┐  │                    │
 * │ │ │ ████ ██████ ███ ████████        │  │                    │
 * │ │ └────────────────────────────────┘  │                    │
 * │ │ ┌─ Top Exercises ─┐ ┌─ Intensity ┐  │                    │
 * │ │ │ ▌▌▌▌▌▌▌▌▌       │ │ ╱‾╲__╱‾╲   │  │                    │
 * │ │ └────────────────┘ └────────────┘  │                    │
 * │ │ ┌─ 1RM Progression ─(span)──────┐  │                    │
 * │ │ │ Multi-line Brzycki chart       │  │                    │
 * │ │ └──────────────────────────────┘  │                    │
 * │ │ ┌─ Muscle Radar ─┐ ┌─ RPE Trend ┐  │                    │
 * │ │ │ Polar area      │ │ Area+zones │  │                    │
 * │ │ └────────────────┘ └────────────┘  │                    │
 * │ │ ┌─ Workout Calendar Heatmap ─────┐  │                    │
 * │ │ │ ░░█░░░█░░█░░░░░░█░░░░░█░░     │  │                    │
 * │ │ └────────────────────────────────┘  │                    │
 * │ └──────────────────────────────────────┘                    │
 * │ Props: { data: AnalyticsData }                              │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { lazy, Suspense } from 'react';
import styled from 'styled-components';
import {
  VictoryBar, VictoryChart, VictoryAxis,
  VictoryTooltip, VictoryArea,
} from 'victory';
import type { AnalyticsData } from '../../../../../hooks/analytics/useWorkoutAnalytics';

const NASMAnalyticsCharts = lazy(() => import('./NASMAnalyticsCharts'));

// ─────────────────────────────────────────────────────────────
// SECTION: Crystalline Swan Chart Theme
// ─────────────────────────────────────────────────────────────

const C = {
  cyan: '#60C0F0', purple: '#8B5CF6', gold: '#C6A84B',
  text: '#E0ECF4', textDim: '#8BA8C8', grid: 'rgba(255,255,255,0.08)',
};

const AXIS = {
  tickLabels: { fill: C.textDim, fontSize: 9, fontFamily: "'Fira Code', monospace" },
  axis: { stroke: C.grid },
  grid: { stroke: C.grid },
};

const TIP = {
  style: { fill: C.text, fontSize: 10, fontFamily: "'Fira Code', monospace" },
  flyoutStyle: { fill: '#0A0A0F', stroke: C.cyan, strokeWidth: 0.5 },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components (Crystalline Swan Dark)
// ─────────────────────────────────────────────────────────────

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  @media (min-width: 768px) { grid-template-columns: 1fr 1fr; }
`;

const ChartCard = styled.div<{ $span?: boolean }>`
  background: var(--bg-surface, #141419);
  border: 1px solid rgba(96, 192, 240, 0.12);
  border-radius: 12px;
  padding: 20px;
  ${p => p.$span ? 'grid-column: 1 / -1;' : ''}
`;

const ChartTitle = styled.h4`
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;
  font-weight: 600;
  font-family: 'Plus Jakarta Sans', sans-serif;
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const EmptyChart = styled.div`
  text-align: center;
  padding: 48px;
  color: var(--text-secondary, #8BA8C8);
  font-size: 0.875rem;
  font-family: 'Sora', sans-serif;
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, 16px);
  gap: 4px;
  padding: 8px 0;
`;

const CalendarCell = styled.div<{ $intensity: number }>`
  width: 16px;
  height: 16px;
  border-radius: 3px;
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease;
  background: ${p => {
    if (p.$intensity === 0) return 'var(--bg-surface, #1A1A24)';
    if (p.$intensity === 1) return '#002060';
    if (p.$intensity === 2) return '#4070C0';
    return '#60C0F0';
  }};
  ${p => p.$intensity >= 3 ? 'box-shadow: 0 0 6px #60C0F0;' : ''}
  &:hover { transform: scale(1.2); z-index: 5; }
  &:hover::before {
    content: attr(data-tooltip);
    position: absolute; bottom: calc(100% + 8px); left: 50%;
    transform: translateX(-50%);
    background: #0A0A0F; color: #E0ECF4;
    padding: 6px 10px; border-radius: 4px;
    border: 1px solid #4070C0; font-size: 0.75rem;
    font-family: 'Fira Code', monospace;
    white-space: nowrap; z-index: 10; pointer-events: none;
  }
  &:hover::after {
    content: ''; position: absolute; bottom: 100%; left: 50%;
    transform: translateX(-50%); border: 4px solid transparent;
    border-top-color: #4070C0; pointer-events: none; z-index: 10;
  }
  @media (prefers-reduced-motion: reduce) {
    &:hover { transform: none; }
    box-shadow: none;
    ${p => p.$intensity >= 3 ? 'border: 1px solid #60C0F0;' : ''}
  }
`;

const Legend = styled.div`
  display: flex; gap: 16px; margin-top: 16px;
  font-size: 0.75rem; color: var(--text-secondary, #8BA8C8);
  font-family: 'Sora', sans-serif;
`;

const LegendItem = styled.div`
  display: flex; align-items: center; gap: 6px;
`;

const Swatch = styled.div<{ $color: string; $glow?: boolean }>`
  width: 14px; height: 14px; border-radius: 3px;
  background: ${p => p.$color};
  ${p => p.$glow ? `box-shadow: 0 0 4px ${p.$color};` : ''}
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

interface Props { data: AnalyticsData; }

const WorkoutChartsTab: React.FC<Props> = ({ data }) => {
  const hasVolume = data.weeklyVolume.length > 0;
  const hasFrequency = data.exerciseFrequency.length > 0;
  const hasIntensity = data.intensityTrend.length > 1;
  const hasCalendar = data.workoutCalendar.length > 0;
  const hasAny = hasVolume || hasFrequency || hasIntensity || hasCalendar
    || data.oneRMProgression.length > 0 || data.muscleGroupVolume.length > 2;

  const calendarCells = React.useMemo(() => {
    const cells: { date: string; count: number }[] = [];
    const today = new Date();
    const calMap = new Map(data.workoutCalendar.map(c => [c.date, c.count]));
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      cells.push({ date: key, count: calMap.get(key) || 0 });
    }
    return cells;
  }, [data.workoutCalendar]);

  if (!hasAny) {
    return <EmptyChart>No workout data available for charts. Log some workouts first!</EmptyChart>;
  }

  return (
    <ChartsGrid>
      {/* Weekly Volume Bar Chart */}
      {hasVolume && (
        <ChartCard $span>
          <ChartTitle>📈 Weekly Training Volume</ChartTitle>
          <VictoryChart height={220} padding={{ top: 20, bottom: 40, left: 60, right: 20 }} domainPadding={{ x: 15 }}>
            <VictoryAxis
              tickFormat={(t: string) => { const p = t.split('-W'); return p.length === 2 ? `W${p[1]}` : t; }}
              style={{ ...AXIS, grid: { stroke: 'transparent' } }}
            />
            <VictoryAxis dependentAxis
              tickFormat={(t: number) => t >= 1000 ? `${(t / 1000).toFixed(0)}k` : String(t)}
              style={AXIS}
            />
            <VictoryBar
              data={data.weeklyVolume.slice(-12)} x="week" y="volume"
              style={{ data: { fill: C.cyan, fillOpacity: 0.85, width: 18 } }}
              labels={({ datum }: any) => `${Math.round(datum.volume).toLocaleString()} lbs`}
              labelComponent={<VictoryTooltip {...TIP} />}
            />
          </VictoryChart>
        </ChartCard>
      )}

      {/* Exercise Frequency (Horizontal Bar) */}
      {hasFrequency && (
        <ChartCard>
          <ChartTitle>🎯 Top Exercises</ChartTitle>
          <VictoryChart
            horizontal height={Math.max(180, data.exerciseFrequency.slice(0, 8).length * 28)}
            padding={{ top: 10, bottom: 30, left: 120, right: 30 }} domainPadding={{ y: 10 }}
          >
            <VictoryAxis style={{ ...AXIS, axis: { stroke: 'transparent' } }} />
            <VictoryAxis dependentAxis style={AXIS} />
            <VictoryBar
              data={data.exerciseFrequency.slice(0, 8).reverse()} x="name" y="count"
              style={{ data: { fill: C.purple, fillOpacity: 0.85 } }}
              barWidth={14}
              labels={({ datum }: any) => `${datum.count}x`}
              labelComponent={<VictoryTooltip {...TIP} />}
            />
          </VictoryChart>
        </ChartCard>
      )}

      {/* Intensity Trend */}
      {hasIntensity && (
        <ChartCard>
          <ChartTitle>🔥 Intensity Trend</ChartTitle>
          <VictoryChart height={200} padding={{ top: 20, bottom: 40, left: 40, right: 20 }}>
            <VictoryAxis
              tickFormat={(t: string) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; }}
              style={{ ...AXIS, tickLabels: { ...AXIS.tickLabels, angle: -30 } }}
            />
            <VictoryAxis dependentAxis domain={[0, 10]} style={AXIS} />
            <VictoryArea
              data={data.intensityTrend} x="date" y="intensity"
              style={{ data: { fill: 'rgba(96, 192, 240, 0.15)', stroke: C.cyan, strokeWidth: 2 } }}
              interpolation="monotoneX"
            />
          </VictoryChart>
        </ChartCard>
      )}

      {/* NASM-Specific Charts (1RM, Muscle Radar, RPE) */}
      <Suspense fallback={null}>
        <NASMAnalyticsCharts data={data} />
      </Suspense>

      {/* Workout Calendar Heatmap */}
      {hasCalendar && (
        <ChartCard $span>
          <ChartTitle>📅 Workout Calendar (Last 90 Days)</ChartTitle>
          <CalendarGrid role="img" aria-label="Workout calendar heatmap showing last 90 days">
            {calendarCells.map((cell) => (
              <CalendarCell
                key={cell.date}
                $intensity={Math.min(cell.count, 3)}
                data-tooltip={`${cell.date}: ${cell.count} workout${cell.count !== 1 ? 's' : ''}`}
                aria-label={`${cell.date}: ${cell.count} workout${cell.count !== 1 ? 's' : ''}`}
              />
            ))}
          </CalendarGrid>
          <Legend>
            <LegendItem><Swatch $color="var(--bg-surface, #1A1A24)" /> None</LegendItem>
            <LegendItem><Swatch $color="#002060" /> 1</LegendItem>
            <LegendItem><Swatch $color="#4070C0" /> 2</LegendItem>
            <LegendItem><Swatch $color="#60C0F0" $glow /> 3+</LegendItem>
          </Legend>
        </ChartCard>
      )}
    </ChartsGrid>
  );
};

export default WorkoutChartsTab;
