/**
 * AdminProgressChartsGrid.chartBodies
 * ===================================
 * The three admin flagship Victory compositions extracted from the at-cap
 * primary-cards file (Phase 2.2c, Rule 4) so the card AND the chart expand
 * modal render the same chart at card (180) or modal (measured) size.
 */
import React from 'react';
import {
  VictoryArea,
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryGroup,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';
import { victoryTheme } from '../../../../Charts/chartTheme';
import {
  repsBarProps,
  setsBarProps,
  weeklyVolumeAreaProps,
  workoutFrequencyBarProps,
} from './AdminProgressChartsGrid.chartConfig';
import type { ChartPoint } from '../../../../../hooks/analytics/useClientProgressCharts';

const compactPadding = { top: 12, bottom: 36, left: 36, right: 8 };
const volumePadding = { top: 12, bottom: 36, left: 48, right: 8 };
const groupedPadding = { top: 20, bottom: 36, left: 44, right: 8 };

interface SizeProps { width?: number; height?: number }

export const AdminFrequencyChart: React.FC<{ data: ChartPoint[] } & SizeProps> = ({ data, width, height = 180 }) => (
  <VictoryChart
    theme={victoryTheme}
    height={height}
    {...(width ? { width } : {})}
    padding={compactPadding}
    containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
  >
    <VictoryAxis />
    <VictoryAxis dependentAxis />
    <VictoryBar
      data={data}
      {...workoutFrequencyBarProps}
      cornerRadius={{ top: 3 }}
      labels={({ datum }) => `${datum.x}: ${datum.y}`}
      labelComponent={<VictoryTooltip renderInPortal={false} />}
    />
  </VictoryChart>
);

export const AdminVolumeChart: React.FC<{ data: Array<ChartPoint & { workouts?: number | null }> } & SizeProps> = ({ data, width, height = 180 }) => (
  <VictoryChart
    theme={victoryTheme}
    height={height}
    {...(width ? { width } : {})}
    padding={volumePadding}
    containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
  >
    <VictoryAxis />
    <VictoryAxis dependentAxis />
    <VictoryArea
      data={data}
      {...weeklyVolumeAreaProps}
      labels={({ datum }) => `${datum.x}: ${Math.round(datum.y).toLocaleString()} lbs - ${datum.workouts ?? 0} workout${(datum.workouts ?? 0) === 1 ? '' : 's'}`}
      labelComponent={<VictoryTooltip renderInPortal={false} />}
    />
  </VictoryChart>
);

export const AdminSetsRepsChart: React.FC<{ sets: ChartPoint[]; reps: ChartPoint[] } & SizeProps> = ({ sets, reps, width, height = 180 }) => (
  <VictoryChart
    theme={victoryTheme}
    height={height}
    {...(width ? { width } : {})}
    padding={groupedPadding}
    containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
  >
    <VictoryAxis />
    <VictoryAxis dependentAxis />
    <VictoryGroup offset={8}>
      <VictoryBar data={sets} {...setsBarProps} />
      <VictoryBar data={reps} {...repsBarProps} />
    </VictoryGroup>
  </VictoryChart>
);
