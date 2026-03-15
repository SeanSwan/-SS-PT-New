/**
 * Chart 4: Macro Distribution — Donut/Ring Chart
 * Protein / Carbs / Fats breakdown with center calorie total.
 */
import React, { useMemo } from 'react';
import { ResponsivePie } from '@nivo/pie';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle,
  ChartContainer, TooltipBox, CenterLabel,
  nivoCrystallineTheme, NIVO_MOTION, MACRO_PALETTE, CHART_COLORS,
} from '../chartTheme';

const CAL_PER_GRAM = { Protein: 4, Carbs: 4, Fats: 9 } as const;

const demoData = [
  { id: 'Protein' as const, label: 'Protein', value: 180 },
  { id: 'Carbs' as const,   label: 'Carbs',   value: 220 },
  { id: 'Fats' as const,    label: 'Fats',    value: 75 },
];

const MacroDonut: React.FC = () => {
  const totalCals = useMemo(
    () => demoData.reduce((sum, item) => sum + item.value * CAL_PER_GRAM[item.id], 0),
    []
  );

  return (
  <ChartCard $delay={240} role="region" aria-label="Donut chart showing macronutrient distribution" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Macro Split</ChartTitle>
        <ChartSubtitle>Today's intake breakdown</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <CenterLabel>
        <div className="value">{totalCals.toLocaleString()}</div>
        <div className="label">calories</div>
      </CenterLabel>
      <ResponsivePie
        data={demoData}
        theme={nivoCrystallineTheme}
        animate
        motionConfig={NIVO_MOTION}
        margin={{ top: 20, right: 20, bottom: 40, left: 20 }}
        innerRadius={0.75}
        padAngle={2}
        cornerRadius={4}
        colors={MACRO_PALETTE}
        borderWidth={0}
        enableArcLinkLabels={false}
        arcLabelsTextColor={CHART_COLORS.frostWhite}
        arcLabelsSkipAngle={20}
        legends={[
          {
            anchor: 'bottom',
            direction: 'row',
            itemWidth: 80,
            itemHeight: 20,
            symbolSize: 10,
            symbolShape: 'circle',
            translateY: 30,
          },
        ]}
        tooltip={({ datum }) => (
          <TooltipBox>
            {datum.id}
            <strong>{datum.value}g</strong>
          </TooltipBox>
        )}
      />
    </ChartContainer>
  </ChartCard>
  );
};

export default MacroDonut;
