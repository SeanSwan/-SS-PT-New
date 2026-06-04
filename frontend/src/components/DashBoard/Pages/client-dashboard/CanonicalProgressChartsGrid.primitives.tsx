/**
 * COMPONENT: CanonicalProgressChartsGrid.primitives
 * OWNER: Client Dashboard / Progress
 * PURPOSE: Shared empty-state and numeric helpers for chart cards.
 */

import React, { useMemo } from 'react';
import type { ChartPoint } from '../../../../hooks/analytics/useClientProgressCharts';
import { EmptyHint, EmptyLabel, EmptyState } from './CanonicalProgressChartsGrid.styles';

export const EmptyCard: React.FC<{ label: string; hint?: string }> = ({ label, hint }) => (
  <EmptyState>
    <EmptyLabel>{label}</EmptyLabel>
    {hint && <EmptyHint>{hint}</EmptyHint>}
  </EmptyState>
);

export function useNumericBarWidth(points: ChartPoint[]): number[] {
  return useMemo(() => {
    if (!points.length) return [];
    const max = Math.max(...points.map((p) => p.y));
    if (max <= 0) return points.map(() => 0);
    return points.map((p) => (p.y / max) * 100);
  }, [points]);
}
