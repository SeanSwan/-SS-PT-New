import React from 'react';
import styled from 'styled-components';
import { VictoryAxis, VictoryChart, VictoryLine, VictoryScatter } from 'victory';
import type { PainSeverityTrend } from './painChartInsights';
import { victoryStyleProps } from '@/components/Charts/victoryStyleProps';

interface PainChartTrendFollowUpProps {
  severityTrend: PainSeverityTrend;
  reminders: string[];
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  margin-top: 14px;
`;

const Block = styled.div`
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  border-radius: 8px;
  background: var(--bg-panel-muted, rgba(10, 10, 15, 0.34));
  padding: 12px;
`;

const BlockTitle = styled.h5`
  margin: 0 0 8px;
  color: var(--text-primary, #E0ECF4);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0;
`;

const Summary = styled.p`
  margin: 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 12px;
  line-height: 1.45;
`;

const TrendGraphic = styled.div`
  min-height: 84px;
  margin-top: 8px;
`;

const PointLabels = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(28px, 1fr);
  gap: 6px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.62));
  font-size: 10px;
`;

const ReminderList = styled.ul`
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 16px;
  color: var(--text-primary, #E0ECF4);
  font-size: 12px;
  line-height: 1.45;
`;

// Slice 4 (B11): the chart used to hide ALL axes — no dates, no scale, just
// a floating line. Axes are now visible: dated x ticks, 0–10 y scale.
const visibleAxisStyle = {
  axis: { stroke: 'var(--border-soft, rgba(96, 192, 240, 0.25))' },
  ticks: { stroke: 'var(--border-soft, rgba(96, 192, 240, 0.25))', size: 3 },
  tickLabels: { fill: 'var(--text-secondary, rgba(224, 236, 244, 0.62))', fontSize: 7 },
  grid: { stroke: 'transparent' },
};

const PainChartTrendFollowUp: React.FC<PainChartTrendFollowUpProps> = ({ severityTrend, reminders }) => {
  const data = severityTrend.points.map((point, index) => ({ x: index + 1, y: point.painLevel, dateLabel: point.label }));
  const hasTrendLine = severityTrend.points.length >= 2;

  return (
    <Grid>
      <Block>
        <BlockTitle>Severity Trend{severityTrend.points[0]?.regionLabel ? ` — ${severityTrend.points[0].regionLabel}` : ''}</BlockTitle>
        <Summary>{severityTrend.summary}</Summary>
        {/* A single point is not a trend — the line only renders at >=2
            points of the SAME region series (B11). */}
        {hasTrendLine && (
          <TrendGraphic role="img" aria-label={`Pain severity trend: ${severityTrend.summary}`}>
            <VictoryChart height={92} padding={{ top: 8, right: 10, bottom: 22, left: 24 }} domain={{ y: [0, 10] }}>
              <VictoryAxis
                tickValues={data.map((d) => d.x)}
                tickFormat={(x: number) => data[x - 1]?.dateLabel ?? ''}
                {...victoryStyleProps(visibleAxisStyle)}
              />
              <VictoryAxis dependentAxis tickValues={[0, 5, 10]} {...victoryStyleProps(visibleAxisStyle)} />
              <VictoryLine data={data} interpolation="monotoneX" {...victoryStyleProps({ data: { stroke: 'var(--data-accent, #50A0F0)', strokeWidth: 3 } })} />
              <VictoryScatter data={data} size={3} {...victoryStyleProps({ data: { fill: 'var(--data-accent, #50A0F0)' } })} />
            </VictoryChart>
            <PointLabels aria-hidden="true">
              {severityTrend.points.map((point) => <span key={`${point.id}-label`}>{point.painLevel}/10</span>)}
            </PointLabels>
          </TrendGraphic>
        )}
      </Block>
      <Block>
        <BlockTitle>Follow-up</BlockTitle>
        {reminders.length > 0 ? (
          <ReminderList>{reminders.map((reminder) => <li key={reminder}>{reminder}</li>)}</ReminderList>
        ) : (
          <Summary>No follow-up reminders from current entries.</Summary>
        )}
      </Block>
    </Grid>
  );
};

export default PainChartTrendFollowUp;