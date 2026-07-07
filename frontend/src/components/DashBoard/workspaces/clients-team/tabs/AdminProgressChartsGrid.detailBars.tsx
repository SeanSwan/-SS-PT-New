/**
 * AdminProgressChartsGrid.detailBars
 * ==================================
 * Shared visuals for the six admin detail cards - rendered by both the card
 * body and the chart expand modal (Phase 4b drill-down sweep), so the modal
 * view always matches the card exactly. HTML bar lists scale to their
 * container; the two Victory charts take width/height for the modal canvas.
 */
import React from 'react';
import {
  VictoryAxis,
  VictoryChart,
  VictoryLine,
  VictoryPie,
  VictoryVoronoiContainer,
} from 'victory';
import type { CanonicalProgressCharts } from '../../../../../hooks/analytics/useAdminClientProgressCharts';
import { CHART_COLORS, FULL_PALETTE, victoryTheme } from '../../../../Charts/chartTheme';
import { selectBestPrByExercise } from '../../../Pages/client-dashboard/CanonicalProgressChartsGrid.prBars';
import {
  getAnchorLineProps,
  movementPatternLabelProps,
  type ExerciseFrequencyPoint,
  type RecoverySignalPoint,
} from './AdminProgressChartsGrid.chartConfig';
import {
  BarFill,
  BarLabel,
  BarList,
  BarRow,
  BarTrack,
  BarValue,
  RecoveryIcon,
} from './AdminProgressChartsGrid.styles';

type SizeProps = { width?: number; height?: number };

const anchorPadding = { top: 20, bottom: 36, left: 40, right: 8 };

const barPercentages = (points: { y: number }[]) => {
  const max = Math.max(...points.map((point) => point.y), 1);
  return points.map((point) => (point.y / max) * 100);
};

export const AdminPrBars: React.FC<{ data: CanonicalProgressCharts['prTimeline'] }> = ({ data }) => {
  const best = selectBestPrByExercise(data);
  const percentages = barPercentages(best);
  return (
    <BarList>
      {best.map((record, index) => (
        <BarRow key={record.exercise}>
          <BarLabel>{record.exercise}</BarLabel>
          <BarTrack><BarFill $pct={percentages[index]} $color={CHART_COLORS.gildedFern} /></BarTrack>
          <BarValue>{record.y}lbs x {record.reps}</BarValue>
        </BarRow>
      ))}
    </BarList>
  );
};

export const AdminAnchorChart: React.FC<{ bundle: CanonicalProgressCharts['anchorLifts'] } & SizeProps> = ({
  bundle,
  width,
  height = 180,
}) => (
  <VictoryChart
    theme={victoryTheme}
    height={height}
    {...(width ? { width } : {})}
    padding={anchorPadding}
    containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
  >
    <VictoryAxis />
    <VictoryAxis dependentAxis />
    {bundle.exercises.map((name, index) => {
      const data = (bundle.data[name] || []).map((point) => ({ x: point.x, y: point.y }));
      return data.length > 0 ? <VictoryLine key={name} data={data} {...getAnchorLineProps(index)} /> : null;
    })}
  </VictoryChart>
);

export const AdminFrequencyBars: React.FC<{ data: ExerciseFrequencyPoint[] }> = ({ data }) => {
  const rows = data.slice(0, 8);
  const percentages = barPercentages(rows);
  return (
    <BarList>
      {rows.map((row, index) => (
        <BarRow key={row.x}>
          <BarLabel>{row.x}</BarLabel>
          <BarTrack><BarFill $pct={percentages[index]} $color={CHART_COLORS.arcticCyan} /></BarTrack>
          <BarValue>{row.y}x{row.sets ?? 0}sets</BarValue>
        </BarRow>
      ))}
    </BarList>
  );
};

export const AdminMovementPie: React.FC<{ data: CanonicalProgressCharts['movementPatternBalance'] } & SizeProps> = ({
  data,
  width,
  height = 180,
}) => (
  <VictoryPie
    data={data.map((row) => ({ x: row.x, y: row.y }))}
    colorScale={FULL_PALETTE}
    innerRadius={35}
    padAngle={2}
    height={height}
    {...(width ? { width } : {})}
    {...movementPatternLabelProps}
    labels={({ datum }) => datum.x}
  />
);

export const AdminMuscleBars: React.FC<{ data: CanonicalProgressCharts['muscleGroupBalance'] }> = ({ data }) => {
  const percentages = barPercentages(data);
  return (
    <BarList>
      {data.map((row, index) => (
        <BarRow key={row.x}>
          <BarLabel>{row.x}</BarLabel>
          <BarTrack><BarFill $pct={percentages[index]} $color={CHART_COLORS.gildedFern} /></BarTrack>
          <BarValue>{Math.round(row.y).toLocaleString()}</BarValue>
        </BarRow>
      ))}
    </BarList>
  );
};

export const AdminRecoveryBars: React.FC<{ data: RecoverySignalPoint[] }> = ({ data }) => (
  <BarList>
    {data.slice(0, 6).map((row) => {
      const painFlags = row.painFlags ?? 0;
      const highRpeFlags = row.highRpeFlags ?? 0;
      const totalSets = Math.max(row.totalSets ?? 1, 1);
      const riskPct = Math.min(((painFlags + highRpeFlags) / totalSets) * 100, 100);
      return (
        <BarRow key={row.x}>
          <BarLabel><RecoveryIcon size={11} />{row.x}</BarLabel>
          <BarTrack><BarFill $pct={riskPct} $color={CHART_COLORS.crimsonFrost} /></BarTrack>
          <BarValue>
            {painFlags > 0 ? `${painFlags} pain` : ''}
            {painFlags > 0 && highRpeFlags > 0 ? ' / ' : ''}
            {highRpeFlags > 0 ? `${highRpeFlags} redline` : ''}
          </BarValue>
        </BarRow>
      );
    })}
  </BarList>
);
