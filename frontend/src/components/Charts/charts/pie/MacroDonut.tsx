import React, { useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { Loader2 } from 'lucide-react';
import { VictoryPie } from 'victory';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  CenterLabel, CHART_COLORS, VICTORY_ANIMATE,
} from '../../chartTheme';

interface MacroDonutProps {
  protein?: number;
  carbs?: number;
  fat?: number;
  totalCalories?: number;
  loading?: boolean;
}

// Per-datum colors — do NOT touch MACRO_PALETTE in chartTheme (shared constant)
const DATUM_COLORS = {
  protein: '#8B5CF6', // Wing Purple
  carbs: '#60C0F0',   // Ice Wing
  fat: '#C6A84B',     // Gilded Fern
};

const MacroDonut: React.FC<MacroDonutProps> = ({
  protein, carbs, fat, totalCalories, loading,
}) => {
  const { data, calLabel, isEmpty } = useMemo(() => {
    if (loading) return { data: [], calLabel: '...', isEmpty: false };
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
        {loading ? (
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
              animate={VICTORY_ANIMATE}
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
