import React, { useMemo } from 'react';
import { VictoryChart, VictoryArea, VictoryPolarAxis } from 'victory';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  CHART_COLORS, hexAlpha, victoryTheme, VICTORY_ANIMATE,
} from '../../chartTheme';

// Default daily targets (grams)
const TARGETS = { protein: 150, carbs: 250, fat: 65, fiber: 30, hydration: 2500 };

interface NutritionBalanceRadarProps {
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  hydrationMl?: number;
  loading?: boolean;
}

const DEMO_DATA = [
  { x: 0, y: 87 },
  { x: 1, y: 72 },
  { x: 2, y: 65 },
  { x: 3, y: 58 },
  { x: 4, y: 91 },
];

const NutritionBalanceRadar: React.FC<NutritionBalanceRadarProps> = ({
  protein, carbs, fat, fiber, hydrationMl, loading,
}) => {
  const data = useMemo(() => {
    const hasData = !loading && (protein || carbs || fat || fiber || hydrationMl);
    if (!hasData) return DEMO_DATA;
    // Clamp each to 0-100% of target
    const pct = (val: number, target: number) => Math.min(Math.round((val / target) * 100), 100);
    return [
      { x: 0, y: pct(protein || 0, TARGETS.protein) },
      { x: 1, y: pct(carbs || 0, TARGETS.carbs) },
      { x: 2, y: pct(fat || 0, TARGETS.fat) },
      { x: 3, y: pct(fiber || 0, TARGETS.fiber) },
      { x: 4, y: pct(hydrationMl || 0, TARGETS.hydration) },
    ];
  }, [protein, carbs, fat, fiber, hydrationMl, loading]);

  return (
  <ChartCard role="region" aria-label="Nutrition balance adherence radar chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Nutrition Balance</ChartTitle>
        <ChartSubtitle>Macro & hydration adherence (%)</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart polar theme={victoryTheme} animate={VICTORY_ANIMATE} domain={{ y: [0, 100] }}>
        <VictoryPolarAxis
          dependentAxis
          style={{ axis: { stroke: 'none' }, grid: { stroke: CHART_COLORS.gridLine } }}
          tickFormat={() => ''}
        />
        <VictoryPolarAxis
          tickValues={[0, 1, 2, 3, 4]}
          labelPlacement="vertical"
          tickFormat={['Protein', 'Carbs', 'Fats', 'Fiber', 'Hydration']}
          style={{
            axis: { stroke: CHART_COLORS.gridLine },
            tickLabels: { fill: CHART_COLORS.textSecondary, fontSize: 10, fontFamily: "'Sora', sans-serif" },
          }}
        />
        <VictoryArea
          data={data}
          style={{
            data: {
              fill: hexAlpha(CHART_COLORS.arcticCyan, 0.3),
              stroke: CHART_COLORS.arcticCyan,
              strokeWidth: 2,
            },
          }}
        />
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
  );
};

export default NutritionBalanceRadar;
