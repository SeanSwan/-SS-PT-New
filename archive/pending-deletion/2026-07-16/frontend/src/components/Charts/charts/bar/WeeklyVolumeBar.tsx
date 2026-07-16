import React from 'react';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import styled from 'styled-components';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, victoryTheme, VICTORY_ANIMATE } from '../../chartTheme';

interface Props { data?: Array<{ x: string; y: number }>; }

const SrOnly = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const EmptyVolumeState = styled.div`
  min-height: 190px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 1rem;
  border: 1px solid var(--chart-empty-border, rgba(96, 192, 240, 0.2));
  border-radius: 14px;
  background:
    linear-gradient(
      145deg,
      var(--chart-empty-bg-start, rgba(0, 48, 128, 0.26)),
      var(--chart-empty-bg-end, rgba(10, 10, 15, 0.42))
    );
`;

const EmptyVolumeCopy = styled.p`
  max-width: 32ch;
  margin: 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.86rem;
  line-height: 1.55;
  color: var(--text-secondary, #A0C8E8);
`;

const WeeklyVolumeBar: React.FC<Props> = ({ data }) => {
  const chartData = Array.isArray(data) ? data.filter((point) => (
    point &&
    typeof point.x === 'string' &&
    point.x.length > 0 &&
    Number.isFinite(point.y)
  )) : [];
  const hasData = chartData.length > 0;

  return (
  <ChartCard role="region" aria-labelledby="weekly-vol-title">
    <ChartHeader>
      <div>
        <ChartTitle id="weekly-vol-title">Weekly Volume</ChartTitle>
        <ChartSubtitle>Total volume per week (sets x reps x weight)</ChartSubtitle>
      </div>
    </ChartHeader>
    <SrOnly>
      {hasData ? (
        <table>
          <caption>Weekly Volume Data</caption>
          <tbody>
            {chartData.map((d) => (
              <tr key={d.x}><td>{d.x}</td><td>{d.y} pounds</td></tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No verified weekly volume data is available yet.</p>
      )}
    </SrOnly>
    <ChartContainer>
      {hasData ? (
        <VictoryChart
          theme={victoryTheme}
          animate={VICTORY_ANIMATE}
          containerComponent={<VictoryVoronoiContainer />}
          domainPadding={{ x: 20 }}
        >
          <VictoryAxis tickFormat={(t: string) => t} />
          <VictoryAxis dependentAxis tickFormat={(t: number) => `${(t / 1000).toFixed(0)}k`} />
          <VictoryBar
            data={chartData}
            style={{ data: { fill: CHART_COLORS.arcticCyan, opacity: 1 } }}
            cornerRadius={{ top: 4 }}
            labels={({ datum }: { datum: { y: number } }) => `${(datum.y / 1000).toFixed(1)}k lbs`}
            labelComponent={<VictoryTooltip />}
          />
        </VictoryChart>
      ) : (
        <EmptyVolumeState role="status" aria-live="polite">
          <EmptyVolumeCopy>
            Log workouts with sets, reps, and weight to unlock verified weekly volume.
          </EmptyVolumeCopy>
        </EmptyVolumeState>
      )}
    </ChartContainer>
  </ChartCard>
  );
};

export default React.memo(WeeklyVolumeBar);
