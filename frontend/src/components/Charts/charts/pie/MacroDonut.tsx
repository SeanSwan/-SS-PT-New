import React, { useMemo } from 'react';
import { VictoryPie } from 'victory';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  CenterLabel, CHART_COLORS, MACRO_PALETTE, VICTORY_ANIMATE,
} from '../../chartTheme';

interface MacroDonutProps {
  protein?: number;
  carbs?: number;
  fat?: number;
  totalCalories?: number;
  loading?: boolean;
}

const DEMO_DATA = [
  { label: 'Protein 35%', value: 35 },
  { label: 'Carbs 40%', value: 40 },
  { label: 'Fat 25%', value: 25 },
];

const MacroDonut: React.FC<MacroDonutProps> = ({
  protein, carbs, fat, totalCalories, loading,
}) => {
  const { data, calLabel } = useMemo(() => {
    const total = (protein || 0) + (carbs || 0) + (fat || 0);
    if (!total || loading) {
      return { data: DEMO_DATA, calLabel: '—' };
    }
    const pPct = Math.round(((protein || 0) / total) * 100);
    const cPct = Math.round(((carbs || 0) / total) * 100);
    const fPct = 100 - pPct - cPct;
    return {
      data: [
        { label: `Protein ${pPct}%`, value: pPct },
        { label: `Carbs ${cPct}%`, value: cPct },
        { label: `Fat ${fPct}%`, value: fPct },
      ],
      calLabel: Math.round(totalCalories || 0).toLocaleString(),
    };
  }, [protein, carbs, fat, totalCalories, loading]);

  return (
    <ChartCard role="region" aria-label="Macronutrient split donut chart" tabIndex={0}>
      <ChartHeader>
        <div>
          <ChartTitle>Macro Split</ChartTitle>
          <ChartSubtitle>Daily macronutrient distribution</ChartSubtitle>
        </div>
      </ChartHeader>
      <ChartContainer>
        <CenterLabel>
          <div className="value">{calLabel}</div>
          <div className="label">cal / day</div>
        </CenterLabel>
        <VictoryPie
          data={data}
          x="label"
          y="value"
          innerRadius={80}
          colorScale={MACRO_PALETTE}
          animate={VICTORY_ANIMATE}
          labelRadius={({ innerRadius }) => (innerRadius as number) + 30}
          style={{
            labels: { fill: CHART_COLORS.frostWhite, fontSize: 11, fontFamily: "'Sora', sans-serif" },
            data: { stroke: CHART_COLORS.midnightSapphire, strokeWidth: 2 },
          }}
        />
      </ChartContainer>
    </ChartCard>
  );
};

export default MacroDonut;
