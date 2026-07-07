/**
 * COMPONENT: AdminProgressChartsGrid.detailCards
 * PURPOSE: Detail/admin coaching readouts for client progress charts - each
 *          card is a C11 environment with a truthful facts rail (top item,
 *          share, totals) above its visual, never a bare list. Every card
 *          carries a ChartExpandTrigger drill-down (PNG/copy only - the staff
 *          grid never mounts the feed share opt-in).
 */

import React from 'react';
import { Award, BarChart3, Dumbbell, HeartPulse, Percent, Scale, Target, TrendingUp as TrendIcon, Trophy } from 'lucide-react';
import type { CanonicalProgressCharts } from '../../../../../hooks/analytics/useAdminClientProgressCharts';
import {
  buildAnchorFacts,
  buildCategoryFacts,
  buildPrFacts,
  buildRecoveryFacts,
  buildSeriesFacts,
} from '../../../progress-proof/progressChartFacts';
import ProgressChartInsightBar from '../../../progress-proof/ProgressChartInsightBar';
import ChartExpandTrigger from '../../../progress-proof/ChartExpandTrigger';
import {
  isProgressChartVisible,
  type ProgressChartLensId,
} from '../../../progress-proof/progressChartLens';
import { CHART_COLORS } from '../../../../Charts/chartTheme';
import { buildPrDrilldownRows } from '../../../Pages/client-dashboard/CanonicalProgressChartsGrid.prBars';
import {
  buildAnchorLiftRows,
  buildExerciseFrequencyRows,
  buildNamedValueRows,
  buildRecoverySignalRows,
  buildUnitSeriesRows,
} from '../../../Pages/client-dashboard/CanonicalProgressChartsGrid.expandRows';
import {
  AdminAnchorChart,
  AdminFrequencyBars,
  AdminMovementPie,
  AdminMuscleBars,
  AdminPrBars,
  AdminRecoveryBars,
  AdminTrendLine,
} from './AdminProgressChartsGrid.detailBars';
import { EmptyState } from './AdminProgressChartsGrid.primaryCards';
import type { ExerciseFrequencyPoint, RecoverySignalPoint } from './AdminProgressChartsGrid.chartConfig';
import { Card, CardBody, CardHeader, CardTitle, ChartStack } from './AdminProgressChartsGrid.styles';

interface AdminProgressDetailCardsProps {
  charts: CanonicalProgressCharts;
  activeLensId: ProgressChartLensId;
}

const anchorRowsInput = (bundle: CanonicalProgressCharts['anchorLifts']) =>
  bundle.exercises.map((name) => ({ exerciseName: name, points: bundle.data[name] || [] }));

