/**
 * COMPONENT: AdminProgressChartsGrid.detailCards
 * PURPOSE: Detail/admin coaching readouts for client progress charts - each
 *          card is a C11 environment with a truthful facts rail (top item,
 *          share, totals) above its visual, never a bare list.
 */

import React from 'react';
import { BarChart3, Dumbbell, HeartPulse, Target, TrendingUp as TrendIcon, Trophy } from 'lucide-react';
import {
  VictoryAxis,
  VictoryChart,
  VictoryLine,
  VictoryPie,
  VictoryVoronoiContainer,
} from 'victory';
import type { CanonicalProgressCharts } from '../../../../../hooks/analytics/useAdminClientProgressCharts';
import {
  buildAnchorFacts,
  buildCategoryFacts,
  buildPrFacts,
  buildRecoveryFacts,
} from '../../../progress-proof/progressChartFacts';
import ProgressChartInsightBar from '../../../progress-proof/ProgressChartInsightBar';
import {
  isProgressChartVisible,
  type ProgressChartLensId,
} from '../../../progress-proof/progressChartLens';
import { CHART_COLORS, FULL_PALETTE, victoryTheme } from '../../../../Charts/chartTheme';
import {
  getAnchorLineProps,
  movementPatternLabelProps,
} from './AdminProgressChartsGrid.chartConfig';
import { EmptyState } from './AdminProgressChartsGrid.primaryCards';
import type {
  ExerciseFrequencyPoint,
  RecoverySignalPoint,
} from './AdminProgressChartsGrid.chartConfig';
import {
  BarFill,
  BarLabel,
  BarList,
  BarRow,
  BarTrack,
  BarValue,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ChartStack,
  RecoveryIcon,
} from './AdminProgressChartsGrid.styles';

interface AdminProgressDetailCardsProps {
  charts: CanonicalProgressCharts;
  activeLensId: ProgressChartLensId;
}

const anchorPadding = { top: 20, bottom: 36, left: 40, right: 8 };

const getBarPercentages = (points: { y: number }[]) => {
  const max = Math.max(...points.map((point) => point.y), 1);
  return points.map((point) => (point.y / max) * 100);
};

const getBestPrs = (points: CanonicalProgressCharts['prTimeline']) => {
  const bestByExercise = new Map<string, CanonicalProgressCharts['prTimeline'][number]>();
  for (const point of points) {
    const current = bestByExercise.get(point.exercise);
    if (!current || point.y > current.y) {
      bestByExercise.set(point.exercise, point);
    }
  }
  return Array.from(bestByExercise.values()).sort((a, b) => b.y - a.y).slice(0, 6);
};

