/**
 * ============================================================================
 * FILE: NutritionTrendChart.tsx
 * PURPOSE: Victory line body for the 7-day nutrition trend — logged calories
 *          solid (Arctic Cyan, data-only) vs target dashed (Gilded Fern).
 *          Lazy-loaded by NutritionTrendPanel like other Victory consumers
 *          (Rule: never eagerly bundle chart libraries into the tab shell).
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-08-04
 * ============================================================================
 * No `animate` props: the chart is static by construction, so it satisfies
 * prefers-reduced-motion without a runtime guard.
 */
import React from 'react';
import { VictoryAxis, VictoryChart, VictoryLine } from 'victory';
import { victoryTheme } from '../../../../Charts/chartTheme';
import type { NutritionTrendPoint } from './NutritionCoachTab.logic';

const chartPadding = { top: 16, bottom: 32, left: 52, right: 12 };

interface NutritionTrendChartProps {
  points: NutritionTrendPoint[];
  targetCalories: number | null;
  height?: number;
}

const NutritionTrendChart: React.FC<NutritionTrendChartProps> = ({
  points,
  targetCalories,
  height = 180,
}) => (
  <VictoryChart theme={victoryTheme} height={height} padding={chartPadding}>
    <VictoryAxis />
    <VictoryAxis dependentAxis />
    <VictoryLine
      data={points}
      style={{ data: { stroke: 'var(--chart-data, #50A0F0)', strokeWidth: 2 } }}
    />
    {targetCalories !== null && targetCalories > 0 ? (
      <VictoryLine
        data={points.map((point) => ({ x: point.x, y: targetCalories }))}
        style={{
          data: {
            stroke: 'var(--accent-gold, #C6A84B)',
            strokeWidth: 1.5,
            strokeDasharray: '6,4',
          },
        }}
      />
    ) : null}
  </VictoryChart>
);

export default NutritionTrendChart;