export const AdminProgressDetailCards: React.FC<AdminProgressDetailCardsProps> = ({ charts, activeLensId }) => (
  <>
    {isProgressChartVisible(activeLensId, 'prTimeline') && <Card data-testid="admin-chart-prs">
      <CardHeader>
        <Trophy size={14} color={CHART_COLORS.gildedFern} />
        <CardTitle>PR Highlights</CardTitle>
        <ChartExpandTrigger
          title="PR Highlights"
          subtitle="Best verified lift per exercise"
          renderChart={() => <AdminPrBars data={charts.prTimeline} />}
          rows={buildPrDrilldownRows(charts.prTimeline)}
          facts={buildPrFacts(charts.prTimeline)}
        />
      </CardHeader>
      <CardBody>
        {charts.prTimeline.length === 0 ? <EmptyState lead="No PRs recorded yet" hint="Heaviest verified sets per lift will land here." /> : (
          <ChartStack>
            <ProgressChartInsightBar facts={buildPrFacts(charts.prTimeline)} />
            <AdminPrBars data={charts.prTimeline} />
          </ChartStack>
        )}
      </CardBody>
    </Card>}

    {isProgressChartVisible(activeLensId, 'anchorLifts') && <Card data-testid="admin-chart-anchorLifts">
      <CardHeader>
        <TrendIcon size={14} color={CHART_COLORS.iceWing} />
        <CardTitle>Anchor Lifts</CardTitle>
        <ChartExpandTrigger
          title="Anchor Lifts"
          subtitle="Heaviest set per day - most-repeated lifts"
          renderChart={(w, h) => <AdminAnchorChart bundle={charts.anchorLifts} width={w} height={h} />}
          rows={buildAnchorLiftRows(anchorRowsInput(charts.anchorLifts))}
          facts={buildAnchorFacts(charts.anchorLifts)}
        />
      </CardHeader>
      <CardBody>
        {charts.anchorLifts.exercises.length === 0 ? <EmptyState lead="No anchor lifts yet" hint="Your most-repeated lifts chart themselves here." /> : (
          <ChartStack>
            <ProgressChartInsightBar facts={buildAnchorFacts(charts.anchorLifts)} />
            <AdminAnchorChart bundle={charts.anchorLifts} />
          </ChartStack>
        )}
      </CardBody>
    </Card>}

    {isProgressChartVisible(activeLensId, 'exerciseFrequency') && <Card data-testid="admin-chart-exerciseFreq">
      <CardHeader>
        <Dumbbell size={14} color={CHART_COLORS.arcticCyan} />
        <CardTitle>Exercise Frequency</CardTitle>
        <ChartExpandTrigger
          title="Exercise Frequency"
          subtitle="Most-logged exercises for this client"
          renderChart={() => <AdminFrequencyBars data={charts.exerciseFrequency as ExerciseFrequencyPoint[]} />}
          rows={buildExerciseFrequencyRows(charts.exerciseFrequency as ExerciseFrequencyPoint[])}
          facts={buildCategoryFacts(charts.exerciseFrequency, { unit: 'logs', itemLabel: 'exercises' })}
        />
      </CardHeader>
      <CardBody>
        {charts.exerciseFrequency.length === 0 ? <EmptyState lead="No exercises logged yet" hint="Every logged exercise builds this ranking." /> : (
          <ChartStack>
            <ProgressChartInsightBar
              facts={buildCategoryFacts(charts.exerciseFrequency, { unit: 'logs', itemLabel: 'exercises' })}
            />
            <AdminFrequencyBars data={charts.exerciseFrequency as ExerciseFrequencyPoint[]} />
          </ChartStack>
        )}
      </CardBody>
    </Card>}

    {isProgressChartVisible(activeLensId, 'movementPatternBalance') && <Card data-testid="admin-chart-movementPattern">
      <CardHeader>
        <Target size={14} color={CHART_COLORS.iceWing} />
        <CardTitle>Movement Patterns</CardTitle>
        <ChartExpandTrigger
          title="Movement Patterns"
          subtitle="Training volume by movement pattern"
          renderChart={(w, h) => <AdminMovementPie data={charts.movementPatternBalance} width={w} height={h} />}
          rows={buildNamedValueRows(charts.movementPatternBalance, 'lbs')}
          facts={buildCategoryFacts(charts.movementPatternBalance, { unit: 'lbs', itemLabel: 'patterns' })}
        />
      </CardHeader>
      <CardBody>
        {charts.movementPatternBalance.length === 0 ? <EmptyState lead="No movement data yet" hint="Squat, hinge, push, pull balance appears after logging." /> : (
          <ChartStack>
            <ProgressChartInsightBar
              facts={buildCategoryFacts(charts.movementPatternBalance, { unit: 'lbs', itemLabel: 'patterns' })}
            />
            <AdminMovementPie data={charts.movementPatternBalance} />
          </ChartStack>
        )}
      </CardBody>
    </Card>}

    {isProgressChartVisible(activeLensId, 'muscleGroupBalance') && <Card data-testid="admin-chart-muscleGroup">
      <CardHeader>
        <BarChart3 size={14} color={CHART_COLORS.gildedFern} />
        <CardTitle>Muscle Group Volume</CardTitle>
        <ChartExpandTrigger
          title="Muscle Group Volume"
          subtitle="Training volume by muscle group"
          renderChart={() => <AdminMuscleBars data={charts.muscleGroupBalance} />}
          rows={buildNamedValueRows(charts.muscleGroupBalance, 'lbs')}
          facts={buildCategoryFacts(charts.muscleGroupBalance, { unit: 'lbs', itemLabel: 'groups' })}
        />
      </CardHeader>
      <CardBody>
        {charts.muscleGroupBalance.length === 0 ? <EmptyState lead="No muscle-group data yet" hint="Volume by muscle group builds as lifts are logged." /> : (
          <ChartStack>
            <ProgressChartInsightBar
              facts={buildCategoryFacts(charts.muscleGroupBalance, { unit: 'lbs', itemLabel: 'groups' })}
            />
            <AdminMuscleBars data={charts.muscleGroupBalance} />
          </ChartStack>
        )}
      </CardBody>
    </Card>}

    {isProgressChartVisible(activeLensId, 'weightTrend') && <Card data-testid="admin-chart-weightTrend">
      <CardHeader>
        <Scale size={14} color={CHART_COLORS.iceWing} />
        <CardTitle>Weight Trend</CardTitle>
        <ChartExpandTrigger
          title="Weight Trend"
          subtitle="Body weight from logged measurements"
          renderChart={(w, h) => <AdminTrendLine data={charts.weightTrend} color={CHART_COLORS.iceWing} width={w} height={h} />}
          rows={buildUnitSeriesRows(charts.weightTrend, 'lbs', 1)}
          facts={buildSeriesFacts(charts.weightTrend, { unit: 'lbs', pointsLabel: 'entries', decimals: 1 })}
        />
      </CardHeader>
      <CardBody>
        {charts.weightTrend.length === 0 ? <EmptyState lead="No weight entries yet" hint="Logged body measurements chart here." /> : (
          <ChartStack>
            <ProgressChartInsightBar facts={buildSeriesFacts(charts.weightTrend, { unit: 'lbs', pointsLabel: 'entries', decimals: 1 })} />
            <AdminTrendLine data={charts.weightTrend} color={CHART_COLORS.iceWing} />
          </ChartStack>
        )}
      </CardBody>
    </Card>}

    {isProgressChartVisible(activeLensId, 'bodyFatTrend') && <Card data-testid="admin-chart-bodyFatTrend">
      <CardHeader>
        <Percent size={14} color={CHART_COLORS.wingPurple} />
        <CardTitle>Body Fat Trend</CardTitle>
        <ChartExpandTrigger
          title="Body Fat Trend"
          subtitle="Body-fat percentage from logged measurements"
          renderChart={(w, h) => <AdminTrendLine data={charts.bodyFatTrend} color={CHART_COLORS.wingPurple} width={w} height={h} />}
          rows={buildUnitSeriesRows(charts.bodyFatTrend, '%', 1)}
          facts={buildSeriesFacts(charts.bodyFatTrend, { unit: '%', pointsLabel: 'entries', decimals: 1 })}
        />
      </CardHeader>
      <CardBody>
        {charts.bodyFatTrend.length === 0 ? <EmptyState lead="No body-fat entries yet" hint="Measurements with body-fat percentage appear here." /> : (
          <ChartStack>
            <ProgressChartInsightBar facts={buildSeriesFacts(charts.bodyFatTrend, { unit: '%', pointsLabel: 'entries', decimals: 1 })} />
            <AdminTrendLine data={charts.bodyFatTrend} color={CHART_COLORS.wingPurple} />
          </ChartStack>
        )}
      </CardBody>
    </Card>}

    {isProgressChartVisible(activeLensId, 'estOneRm') && <Card data-testid="admin-chart-estOneRm">
      <CardHeader>
        <Award size={14} color={CHART_COLORS.gildedFern} />
        <CardTitle>Est. 1RM {charts.estOneRm.exercise ? `- ${charts.estOneRm.exercise}` : ''}</CardTitle>
        <ChartExpandTrigger
          title="Est. 1RM Trend"
          subtitle="Weekly best Brzycki estimate for the top lift"
          renderChart={(w, h) => <AdminTrendLine data={charts.estOneRm.data} color={CHART_COLORS.gildedFern} width={w} height={h} />}
          rows={buildUnitSeriesRows(charts.estOneRm.data, 'lbs')}
          facts={buildSeriesFacts(charts.estOneRm.data, { unit: 'lbs', pointsLabel: 'wks' })}
        />
      </CardHeader>
      <CardBody>
        {charts.estOneRm.data.length === 0 ? <EmptyState lead="No strength estimate yet" hint="Weighted sets (1-15 reps) build the top-lift estimate." /> : (
          <ChartStack>
            <ProgressChartInsightBar facts={buildSeriesFacts(charts.estOneRm.data, { unit: 'lbs', pointsLabel: 'wks' })} />
            <AdminTrendLine data={charts.estOneRm.data} color={CHART_COLORS.gildedFern} />
          </ChartStack>
        )}
      </CardBody>
    </Card>}

    {isProgressChartVisible(activeLensId, 'recoverySignal') && <Card data-testid="admin-chart-recovery">
      <CardHeader>
        <HeartPulse size={14} color={CHART_COLORS.crimsonFrost} />
        <CardTitle>Recovery Signals</CardTitle>
        <ChartExpandTrigger
          title="Recovery Signals"
          subtitle="Exercises flagged by pain notes or redline sets"
          renderChart={() => <AdminRecoveryBars data={charts.recoverySignal as RecoverySignalPoint[]} />}
          rows={buildRecoverySignalRows(charts.recoverySignal as RecoverySignalPoint[])}
          facts={buildRecoveryFacts(charts.recoverySignal)}
        />
      </CardHeader>
      <CardBody>
        {charts.recoverySignal.length === 0 ? <EmptyState lead="No recovery flags" hint="Pain notes and redline RPE sets surface here for review." /> : (
          <ChartStack>
            <ProgressChartInsightBar facts={buildRecoveryFacts(charts.recoverySignal)} />
            <AdminRecoveryBars data={charts.recoverySignal as RecoverySignalPoint[]} />
          </ChartStack>
        )}
      </CardBody>
    </Card>}
  </>
);