export const AdminProgressDetailCards: React.FC<AdminProgressDetailCardsProps> = ({ charts, activeLensId }) => (
  <>
    {isProgressChartVisible(activeLensId, 'prTimeline') && <Card data-testid="admin-chart-prs">
      <CardHeader>
        <Trophy size={14} color={CHART_COLORS.gildedFern} />
        <CardTitle>PR Highlights</CardTitle>
      </CardHeader>
      <CardBody>
        {charts.prTimeline.length === 0 ? <EmptyState lead="No PRs recorded yet" hint="Heaviest verified sets per lift will land here." /> : (() => {
          const best = getBestPrs(charts.prTimeline);
          const percentages = getBarPercentages(best);
          return (
            <ChartStack>
              <ProgressChartInsightBar facts={buildPrFacts(charts.prTimeline)} />
              <BarList>
                {best.map((record, index) => (
                  <BarRow key={record.exercise}>
                    <BarLabel>{record.exercise}</BarLabel>
                    <BarTrack><BarFill $pct={percentages[index]} $color={CHART_COLORS.gildedFern} /></BarTrack>
                    <BarValue>{record.y}lbs x {record.reps}</BarValue>
                  </BarRow>
                ))}
              </BarList>
            </ChartStack>
          );
        })()}
      </CardBody>
    </Card>}

    {isProgressChartVisible(activeLensId, 'anchorLifts') && <Card data-testid="admin-chart-anchorLifts">
      <CardHeader>
        <TrendIcon size={14} color={CHART_COLORS.iceWing} />
        <CardTitle>Anchor Lifts</CardTitle>
      </CardHeader>
      <CardBody>
        {charts.anchorLifts.exercises.length === 0 ? <EmptyState lead="No anchor lifts yet" hint="Your most-repeated lifts chart themselves here." /> : (
          <ChartStack>
            <ProgressChartInsightBar facts={buildAnchorFacts(charts.anchorLifts)} />
            <VictoryChart
              theme={victoryTheme}
              height={180}
              padding={anchorPadding}
              containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
            >
              <VictoryAxis />
              <VictoryAxis dependentAxis />
              {charts.anchorLifts.exercises.map((name, index) => {
                const data = (charts.anchorLifts.data[name] || []).map((point) => ({ x: point.x, y: point.y }));
                return data.length > 0 ? <VictoryLine key={name} data={data} {...getAnchorLineProps(index)} /> : null;
              })}
            </VictoryChart>
          </ChartStack>
        )}
      </CardBody>
    </Card>}

    {isProgressChartVisible(activeLensId, 'exerciseFrequency') && <Card data-testid="admin-chart-exerciseFreq">
      <CardHeader>
        <Dumbbell size={14} color={CHART_COLORS.arcticCyan} />
        <CardTitle>Exercise Frequency</CardTitle>
      </CardHeader>
      <CardBody>
        {charts.exerciseFrequency.length === 0 ? <EmptyState lead="No exercises logged yet" hint="Every logged exercise builds this ranking." /> : (() => {
          const rows = charts.exerciseFrequency.slice(0, 8) as ExerciseFrequencyPoint[];
          const percentages = getBarPercentages(rows);
          return (
            <ChartStack>
              <ProgressChartInsightBar
                facts={buildCategoryFacts(charts.exerciseFrequency, { unit: 'logs', itemLabel: 'exercises' })}
              />
              <BarList>
                {rows.map((row, index) => (
                  <BarRow key={row.x}>
                    <BarLabel>{row.x}</BarLabel>
                    <BarTrack><BarFill $pct={percentages[index]} $color={CHART_COLORS.arcticCyan} /></BarTrack>
                    <BarValue>{row.y}x{row.sets ?? 0}sets</BarValue>
                  </BarRow>
                ))}
              </BarList>
            </ChartStack>
          );
        })()}
      </CardBody>
    </Card>}

    {isProgressChartVisible(activeLensId, 'movementPatternBalance') && <Card data-testid="admin-chart-movementPattern">
      <CardHeader>
        <Target size={14} color={CHART_COLORS.iceWing} />
        <CardTitle>Movement Patterns</CardTitle>
      </CardHeader>
      <CardBody>
        {charts.movementPatternBalance.length === 0 ? <EmptyState lead="No movement data yet" hint="Squat, hinge, push, pull balance appears after logging." /> : (
          <ChartStack>
            <ProgressChartInsightBar
              facts={buildCategoryFacts(charts.movementPatternBalance, { unit: 'lbs', itemLabel: 'patterns' })}
            />
            <VictoryPie
              data={charts.movementPatternBalance.map((row) => ({ x: row.x, y: row.y }))}
              colorScale={FULL_PALETTE}
              innerRadius={35}
              padAngle={2}
              height={180}
              {...movementPatternLabelProps}
              labels={({ datum }) => datum.x}
            />
          </ChartStack>
        )}
      </CardBody>
    </Card>}

    {isProgressChartVisible(activeLensId, 'muscleGroupBalance') && <Card data-testid="admin-chart-muscleGroup">
      <CardHeader>
        <BarChart3 size={14} color={CHART_COLORS.gildedFern} />
        <CardTitle>Muscle Group Volume</CardTitle>
      </CardHeader>
      <CardBody>
        {charts.muscleGroupBalance.length === 0 ? <EmptyState lead="No muscle-group data yet" hint="Volume by muscle group builds as lifts are logged." /> : (() => {
          const percentages = getBarPercentages(charts.muscleGroupBalance);
          return (
            <ChartStack>
              <ProgressChartInsightBar
                facts={buildCategoryFacts(charts.muscleGroupBalance, { unit: 'lbs', itemLabel: 'groups' })}
              />
              <BarList>
                {charts.muscleGroupBalance.map((row, index) => (
                  <BarRow key={row.x}>
                    <BarLabel>{row.x}</BarLabel>
                    <BarTrack><BarFill $pct={percentages[index]} $color={CHART_COLORS.gildedFern} /></BarTrack>
                    <BarValue>{Math.round(row.y).toLocaleString()}</BarValue>
                  </BarRow>
                ))}
              </BarList>
            </ChartStack>
          );
        })()}
      </CardBody>
    </Card>}

    {isProgressChartVisible(activeLensId, 'recoverySignal') && <Card data-testid="admin-chart-recovery">
      <CardHeader>
        <HeartPulse size={14} color={CHART_COLORS.crimsonFrost} />
        <CardTitle>Recovery Signals</CardTitle>
      </CardHeader>
      <CardBody>
        {charts.recoverySignal.length === 0 ? <EmptyState lead="No recovery flags" hint="Pain notes and redline RPE sets surface here for review." /> : (
          <ChartStack>
            <ProgressChartInsightBar facts={buildRecoveryFacts(charts.recoverySignal)} />
            <BarList>
              {(charts.recoverySignal.slice(0, 6) as RecoverySignalPoint[]).map((row) => {
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
          </ChartStack>
        )}
      </CardBody>
    </Card>}
  </>
);
