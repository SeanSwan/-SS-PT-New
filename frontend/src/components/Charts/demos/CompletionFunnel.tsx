/**
 * Chart 8: Workout Completion Rates — Funnel Chart
 * Shows drop-off from started → completed workouts.
 */
import React from 'react';
import { ResponsiveFunnel } from '@nivo/funnel';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle,
  ChartContainer, TooltipBox, nivoCrystallineTheme,
  NIVO_MOTION, CHART_COLORS,
} from '../chartTheme';

const demoData = [
  { id: 'Scheduled',   value: 48, label: 'Scheduled' },
  { id: 'Started',     value: 42, label: 'Started' },
  { id: 'Halfway',     value: 38, label: '50%+ Done' },
  { id: 'Completed',   value: 35, label: 'Completed' },
  { id: 'Logged',      value: 30, label: 'Fully Logged' },
];

const CompletionFunnel: React.FC = () => (
  <ChartCard $delay={560} role="region" aria-label="Funnel chart showing workout completion rates" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Completion Funnel</ChartTitle>
        <ChartSubtitle>Scheduled → Fully Logged</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <ResponsiveFunnel
        data={demoData}
        theme={nivoCrystallineTheme}
        animate
        motionConfig={NIVO_MOTION}
        margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
        shapeBlending={0.8}
        colors={[
          CHART_COLORS.gildedFern,
          CHART_COLORS.arcticCyan,
          CHART_COLORS.iceWing,
          CHART_COLORS.swanLavender,
          CHART_COLORS.wingPurple,
        ]}
        borderWidth={0}
        labelColor={CHART_COLORS.frostWhite}
        enableBeforeSeparators={false}
        enableAfterSeparators={false}
        currentPartSizeExtension={10}
        currentBorderWidth={0}
        tooltip={({ part }) => (
          <TooltipBox>
            {part.data.label}
            <strong>{part.data.value} workouts</strong>
          </TooltipBox>
        )}
      />
    </ChartContainer>
  </ChartCard>
);

export default CompletionFunnel;
