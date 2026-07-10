import React, { useMemo } from 'react';
import { VictoryChart, VictoryArea, VictoryContainer, VictoryPolarAxis } from 'victory';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  CHART_COLORS, hexAlpha, victoryTheme, VICTORY_ANIMATE,
} from '../../chartTheme';
import { useReducedMotion } from '../../../../hooks/useReducedMotion';

const DEFAULT_REFERENCES = { protein: 150, carbs: 250, fat: 65, fiber: 30, hydrationMl: 2500 };
const DECIMAL_NUMBER_PATTERN = /^\d+(?:\.\d+)?$/;

interface NutritionBalanceRadarProps {
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  hydrationMl?: number;
  hydrationTargetMl?: number;
  loading?: boolean;
}

export interface NutritionRadarDatum {
  x: number;
  y: number;
}

const emptyRadarData = (): NutritionRadarDatum[] => [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 2, y: 0 },
  { x: 3, y: 0 },
  { x: 4, y: 0 },
];

const cleanPositiveNumber = (value: unknown) => {
  let numericValue: number | null = null;

  if (typeof value === 'number') {
    numericValue = Number.isFinite(value) ? value : null;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (DECIMAL_NUMBER_PATTERN.test(trimmed)) {
      const parsed = Number(trimmed);
      numericValue = Number.isFinite(parsed) ? parsed : null;
    }
  }

  if (numericValue === null || numericValue <= 0) return 0;
  return numericValue;
};

const pct = (value: unknown, target: number) => {
  const numericValue = cleanPositiveNumber(value);
  if (numericValue <= 0) return 0;
  return Math.min(Math.round((numericValue / target) * 100), 100);
};

export const buildNutritionRadarData = ({
  protein, carbs, fat, fiber, hydrationMl, hydrationTargetMl, loading,
}: NutritionBalanceRadarProps): NutritionRadarDatum[] => {
  if (loading) return emptyRadarData();
  const hydrationReference = cleanPositiveNumber(hydrationTargetMl) || DEFAULT_REFERENCES.hydrationMl;

  return [
    { x: 0, y: pct(protein, DEFAULT_REFERENCES.protein) },
    { x: 1, y: pct(carbs, DEFAULT_REFERENCES.carbs) },
    { x: 2, y: pct(fat, DEFAULT_REFERENCES.fat) },
    { x: 3, y: pct(fiber, DEFAULT_REFERENCES.fiber) },
    { x: 4, y: pct(hydrationMl, hydrationReference) },
  ];
};

const NutritionBalanceRadar: React.FC<NutritionBalanceRadarProps> = ({
  protein, carbs, fat, fiber, hydrationMl, hydrationTargetMl, loading,
}) => {
  const isLoading = Boolean(loading);
  const prefersReducedMotion = useReducedMotion();
  const data = useMemo(
    () => buildNutritionRadarData({ protein, carbs, fat, fiber, hydrationMl, hydrationTargetMl, loading: isLoading }),
    [protein, carbs, fat, fiber, hydrationMl, hydrationTargetMl, isLoading],
  );

  return (
  <ChartCard
    role="region"
    aria-label="Nutrition balance reference radar chart"
    aria-busy={isLoading}
    tabIndex={0}
  >
      <ChartHeader>
        <div>
          <ChartTitle>Nutrition Balance</ChartTitle>
          <ChartSubtitle>Macro references & hydration goal coverage (%)</ChartSubtitle>
        </div>
      </ChartHeader>
    <ChartContainer>
      <VictoryChart
        polar
        theme={victoryTheme}
        animate={prefersReducedMotion ? undefined : VICTORY_ANIMATE}
        containerComponent={<VictoryContainer
          title="Current nutrition balance"
          desc={`Protein ${data[0].y}%, carbs ${data[1].y}%, fats ${data[2].y}%, fiber ${data[3].y}%, hydration ${data[4].y}%`}
        />}
        domain={{ y: [0, 100] }}
      >
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
