/**
 * COMPONENT: AdminBodyCompPanel
 * PARENT: AdminProgressChartsGrid (Clients & Team -> Progress tab)
 * PURPOSE: Body-composition proof trio for the selected client - weight
 *          progression, body-fat trend, and 7-day macro split - sourced from
 *          the REAL body_measurements and daily_macro_logs endpoints that the
 *          coach surface never exposed before. C11 chart environments with
 *          truthful facts rails; honest empty guidance when nothing is logged.
 */

import React from 'react';
import { Droplets, Scale, UtensilsCrossed } from 'lucide-react';
import {
  VictoryArea,
  VictoryAxis,
  VictoryChart,
  VictoryLine,
  VictoryPie,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';
import {
  useAdminBodyCompCharts,
} from '../../../../../hooks/analytics/useAdminBodyCompCharts';
import type { ChartPoint } from '../../../../../hooks/analytics/useClientProgressCharts.types';
import {
  buildCategoryFacts,
  type ProgressChartFact,
} from '../../../progress-proof/progressChartFacts';
import ProgressChartInsightBar from '../../../progress-proof/ProgressChartInsightBar';
import { CHART_COLORS, FULL_PALETTE, hexAlpha, victoryTheme } from '../../../../Charts/chartTheme';
import { EmptyState } from './AdminProgressChartsGrid.primaryCards';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ChartStack,
  GridWrap,
  LoadingStrip,
  SummaryLine,
} from './AdminProgressChartsGrid.styles';

interface AdminBodyCompPanelProps {
  clientId: number;
}

const trendPadding = { top: 12, bottom: 36, left: 48, right: 8 };

const weightAreaProps = {
  style: {
    data: {
      fill: hexAlpha(CHART_COLORS.iceWing, 0.28),
      stroke: CHART_COLORS.iceWing,
      strokeWidth: 2,
    },
  },
};

const bodyFatLineProps = {
  style: { data: { stroke: CHART_COLORS.gildedFern, strokeWidth: 2 } },
};

const macroLabelProps = {
  style: {
    labels: {
      fill: CHART_COLORS.textSecondary,
      fontFamily: "'Fira Code', monospace",
      fontSize: 9,
    },
  },
};

export const buildDeltaFacts = (
  points: ChartPoint[],
  unit: string,
  decimals = 0,
): ProgressChartFact[] => {
  if (points.length === 0) return [];
  const first = points[0];
  const latest = points[points.length - 1];
  const delta = latest.y - first.y;
  const format = (value: number) => (
    value.toLocaleString(undefined, {
      maximumFractionDigits: decimals,
      minimumFractionDigits: 0,
    })
  );
  const change = points.length > 1
    ? `${delta > 0 ? '+' : ''}${format(delta)} ${unit}`.trim()
    : 'baseline set';

  return [
    { id: 'latest', label: 'Latest', value: `${format(latest.y)} ${unit}`.trim(), emphasis: 'accent' },
    { id: 'first', label: 'First', value: `${format(first.y)} ${unit}`.trim() },
    { id: 'change', label: 'Change', value: change, emphasis: 'gold' },
    { id: 'count', label: 'Entries', value: String(points.length) },
  ];
};

const AdminBodyCompPanel: React.FC<AdminBodyCompPanelProps> = ({ clientId }) => {
  const { charts, isLoading, nonEmptyCount } = useAdminBodyCompCharts(clientId);

  if (isLoading && nonEmptyCount === 0) {
    return <LoadingStrip>Loading body composition proof...</LoadingStrip>;
  }

  return (
    <section aria-label="Body composition proof" data-testid="admin-body-comp-panel">
      <SummaryLine>
        <Scale size={13} />
        <span>Body Composition - real measurements & macro logs</span>
      </SummaryLine>
      {nonEmptyCount === 0 ? (
        <EmptyState
          lead="No body measurements or macro logs yet"
          hint="Record measurements in Biometrics and log meals to unlock body-composition trends."
        />
      ) : (
        <GridWrap>
          <Card data-testid="admin-chart-weightProgression">
            <CardHeader>
              <Scale size={14} color={CHART_COLORS.iceWing} />
              <CardTitle>Weight Progression</CardTitle>
            </CardHeader>
            <CardBody>
              {charts.weightProgression.length === 0 ? (
                <EmptyState lead="No weigh-ins yet" hint="Weight entries in Biometrics chart themselves here." />
              ) : (
                <ChartStack>
                  <ProgressChartInsightBar facts={buildDeltaFacts(charts.weightProgression, 'lbs')} />
                  <VictoryChart
                    theme={victoryTheme}
                    height={180}
                    padding={trendPadding}
                    containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
                  >
                    <VictoryAxis />
                    <VictoryAxis dependentAxis />
                    <VictoryArea
                      data={charts.weightProgression}
                      {...weightAreaProps}
                      labels={({ datum }) => `${datum.x}: ${datum.y} lbs`}
                      labelComponent={<VictoryTooltip renderInPortal={false} />}
                    />
                  </VictoryChart>
                </ChartStack>
              )}
            </CardBody>
          </Card>

          <Card data-testid="admin-chart-bodyFatTrend">
            <CardHeader>
              <Droplets size={14} color={CHART_COLORS.gildedFern} />
              <CardTitle>Body Fat Trend</CardTitle>
            </CardHeader>
            <CardBody>
              {charts.bodyFatTrend.length === 0 ? (
                <EmptyState lead="No body-fat readings yet" hint="Body-fat percentages from measurements land here." />
              ) : (
                <ChartStack>
                  <ProgressChartInsightBar facts={buildDeltaFacts(charts.bodyFatTrend, '%', 1)} />
                  <VictoryChart
                    theme={victoryTheme}
                    height={180}
                    padding={trendPadding}
                    containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
                  >
                    <VictoryAxis />
                    <VictoryAxis dependentAxis />
                    <VictoryLine
                      data={charts.bodyFatTrend}
                      {...bodyFatLineProps}
                      labels={({ datum }) => `${datum.x}: ${datum.y}%`}
                      labelComponent={<VictoryTooltip renderInPortal={false} />}
                    />
                  </VictoryChart>
                </ChartStack>
              )}
            </CardBody>
          </Card>

          <Card data-testid="admin-chart-macroSplit">
            <CardHeader>
              <UtensilsCrossed size={14} color={CHART_COLORS.wingPurple} />
              <CardTitle>Macro Split (7 days)</CardTitle>
            </CardHeader>
            <CardBody>
              {charts.macroSplit.length === 0 ? (
                <EmptyState lead="No macro logs this week" hint="Logged meals build the protein, carb, and fat split." />
              ) : (
                <ChartStack>
                  <ProgressChartInsightBar
                    facts={buildCategoryFacts(charts.macroSplit, { unit: 'g', itemLabel: 'macros' })}
                  />
                  <VictoryPie
                    data={charts.macroSplit.map((row) => ({ x: row.x, y: row.y }))}
                    colorScale={FULL_PALETTE}
                    innerRadius={35}
                    padAngle={2}
                    height={180}
                    {...macroLabelProps}
                    labels={({ datum }) => datum.x}
                  />
                </ChartStack>
              )}
            </CardBody>
          </Card>
        </GridWrap>
      )}
    </section>
  );
};

export default React.memo(AdminBodyCompPanel);
