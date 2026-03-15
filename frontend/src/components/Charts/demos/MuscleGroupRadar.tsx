/**
 * Chart 3: Muscle Group Balance — Radar Chart
 * Shows training distribution across major muscle groups.
 */
import React from 'react';
import { ResponsiveRadar } from '@nivo/radar';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle,
  ChartContainer, nivoCrystallineTheme,
  NIVO_MOTION, CHART_COLORS,
} from '../chartTheme';

const demoData = [
  { group: 'Chest',     sets: 18, target: 20 },
  { group: 'Back',      sets: 22, target: 20 },
  { group: 'Shoulders', sets: 14, target: 16 },
  { group: 'Arms',      sets: 16, target: 14 },
  { group: 'Core',      sets: 10, target: 16 },
  { group: 'Legs',      sets: 24, target: 24 },
  { group: 'Glutes',    sets: 12, target: 16 },
];

const MuscleGroupRadar: React.FC = () => (
  <ChartCard $delay={160} role="region" aria-label="Radar chart showing muscle group training balance" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Muscle Balance</ChartTitle>
        <ChartSubtitle>Sets per muscle group vs targets</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <ResponsiveRadar
        data={demoData}
        keys={['sets', 'target']}
        indexBy="group"
        theme={nivoCrystallineTheme}
        animate
        motionConfig={NIVO_MOTION}
        margin={{ top: 40, right: 60, bottom: 40, left: 60 }}
        curve="linearClosed"
        gridShape="circular"
        gridLevels={5}
        gridLabelOffset={16}
        dotSize={6}
        dotColor={CHART_COLORS.midnightSapphire}
        dotBorderWidth={2}
        dotBorderColor={CHART_COLORS.wingPurple}
        colors={[CHART_COLORS.wingPurple, CHART_COLORS.iceWing]}
        fillOpacity={0.25}
        borderWidth={2}
        borderColor={CHART_COLORS.wingPurple}
        enableDotLabel={false}
        legends={[
          {
            anchor: 'top-right',
            direction: 'column',
            itemWidth: 60,
            itemHeight: 20,
            symbolSize: 10,
            symbolShape: 'circle',
          },
        ]}
      />
    </ChartContainer>
  </ChartCard>
);

export default MuscleGroupRadar;
