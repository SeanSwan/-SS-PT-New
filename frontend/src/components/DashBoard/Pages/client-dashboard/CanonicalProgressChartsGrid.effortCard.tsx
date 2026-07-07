/**
 * CanonicalProgressChartsGrid.effortCard.tsx — the Effort Trend (RPE) card
 * ==========================================================================
 * Extracted from primaryCards during the Phase-4b drill-down sweep (Rule 4:
 * the trigger wiring pushed primaryCards past the 300-line cap). Re-exported
 * from primaryCards so consumers are untouched.
 */
import React from 'react';
import {
  VictoryAxis,
  VictoryChart,
  VictoryLine,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';
import { Flame } from 'lucide-react';
import type { CanonicalProgressCharts } from '../../../../hooks/analytics/useClientProgressCharts';
import { CHART_COLORS, victoryTheme } from '../../../Charts/chartTheme';
import {
  buildSeriesFacts,
  describeIntensitySource,
} from '../../progress-proof/progressChartFacts';
import ProgressChartInsightBar from '../../progress-proof/ProgressChartInsightBar';
import ChartExpandTrigger from '../../progress-proof/ChartExpandTrigger';
import { buildUnitSeriesRows } from './CanonicalProgressChartsGrid.expandRows';
import { EmptyCard } from './CanonicalProgressChartsGrid.primitives';
import { intensityLineProps } from './CanonicalProgressChartsGrid.victoryProps';
import {
  CardHeader,
  CardIcon,
  CardSubtitle,
  CardTitle,
  ChartBody,
  ChartCard,
} from './CanonicalProgressChartsGrid.styles';

export const IntensityRpeCard: React.FC<{
  data: CanonicalProgressCharts['intensityRpeTrend'];
}> = ({ data }) => {
  const renderIntensityChart = (width?: number, height = 200) => (
    <VictoryChart
      theme={victoryTheme as any}
      height={height}
      {...(width ? { width } : {})}
      padding={{ top: 16, bottom: 40, left: 40, right: 12 }}
      domain={{ y: [0, 10] }}
      containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
    >
      <VictoryAxis />
      <VictoryAxis dependentAxis />
      <VictoryLine
        data={data}
        {...intensityLineProps}
        labels={({ datum }) => `${datum.x}: ${datum.y} (${datum.source})`}
        labelComponent={<VictoryTooltip renderInPortal={false} />}
      />
    </VictoryChart>
  );
  const intensityFacts = [
    ...buildSeriesFacts(data, { decimals: 1, pointsLabel: 'wks' }),
    { id: 'source', label: 'Source', value: describeIntensitySource(data) },
  ];
  return (
    <ChartCard data-testid="chart-card-intensityRpeTrend">
      <CardHeader>
        <CardIcon $color={CHART_COLORS.wingPurple}><Flame size={16} /></CardIcon>
        <CardTitle>Effort Trend</CardTitle>
        <CardSubtitle>RPE / intensity</CardSubtitle>
        <ChartExpandTrigger
          canShareToFeed
          title="Effort Trend"
          subtitle="Weekly RPE / session intensity (1-10)"
          renderChart={renderIntensityChart}
          rows={buildUnitSeriesRows(data, '', 1)}
          facts={intensityFacts}
        />
      </CardHeader>
      <ChartBody>
        {data.length === 0 ? (
          <EmptyCard label="No intensity data yet" hint="Add RPE to sets, or rate the session intensity 1-10." />
        ) : (
          <>
            <ProgressChartInsightBar facts={intensityFacts} />
            {renderIntensityChart()}
          </>
        )}
      </ChartBody>
    </ChartCard>
  );
};

export default IntensityRpeCard;
