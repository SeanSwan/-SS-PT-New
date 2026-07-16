/**
 * COMPONENT: ProgressChartRecoveryObservatory
 * PURPOSE: Dense recovery/readiness environment from logged pain, RPE, and attendance data.
 */
import React, { useMemo } from 'react';
import { HeartPulse } from 'lucide-react';
import { VictoryAxis, VictoryBar, VictoryChart, VictoryLabel } from 'victory';
import type { CanonicalProgressCharts } from '../../../hooks/analytics/useClientProgressCharts.types';
import { buildRecoveryObservatoryModel } from './ProgressChartRecoveryObservatory.logic';
import {
  Body,
  ChartGraphic,
  Eyebrow,
  Header,
  MetricGrid,
  MetricLabel,
  MetricTile,
  MetricValue,
  Observatory,
  ScreenReaderList,
  StatusPill,
  Title,
  TitleBlock,
} from './ProgressChartRecoveryObservatory.styles';
import { victoryStyleProps } from '@/components/Charts/victoryStyleProps';

interface ProgressChartRecoveryObservatoryProps {
  charts: CanonicalProgressCharts;
}

const AXIS_STYLE = {
  axis: { stroke: 'none' },
  tickLabels: {
    fill: 'var(--text-primary, #E0ECF4)',
    fontFamily: "'Sora', sans-serif",
    fontSize: 11,
  },
  grid: { stroke: 'none' },
};

const HIDDEN_AXIS_STYLE = {
  axis: { stroke: 'none' },
  tickLabels: { fill: 'none' },
  grid: { stroke: 'none' },
};

const BAR_STYLE = {
  data: {
    fill: 'var(--accent-primary, #60C0F0)',
    opacity: 0.84,
  },
  labels: {
    fill: 'var(--text-primary, #E0ECF4)',
    fontFamily: "'Fira Code', monospace",
    fontSize: 10,
    fontWeight: 800,
  },
};

const ProgressChartRecoveryObservatory: React.FC<ProgressChartRecoveryObservatoryProps> = ({ charts }) => {
  const model = useMemo(() => buildRecoveryObservatoryModel(charts), [charts]);
  const chartData = model.bars.map((bar, index) => ({
    x: index + 1,
    y: bar.pct,
    label: `${bar.value}`,
    name: bar.label,
  }));

  return (
    <Observatory aria-label="Recovery Observatory" data-testid="progress-recovery-observatory">
      <Header>
        <TitleBlock>
          <Eyebrow>
            <HeartPulse size={14} />
            Recovery Observatory
          </Eyebrow>
          <Title>Pain, high-RPE, attendance, and readiness in one coaching lens</Title>
        </TitleBlock>
        <StatusPill $status={model.status}>{model.statusCopy}</StatusPill>
      </Header>
      <Body>
        <ChartGraphic aria-hidden="true">
          <VictoryChart
            horizontal
            height={232}
            width={520}
            domain={{ y: [0, 100] }}
            padding={{ top: 18, right: 42, bottom: 20, left: 118 }}
          >
            <VictoryAxis
              {...victoryStyleProps(AXIS_STYLE)}
              tickFormat={(_, index) => chartData[index]?.name ?? ''}
            />
            <VictoryAxis
              dependentAxis
              {...victoryStyleProps(HIDDEN_AXIS_STYLE)}
            />
            <VictoryBar
              data={chartData}
              {...victoryStyleProps(BAR_STYLE)}
              barWidth={18}
              cornerRadius={{ topLeft: 5, topRight: 5 }}
              labels={({ datum }) => datum.label}
              labelComponent={<VictoryLabel dx={6} />}
            />
          </VictoryChart>
        </ChartGraphic>
        <MetricGrid aria-label="Recovery Observatory metrics">
          <MetricTile>
            <MetricValue>{model.readinessScore}%</MetricValue>
            <MetricLabel>Readiness score</MetricLabel>
          </MetricTile>
          <MetricTile>
            <MetricValue>{model.totalFlags}</MetricValue>
            <MetricLabel>Total flags</MetricLabel>
          </MetricTile>
          <MetricTile>
            <MetricValue>{model.averageIntensity}/10</MetricValue>
            <MetricLabel>Average intensity</MetricLabel>
          </MetricTile>
          <MetricTile>
            <MetricValue>{model.totalSets}</MetricValue>
            <MetricLabel>Recovery sets tracked</MetricLabel>
          </MetricTile>
        </MetricGrid>
      </Body>
      <ScreenReaderList>
        {model.bars.map((bar) => (
          <li key={bar.label}>{bar.label}: {bar.value}</li>
        ))}
        <li>{model.statusCopy}</li>
      </ScreenReaderList>
    </Observatory>
  );
};

export default React.memo(ProgressChartRecoveryObservatory);
