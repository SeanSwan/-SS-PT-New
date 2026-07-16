import React, { useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { Loader2 } from 'lucide-react';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, CHART_COLORS, hexAlpha } from '../../chartTheme';
import { useMacroSummary, type MacroSummary } from '../../../../hooks/useMacroSummary';

type MacroField = 'totalCalories' | 'totalProtein' | 'totalFiber' | 'totalSodium';

interface BulletReference {
  label: string;
  field: MacroField;
  reference: number;
  max: number;
  color: string;
  unit: string;
}

interface BulletMetric extends Omit<BulletReference, 'field'> {
  current: number;
}

const REFERENCES: BulletReference[] = [
  { label: 'Calories', field: 'totalCalories', reference: 2200, max: 2800, color: CHART_COLORS.iceWing, unit: '' },
  { label: 'Protein', field: 'totalProtein', reference: 150, max: 200, color: CHART_COLORS.wingPurple, unit: 'g' },
  { label: 'Fiber', field: 'totalFiber', reference: 30, max: 40, color: CHART_COLORS.gildedFern, unit: 'g' },
  { label: 'Sodium', field: 'totalSodium', reference: 2300, max: 3000, color: CHART_COLORS.arcticCyan, unit: 'mg' },
];

const SAFE_ERROR_COPY = 'Nutrition totals unavailable. Try refreshing this dashboard.';
const DECIMAL_NUMBER_PATTERN = /^\d+(?:\.\d+)?$/;

const cleanNumber = (value: unknown) => {
  let numberValue: number | null = null;
  if (typeof value === 'number') {
    numberValue = Number.isFinite(value) ? value : null;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (DECIMAL_NUMBER_PATTERN.test(trimmed)) {
      const parsed = Number(trimmed);
      numberValue = Number.isFinite(parsed) ? parsed : null;
    }
  }
  return numberValue !== null && numberValue > 0 ? Math.round(numberValue) : 0;
};

const formatMetric = (value: number, unit: string) => `${value.toLocaleString()}${unit}`;

const hasNutrition = (summary: MacroSummary | null) => Boolean(
  summary
  && (
    cleanNumber(summary.mealCount) > 0
    || cleanNumber(summary.totalCalories) > 0
    || cleanNumber(summary.totalProtein) > 0
    || cleanNumber(summary.totalFiber) > 0
    || cleanNumber(summary.totalSodium) > 0
  ),
);

export const buildNutritionGoalMetrics = (summary: MacroSummary | null): BulletMetric[] => (
  REFERENCES.map(({ field, ...reference }) => ({
    ...reference,
    current: cleanNumber(summary?.[field]),
  }))
);

const clampPercent = (value: number) => Math.max(0, Math.min(value, 100));

const Wrap = styled.div`display:flex;flex-direction:column;gap:20px;flex:1;justify-content:center;padding:16px;`;
const Row = styled.div`display:flex;flex-direction:column;gap:4px;`;
const Label = styled.div`font-family:'Sora',sans-serif;font-size:0.75rem;color:${CHART_COLORS.textSecondary};display:flex;justify-content:space-between;`;
const Track = styled.div`position:relative;height:24px;background:${hexAlpha(CHART_COLORS.iceWing,0.1)};border-radius:6px;overflow:hidden;`;
const Fill = styled.div<{$p:number;$c:string}>`position:absolute;left:0;top:0;height:100%;width:${({$p})=>Math.min($p,100)}%;background:${({$c})=>$c};border-radius:6px;transition:width 0.8s cubic-bezier(0.16,1,0.3,1);`;
const Target = styled.div<{$pos:number}>`position:absolute;left:${({$pos})=>$pos}%;top:-2px;width:3px;height:calc(100% + 4px);background:${CHART_COLORS.frostWhite};border-radius:2px;z-index:1;`;

const NutritionGoalBullet: React.FC = () => {
  const { summary, loading, error } = useMacroSummary();
  const metrics = useMemo(() => buildNutritionGoalMetrics(summary), [summary]);
  const empty = !loading && !error && !hasNutrition(summary);

  return (
    <ChartCard role="region" aria-label="Nutrition goal bullet chart" aria-busy={loading} tabIndex={0}>
      <ChartHeader>
        <div>
          <ChartTitle>Nutrition Goals</ChartTitle>
          <ChartSubtitle>Today&apos;s logged totals vs training references</ChartSubtitle>
        </div>
      </ChartHeader>
      <Wrap>
        {loading ? (
          <StateText><Loader2 size={18} /> Loading nutrition totals...</StateText>
        ) : error ? (
          <StateText>{SAFE_ERROR_COPY}</StateText>
        ) : empty ? (
          <StateText>No nutrition logged today</StateText>
        ) : (
          metrics.map(m => {
            const currentLabel = formatMetric(m.current, m.unit);
            const referenceLabel = formatMetric(m.reference, m.unit);
            return (
              <Row key={m.label}>
                <Label><span>{m.label}</span><span>{currentLabel} / {referenceLabel}</span></Label>
                <Track
                  role="meter"
                  aria-label={`${m.label}: ${currentLabel} of ${referenceLabel}`}
                  aria-valuemin={0}
                  aria-valuemax={m.max}
                  aria-valuenow={Math.min(m.current, m.max)}
                  aria-valuetext={`${currentLabel} logged, ${referenceLabel} reference`}
                >
                  <Fill $p={clampPercent((m.current / m.max) * 100)} $c={m.color} />
                  <Target $pos={clampPercent((m.reference / m.max) * 100)} />
                </Track>
              </Row>
            );
          })
        )}
      </Wrap>
    </ChartCard>
  );
};

export default NutritionGoalBullet;

const spin = keyframes`to { transform: rotate(360deg); }`;

const StateText = styled.div`
  display: flex;
  min-height: 180px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: ${CHART_COLORS.textSecondary};
  font-family: 'Sora', sans-serif;
  font-size: 0.86rem;
  text-align: center;

  svg { animation: ${spin} 0.8s linear infinite; }

  @media (prefers-reduced-motion: reduce) {
    svg { animation: none; }
  }
`;
