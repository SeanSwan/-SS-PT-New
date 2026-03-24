/**
 * ┌─── SUB-COMPONENT: WorkoutChartsTab ────────────────────────┐
 * │ PARENT: EnhancedWorkoutsModal                               │
 * │ PURPOSE: Victory charts powered by real workout analytics   │
 * │ OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-23        │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────┐                        │
 * │ │ ┌─ Weekly Volume Bar ──────────┐ │                        │
 * │ │ │ ████ ██████ ███ ████████     │ │                        │
 * │ │ └─────────────────────────────┘ │                        │
 * │ │ ┌─ Exercise Freq ─┐ ┌─ Intens ┐│                        │
 * │ │ │ Horiz bars      │ │ Line    ││                        │
 * │ │ └────────────────┘ └─────────┘│                        │
 * │ │ ┌─ Workout Calendar Heatmap ──┐│                        │
 * │ │ │ ░░█░░░█░░█░░░░░░█░░░░░█░░  ││                        │
 * │ │ └─────────────────────────────┘│                        │
 * │ └──────────────────────────────────┘                        │
 * │ Props: { data: AnalyticsData }                              │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import styled from 'styled-components';
import {
  VictoryBar, VictoryChart, VictoryAxis, VictoryLine,
  VictoryTheme, VictoryTooltip, VictoryArea,
} from 'victory';
import type { AnalyticsData } from '../../../../../hooks/analytics/useWorkoutAnalytics';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const ChartCard = styled.div<{ $span?: boolean }>`
  background: var(--bg-surface, rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 16px;
  ${p => p.$span ? 'grid-column: 1 / -1;' : ''}
`;

const ChartTitle = styled.h4`
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const EmptyChart = styled.div`
  text-align: center;
  padding: 32px;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.8125rem;
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, 16px);
  gap: 4px;
  padding: 4px 0;
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
  ${p => p.$intensity >= 3 ? 'box-shadow: 0 0 4px #60C0F0;' : ''}

  &:hover {
    transform: scale(1.2);
    z-index: 5;
  }

  /* CSS tooltip */
  &:hover::before {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-base, #0A0A0F);
    color: var(--text-primary, #E0ECF4);
    padding: 6px 10px;
    border-radius: 4px;
    border: 1px solid #4070C0;
    font-size: 0.75rem;
    white-space: nowrap;
    z-index: 10;
    pointer-events: none;
  }
  &:hover::after {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: #4070C0;
    pointer-events: none;
    z-index: 10;
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover { transform: none; }
    box-shadow: none;
    ${p => p.$intensity >= 3 ? 'border: 1px solid #60C0F0;' : ''}
  }
`;

const HeatmapLegend = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 12px;
  font-size: 0.75rem;
  color: var(--text-secondary, #8BA8C8);
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const LegendSwatch = styled.div<{ $color: string }>`
  width: 14px;
  height: 14px;
  background: ${p => p.$color};
  border-radius: 3px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Chart Theme (Crystalline Swan Dark)
// ─────────────────────────────────────────────────────────────

const chartColors = {
  cyan: '#60C0F0',
  purple: '#8B5CF6',
  gold: '#C6A84B',
  green: '#4caf50',
  text: '#94a3b8',
  gridLine: 'rgba(255,255,255,0.06)',
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

interface Props {
  data: AnalyticsData;
}

const WorkoutChartsTab: React.FC<Props> = ({ data }) => {
  const hasVolume = data.weeklyVolume.length > 0;
  const hasFrequency = data.exerciseFrequency.length > 0;
  const hasIntensity = data.intensityTrend.length > 1;
  const hasCalendar = data.workoutCalendar.length > 0;

  if (!hasVolume && !hasFrequency && !hasIntensity && !hasCalendar) {
    return <EmptyChart>No workout data available for charts. Log some workouts first!</EmptyChart>;
  }

  // Build calendar heatmap (last 90 days)
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

  return (
    <ChartsGrid>
      {/* Weekly Volume Bar Chart */}
      {hasVolume && (
        <ChartCard $span>
          <ChartTitle>Weekly Training Volume (lbs)</ChartTitle>
          <VictoryChart
            height={220}
            padding={{ top: 20, bottom: 40, left: 60, right: 20 }}
            domainPadding={{ x: 15 }}
          >
            <VictoryAxis
              tickFormat={(t: string) => {
                const parts = t.split('-W');
                return parts.length === 2 ? `W${parts[1]}` : t;
              }}
              style={{
                tickLabels: { fill: chartColors.text, fontSize: 9 },
                axis: { stroke: chartColors.gridLine },
                grid: { stroke: 'transparent' },
              }}
            />
            <VictoryAxis
              dependentAxis
              tickFormat={(t: number) => t >= 1000 ? `${(t / 1000).toFixed(0)}k` : String(t)}
              style={{
                tickLabels: { fill: chartColors.text, fontSize: 9 },
                axis: { stroke: chartColors.gridLine },
                grid: { stroke: chartColors.gridLine },
              }}
            />
            <VictoryBar
              data={data.weeklyVolume.slice(-12)}
              x="week"
              y="volume"
              style={{
                data: {
                  fill: chartColors.cyan,
                  fillOpacity: 0.8,
                  width: 16,
                },
              }}
              labels={({ datum }: any) => `${Math.round(datum.volume).toLocaleString()} lbs`}
              labelComponent={<VictoryTooltip style={{ fill: '#E0ECF4', fontSize: 10 }} flyoutStyle={{ fill: '#1A1A24', stroke: '#60C0F0', strokeWidth: 0.5 }} />}
            />
          </VictoryChart>
        </ChartCard>
      )}

      {/* Exercise Frequency (Horizontal Bar) */}
      {hasFrequency && (
        <ChartCard>
          <ChartTitle>Top Exercises</ChartTitle>
          <VictoryChart
            horizontal
            height={Math.max(180, data.exerciseFrequency.slice(0, 8).length * 28)}
            padding={{ top: 10, bottom: 30, left: 120, right: 30 }}
            domainPadding={{ y: 10 }}
          >
            <VictoryAxis
              style={{
                tickLabels: { fill: chartColors.text, fontSize: 9 },
                axis: { stroke: 'transparent' },
              }}
            />
            <VictoryAxis
              dependentAxis
              style={{
                tickLabels: { fill: chartColors.text, fontSize: 9 },
                axis: { stroke: chartColors.gridLine },
                grid: { stroke: chartColors.gridLine },
              }}
            />
            <VictoryBar
              data={data.exerciseFrequency.slice(0, 8).reverse()}
              x="name"
              y="count"
              style={{
                data: { fill: chartColors.purple, fillOpacity: 0.8 },
              }}
              barWidth={14}
            />
          </VictoryChart>
        </ChartCard>
      )}

      {/* Intensity Trend Line */}
      {hasIntensity && (
        <ChartCard>
          <ChartTitle>Intensity Trend</ChartTitle>
          <VictoryChart
            height={200}
            padding={{ top: 20, bottom: 40, left: 40, right: 20 }}
          >
            <VictoryAxis
              tickFormat={(t: string) => {
                const d = new Date(t);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
              style={{
                tickLabels: { fill: chartColors.text, fontSize: 9, angle: -30 },
                axis: { stroke: chartColors.gridLine },
              }}
            />
            <VictoryAxis
              dependentAxis
              domain={[0, 10]}
              style={{
                tickLabels: { fill: chartColors.text, fontSize: 9 },
                axis: { stroke: chartColors.gridLine },
                grid: { stroke: chartColors.gridLine },
              }}
            />
            <VictoryArea
              data={data.intensityTrend}
              x="date"
              y="intensity"
              style={{
                data: {
                  fill: 'rgba(96, 192, 240, 0.15)',
                  stroke: chartColors.cyan,
                  strokeWidth: 2,
                },
              }}
              interpolation="monotoneX"
            />
          </VictoryChart>
        </ChartCard>
      )}

      {/* Workout Calendar Heatmap */}
      {hasCalendar && (
        <ChartCard $span>
          <ChartTitle>Workout Calendar (Last 90 Days)</ChartTitle>
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
          <HeatmapLegend>
            <LegendItem><LegendSwatch $color="var(--bg-surface, #1A1A24)" /> None</LegendItem>
            <LegendItem><LegendSwatch $color="#002060" /> 1</LegendItem>
            <LegendItem><LegendSwatch $color="#4070C0" /> 2</LegendItem>
            <LegendItem><LegendSwatch $color="#60C0F0" /> 3+</LegendItem>
          </HeatmapLegend>
        </ChartCard>
      )}
    </ChartsGrid>
  );
};

export default WorkoutChartsTab;
