/**
 * ============================================================================
 * FILE: MeasurementEntryProgressCharts.tsx
 * PURPOSE: Progress-at-a-glance Victory charts for body measurements.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Renders the hero metric cards, trend chart, radar chart, and measurement
 * summary used by the active admin/trainer biometrics surface.
 *
 * HOW IT FITS IN THE APP:
 * MeasurementEntry owns data loading and passes prepared chart datasets here.
 */

import { Activity, Ruler, Scale } from 'lucide-react';
import {
  VictoryArea,
  VictoryAxis,
  VictoryChart,
  VictoryLegend,
  VictoryLine,
  VictoryPolarAxis,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';
import {
  BODY_FAT_LINE_STYLE,
  CHART_ANIMATION,
  CHART_AXIS_STYLE,
  DEPENDENT_AXIS_STYLE,
  LEGEND_STYLE,
  RADAR_AXIS_STYLE,
  RADAR_CURRENT_AREA_STYLE,
  RADAR_DEPENDENT_AXIS_STYLE,
  RADAR_FIRST_AREA_STYLE,
  TREND_CHART_PADDING,
  VICTORY_TOOLTIP_FLYOUT_STYLE,
  VICTORY_TOOLTIP_STYLE,
  WAIST_LINE_STYLE,
  WEIGHT_AREA_STYLE,
  victoryElement,
} from './MeasurementEntry.config';
import {
  AccentStat,
  BodyText,
  CenteredStatsRow,
  GlassPanel,
  SectionTitle,
} from './MeasurementEntry.baseStyles';
import {
  ChartRow,
  ChartTitle3D,
  ChartWrapper3D,
  HeroMetricCard,
  HeroMetricGrid,
  HeroMetricIcon,
  HeroMetricLabel,
  HeroMetricUnit,
  HeroMetricValue,
  ProgressGraphSection,
} from './MeasurementEntry.chartStyles';
import type { MeasurementStats, RadarDatum } from './MeasurementEntry.types';
import type { TrendDatum } from './MeasurementEntry.dataUtils';

interface MeasurementEntryProgressChartsProps {
  stats: MeasurementStats | null;
  trendData: TrendDatum[];
  radarData: RadarDatum[];
}

const EMPTY_VALUE = '\u2014';

const toFiniteStatNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const MeasurementEntryProgressCharts = ({
  stats,
  trendData,
  radarData,
}: MeasurementEntryProgressChartsProps) => {
  const totalMeasurements = toFiniteStatNumber(stats?.totalMeasurements);
  const daysSinceStart = toFiniteStatNumber(stats?.daysSinceStart);
  if (trendData.length < 2) return null;

  return (
    <ProgressGraphSection
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <GlassPanel>
        <SectionTitle>Progress at a Glance</SectionTitle>

        {stats?.totalChange && (
          <HeroMetricGrid>
            {[
              { label: 'Weight Change', value: stats.totalChange.weight, unit: 'lbs', Icon: Scale },
              { label: 'Body Fat Change', value: stats.totalChange.bodyFat, unit: '%', Icon: Activity },
              { label: 'Waist Change', value: stats.totalChange.waist, unit: 'in', Icon: Ruler },
            ].map(({ label, value, unit, Icon }) => {
              const numVal = toFiniteStatNumber(value);
              const isPositiveChange = numVal !== null && numVal < 0;
              return (
                <HeroMetricCard
                  key={label}
                  $positive={isPositiveChange}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <HeroMetricIcon $positive={isPositiveChange}>
                    <Icon size={18} />
                  </HeroMetricIcon>
                  <HeroMetricLabel>{label}</HeroMetricLabel>
                  <HeroMetricValue $positive={isPositiveChange}>
                    {numVal !== null ? (
                      <>
                        {numVal > 0 ? '+' : ''}{numVal.toFixed(1)}
                        <HeroMetricUnit>{unit}</HeroMetricUnit>
                      </>
                    ) : EMPTY_VALUE}
                  </HeroMetricValue>
                </HeroMetricCard>
              );
            })}
          </HeroMetricGrid>
        )}

        <ChartRow>
          <ChartWrapper3D>
            <div>
              <ChartTitle3D>Trend Over Time</ChartTitle3D>
              <VictoryChart
                height={300}
                padding={TREND_CHART_PADDING}
                animate={CHART_ANIMATION}
                containerComponent={
                  <VictoryVoronoiContainer
                    labels={({ datum }) => `${datum.date}\nWeight: ${datum.weight?.toFixed(1) ?? EMPTY_VALUE} lbs\nBody Fat: ${datum.bodyFat?.toFixed(1) ?? EMPTY_VALUE}%\nWaist: ${datum.waist?.toFixed(1) ?? EMPTY_VALUE} in`}
                    labelComponent={victoryElement(VictoryTooltip, {
                      flyoutStyle: VICTORY_TOOLTIP_FLYOUT_STYLE,
                      style: VICTORY_TOOLTIP_STYLE,
                      cornerRadius: 8,
                    })}
                  />
                }
              >
                {victoryElement(VictoryAxis, { style: CHART_AXIS_STYLE })}
                {victoryElement(VictoryAxis, { dependentAxis: true, label: 'lbs / in', style: DEPENDENT_AXIS_STYLE })}
                {victoryElement(VictoryArea, { data: trendData, x: 'date', y: 'weight', style: WEIGHT_AREA_STYLE })}
                {victoryElement(VictoryLine, { data: trendData, x: 'date', y: 'bodyFat', style: BODY_FAT_LINE_STYLE })}
                {victoryElement(VictoryLine, { data: trendData, x: 'date', y: 'waist', style: WAIST_LINE_STYLE })}
              </VictoryChart>
              {victoryElement(VictoryLegend, {
                orientation: 'horizontal',
                gutter: 20,
                height: 30,
                style: LEGEND_STYLE,
                colorScale: ['#8B5CF6', '#8B5CF6', '#4ECDC4'],
                data: [
                  { name: 'Weight (lbs)' },
                  { name: 'Body Fat (%)' },
                  { name: 'Waist (in)' },
                ],
              })}
            </div>
          </ChartWrapper3D>

          {radarData.length >= 3 && (
            <ChartWrapper3D>
              <div>
                <ChartTitle3D>Body Shape: First vs Now</ChartTitle3D>
                <VictoryChart polar height={300} animate={CHART_ANIMATION}>
                  {victoryElement(VictoryPolarAxis, {
                    tickValues: radarData.map((_, i) => i),
                    tickFormat: radarData.map((d) => d.metric),
                    style: RADAR_AXIS_STYLE,
                  })}
                  {victoryElement(VictoryPolarAxis, {
                    dependentAxis: true,
                    style: RADAR_DEPENDENT_AXIS_STYLE,
                  })}
                  {victoryElement(VictoryArea, {
                    data: radarData.map((d, i) => ({ x: i, y: d.first })),
                    style: RADAR_FIRST_AREA_STYLE,
                  })}
                  {victoryElement(VictoryArea, {
                    data: radarData.map((d, i) => ({ x: i, y: d.current })),
                    style: RADAR_CURRENT_AREA_STYLE,
                  })}
                </VictoryChart>
                {victoryElement(VictoryLegend, {
                  orientation: 'horizontal',
                  gutter: 20,
                  height: 30,
                  style: LEGEND_STYLE,
                  colorScale: ['#8B5CF6', '#50A0F0'],
                  data: [{ name: 'First' }, { name: 'Current' }],
                })}
              </div>
            </ChartWrapper3D>
          )}
        </ChartRow>

        {stats && (
          <CenteredStatsRow $gap={24} $centerWrap>
            <BodyText>
              <AccentStat>{totalMeasurements ?? EMPTY_VALUE}</AccentStat> measurements over{' '}
              <AccentStat>{daysSinceStart ?? EMPTY_VALUE}</AccentStat> days
            </BodyText>
          </CenteredStatsRow>
        )}
      </GlassPanel>
    </ProgressGraphSection>
  );
};

export default MeasurementEntryProgressCharts;
