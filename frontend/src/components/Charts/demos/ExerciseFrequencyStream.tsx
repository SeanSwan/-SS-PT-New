/**
 * Chart 7: Exercise Frequency Trends — Stream Chart
 * Flowing visualization of how different exercises trend over time.
 */
import React from 'react';
import { ResponsiveStream } from '@nivo/stream';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle,
  ChartContainer, TooltipBox, nivoCrystallineTheme,
  NIVO_MOTION, STREAM_PALETTE, CHART_COLORS,
} from '../chartTheme';

const demoData = [
  { Squat: 12, Bench: 10, Deadlift: 8, OHP: 6, Row: 9 },
  { Squat: 14, Bench: 12, Deadlift: 10, OHP: 5, Row: 8 },
  { Squat: 10, Bench: 14, Deadlift: 12, OHP: 8, Row: 10 },
  { Squat: 16, Bench: 10, Deadlift: 14, OHP: 6, Row: 12 },
  { Squat: 14, Bench: 16, Deadlift: 10, OHP: 10, Row: 8 },
  { Squat: 18, Bench: 12, Deadlift: 16, OHP: 8, Row: 14 },
  { Squat: 16, Bench: 14, Deadlift: 12, OHP: 12, Row: 10 },
  { Squat: 20, Bench: 16, Deadlift: 18, OHP: 10, Row: 16 },
];

const ExerciseFrequencyStream: React.FC = () => (
  <ChartCard $span={2} $delay={480} role="region" aria-label="Stream chart showing exercise frequency trends" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Exercise Trends</ChartTitle>
        <ChartSubtitle>Frequency distribution over time</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <ResponsiveStream
        data={demoData}
        keys={['Squat', 'Bench', 'Deadlift', 'OHP', 'Row']}
        theme={nivoCrystallineTheme}
        animate
        motionConfig={NIVO_MOTION}
        margin={{ top: 10, right: 100, bottom: 40, left: 40 }}
        curve="basis"
        offsetType="silhouette"
        colors={STREAM_PALETTE}
        fillOpacity={0.7}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['brighter', 0.3]] }}
        enableGridX={false}
        axisBottom={{
          tickValues: 4,
          format: (v) => `W${Number(v) + 1}`,
        }}
        legends={[
          {
            anchor: 'bottom-right',
            direction: 'column',
            itemWidth: 70,
            itemHeight: 20,
            symbolSize: 10,
            symbolShape: 'circle',
            translateX: 90,
          },
        ]}
        stackTooltip={({ slice }) => (
          <TooltipBox>
            {slice.stack.map((layer) => (
              <div key={layer.layerLabel} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: layer.color, flexShrink: 0 }} />
                {layer.layerLabel}: <strong style={{ marginLeft: 4 }}>{layer.value}</strong>
              </div>
            ))}
          </TooltipBox>
        )}
      />
    </ChartContainer>
  </ChartCard>
);

export default ExerciseFrequencyStream;
