/**
 * CanonicalProgressChartsGrid.setsRepsState
 * =========================================
 * Sets/Reps card state helpers extracted from the at-cap interactive-cards
 * file (Phase 2.2b, Rule 4). Pure functions — no render logic.
 */
import type React from 'react';
import type { ChartPoint } from '../../../../hooks/analytics/useClientProgressCharts';
import type { buildProgressChartPulse } from '../../progress-proof/progressChartActions';

type SeriesId = 'sets' | 'reps';

const isSeriesId = (id: string): id is SeriesId => id === 'sets' || id === 'reps';

export const buildSetsRepsSummary = (hasData: boolean) => (
  hasData
    ? 'Toggle sets and reps to isolate the work signal behind this trend.'
    : 'No verified set or rep rows are available yet.'
);

export const visiblePulse = (
  hasVisibleSeries: boolean,
  pulse: ReturnType<typeof buildProgressChartPulse>,
) => (
  hasVisibleSeries ? pulse : undefined
);

export const hasAnyVisibleSeries = (visibleSeries: Record<SeriesId, boolean>) => (
  Boolean(visibleSeries.sets || visibleSeries.reps)
);

export const hasAnySetsRepsData = (sets: ChartPoint[], reps: ChartPoint[]) => (
  Boolean(sets.length || reps.length)
);

export const toggleVisibleSeries = (
  setVisibleSeries: React.Dispatch<React.SetStateAction<Record<SeriesId, boolean>>>,
  id: string,
) => {
  if (!isSeriesId(id)) return;
  setVisibleSeries((current) => ({ ...current, [id]: !current[id] }));
};
