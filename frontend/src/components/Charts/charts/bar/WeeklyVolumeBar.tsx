import React from 'react';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, victoryTheme, VICTORY_ANIMATE } from '../../chartTheme';

const DEMO_DATA = [
  { x: 'Wk 1', y: 12200 }, { x: 'Wk 2', y: 13500 },
  { x: 'Wk 3', y: 14100 }, { x: 'Wk 4', y: 13800 },
  { x: 'Wk 5', y: 15200 }, { x: 'Wk 6', y: 16400 },
  { x: 'Wk 7', y: 17100 }, { x: 'Wk 8', y: 18000 },
];

interface Props { data?: Array<{ x: string; y: number }>; }

const WeeklyVolumeBar: React.FC<Props> = ({ data }) => {
  const chartData = data && data.length > 0 ? data : DEMO_DATA;
  const isDemo = !data || data.length === 0;

  return (
  <ChartCard role="region" aria-labelledby="weekly-vol-title">
    <ChartHeader>
      <div>
        <ChartTitle id="weekly-vol-title">Weekly Volume{isDemo ? ' (Preview)' : ''}</ChartTitle>
        <ChartSubtitle>Total volume per week (sets x reps x weight)</ChartSubtitle>
      </div>
    </ChartHeader>
    {/* Screen-reader-only data table (AI Village Phase 3 consensus) */}
    <div style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
      <table>
        <caption>Weekly Volume Data</caption>
        <tbody>
          {chartData.map((d, i) => (
            <tr key={i}><td>{d.x}</td><td>{d.y} pounds</td></tr>
          ))}
        </tbody>
      </table>
    </div>
    <ChartContainer>
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
          style={{ data: { fill: CHART_COLORS.arcticCyan, opacity: isDemo ? 0.5 : 1 } }}
          cornerRadius={{ top: 4 }}
          labels={({ datum }: { datum: { y: number } }) => `${(datum.y / 1000).toFixed(1)}k lbs`}
          labelComponent={<VictoryTooltip />}
        />
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
  );
};

export default React.memo(WeeklyVolumeBar);
