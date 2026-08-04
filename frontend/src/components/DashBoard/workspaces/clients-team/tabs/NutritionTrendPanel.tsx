/**
 * ============================================================================
 * FILE: NutritionTrendPanel.tsx
 * PURPOSE: Phase 4A collapsed-by-default trend panel — expands to a compact
 *          lazy-loaded Victory line (logged solid vs target dashed) when the
 *          7-day range is active (HY3 §(a)5, progressive disclosure).
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-08-04
 * ============================================================================
 */
import React, { Suspense, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { NutritionTrendPoint } from './NutritionCoachTab.logic';
import {
  TrendChartFrame,
  TrendFallback,
  TrendLegend,
  TrendShell,
  TrendToggleButton,
} from './NutritionCoachPanels.styles';

const NutritionTrendChart = React.lazy(() => import('./NutritionTrendChart'));

interface NutritionTrendPanelProps {
  points: NutritionTrendPoint[];
  targetCalories: number | null;
}

const NutritionTrendPanel: React.FC<NutritionTrendPanelProps> = ({ points, targetCalories }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <TrendShell aria-label="Nutrition trend">
      <TrendToggleButton
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        7-day calorie trend
        {expanded
          ? <ChevronUp size={16} aria-hidden="true" />
          : <ChevronDown size={16} aria-hidden="true" />}
      </TrendToggleButton>
      {expanded ? (
        points.length === 0 ? (
          <TrendFallback role="status">No trend data in this range</TrendFallback>
        ) : (
          <TrendChartFrame>
            <Suspense fallback={<TrendFallback role="status">Loading trend...</TrendFallback>}>
              <NutritionTrendChart points={points} targetCalories={targetCalories} />
            </Suspense>
            <TrendLegend>
              Logged (solid) {targetCalories !== null && targetCalories > 0 ? '· target (dashed)' : '· no calorie target'}
            </TrendLegend>
          </TrendChartFrame>
        )
      ) : null}
    </TrendShell>
  );
};

export default NutritionTrendPanel;
