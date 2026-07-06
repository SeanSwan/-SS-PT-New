/**
 * CanonicalProgressChartsGrid.prBars
 * ==================================
 * PR Highlights bar-list extracted from the at-cap detail-cards file
 * (Phase 2.2c, Rule 4) so the card AND the chart expand modal render the
 * same composition. HTML bars scale to their container — no size props
 * needed for the bigger modal rendering.
 */
import React, { useMemo } from 'react';
import type { PRPoint } from '../../../../hooks/analytics/useClientProgressCharts.types';
import type { ProgressChartDrilldownRow } from '../../progress-proof/progressChartActions';
import { CHART_COLORS } from '../../../Charts/chartTheme';
import { useNumericBarWidth } from './CanonicalProgressChartsGrid.primitives';
import {
  BarFill,
  BarLabel,
  BarList,
  BarRow,
  BarTrack,
  BarValue,
} from './CanonicalProgressChartsGrid.styles';

export const selectBestPrByExercise = (data: PRPoint[]): PRPoint[] => {
  const map = new Map<string, PRPoint>();
  for (const row of data) {
    const cur = map.get(row.exercise);
    if (!cur || row.y > cur.y) map.set(row.exercise, row);
  }
  return Array.from(map.values())
    .sort((a, b) => b.y - a.y)
    .slice(0, 6);
};

export const buildPrDrilldownRows = (data: PRPoint[]): ProgressChartDrilldownRow[] =>
  selectBestPrByExercise(data).map((row) => ({
    id: row.exercise,
    label: row.exercise,
    value: `${row.y} lbs × ${row.reps}`,
    detail: row.x ? `Set on ${row.x}` : undefined,
  }));

const PrHighlightsBars: React.FC<{ data: PRPoint[] }> = ({ data }) => {
  const bestByExercise = useMemo(() => selectBestPrByExercise(data), [data]);
  const fills = useNumericBarWidth(bestByExercise.map((r) => ({ x: r.exercise, y: r.y })));
  return (
    <BarList>
      {bestByExercise.map((row, i) => (
        <BarRow key={row.exercise}>
          <BarLabel title={row.exercise}>{row.exercise}</BarLabel>
          <BarTrack>
            <BarFill $pct={fills[i] ?? 0} $color={CHART_COLORS.gildedFern} />
          </BarTrack>
          <BarValue>{row.y} lbs x {row.reps}</BarValue>
        </BarRow>
      ))}
    </BarList>
  );
};

export default PrHighlightsBars;
