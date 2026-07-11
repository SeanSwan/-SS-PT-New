import React, { useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { Loader2 } from 'lucide-react';
import { VictoryContainer, VictoryPie } from 'victory';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  CenterLabel, CHART_COLORS, VICTORY_ANIMATE,
} from '../../chartTheme';
import { useReducedMotion } from '../../../../hooks/useReducedMotion';

interface MacroDonutProps {
  protein?: number;
  carbs?: number;
  fat?: number;
  totalCalories?: number;
  loading?: boolean;
}

// Keep this order local; MACRO_PALETTE is shared elsewhere with a different order.
const DATUM_COLORS = {
  protein: CHART_COLORS.wingPurple,
  carbs: CHART_COLORS.iceWing,
  fat: CHART_COLORS.gildedFern,
};

const MacroDonut: React.FC<MacroDonutProps> = ({
  protein, carbs, fat, totalCalories, loading,
}) => {
  const isLoading = Boolean(loading);
  const prefersReducedMotion = useReducedMotion();
  const { data, calLabel, isEmpty } = useMemo(() => {
    if (isLoading) return { data: [], calLabel: '...', isEmpty: false };
    const total = (protein || 0) + (carbs || 0) + (fat || 0);
    if (!total) return { data: [], calLabel: '—', isEmpty: true };
    const pPct = Math.round(((protein || 0) / total) * 100);
    const cPct = Math.round(((carbs || 0) / total) * 100);
    const fPct = 100 - pPct - cPct;
    return {
      isEmpty: false,
      data: [
        { label: `Protein ${pPct}%`, value: pPct, color: DATUM_COLORS.protein },
        { label: `Carbs ${cPct}%`, value: cPct, color: DATUM_COLORS.carbs },
        { label: `Fat ${fPct}%`, value: fPct, color: DATUM_COLORS.fat },
      ],
      calLabel: Math.round(totalCalories || 0).toLocaleString(),
    };
  }, [protein, carbs, fat, totalCalories, isLoading]);

  return (
    <ChartCard
      role="region"
      aria-label="Macronutrient split donut chart"
      aria-busy={isLoading}
      tabIndex={0}
    >
      <ChartHeader>
        <div>
          <ChartTitle>Macro Split</ChartTitle>
          <ChartSubtitle>Daily macronutrient distribution</ChartSubtitle>
        </div>
      </ChartHeader>
      <ChartContainer>
        {isLoading ? (
          <LoadingState>
            <Loader2 size={28} color="var(--accent-primary, #60C0F0)" />
          </LoadingState>
        ) : isEmpty ? (
          <EmptyState>No macros logged today</EmptyState>
        ) : (
          <>
            <CenterLabel>
              <div className="value">{calLabel}</div>
              <div className="label" style={{
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--swan-lavender, #4070C0)',
                fontSize: '10px',
              }}>KCAL</div>
            </CenterLabel>
            <VictoryPie
              data={data}
              x="label"
              y="value"
              innerRadius={80}
              containerComponent={<VictoryContainer
                title="Current macronutrient split"
                desc={data.map((datum) => datum.label).join(', ')}
              />}
              animate={prefersReducedMotion ? undefined : VICTORY_ANIMATE}
              labelRadius={({ innerRadius }) => (innerRadius as number) + 30}
              style={{
                labels: { fill: CHART_COLORS.frostWhite, fontSize: 11, fontFamily: "'Sora', sans-serif" },
                data: {
                  fill: ({ datum }: any) => datum.color,
                  stroke: CHART_COLORS.midnightSapphire,
                  strokeWidth: 2,
                },
              }}
            />
          </>
        )}
      </ChartContainer>
    </ChartCard>
  );
};

export default MacroDonut;

// ── Styled Components ──

const spinKf = keyframes`to { transform: rotate(360deg); }`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  svg { animation: ${spinKf} 0.8s linear infinite; }

  @media (prefers-reduced-motion: reduce) {
    svg { animation: none; }
  }
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: var(--swan-lavender, #4070C0);
`;
