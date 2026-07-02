/**
 * COMPONENT: CanonicalProgressChartsGrid.victoryProps
 * OWNER: Client Dashboard / Progress
 * PURPOSE: Shared Victory style props for the canonical 12-chart grid.
 */

import { CHART_COLORS, hexAlpha } from '../../../Charts/chartTheme';

export const workoutFrequencyBarProps = {
  style: { data: { fill: CHART_COLORS.iceWing } },
};

export const weeklyVolumeAreaProps = {
  style: {
    data: {
      fill: hexAlpha(CHART_COLORS.wingPurple, 0.3),
      stroke: CHART_COLORS.wingPurple,
      strokeWidth: 2,
    },
  },
};

export const setsRepsLegendProps = {
  style: { labels: { fill: CHART_COLORS.textSecondary, fontSize: 10 } },
};

export const setsBarProps = {
  style: { data: { fill: CHART_COLORS.arcticCyan } },
};

export const repsBarProps = {
  style: { data: { fill: CHART_COLORS.gildedFern } },
};

export const durationLineProps = {
  style: { data: { stroke: CHART_COLORS.iceWing, strokeWidth: 2 } },
};

export const durationScatterProps = {
  size: 5,
  style: { data: { fill: CHART_COLORS.iceWing, cursor: 'pointer' } },
};

export const intensityLineProps = {
  style: { data: { stroke: CHART_COLORS.wingPurple, strokeWidth: 2 } },
};

export const anchorLegendProps = {
  style: { labels: { fill: CHART_COLORS.textSecondary, fontSize: 9 } },
};

export const lineStyleProps = (color: string) => ({
  style: { data: { stroke: color, strokeWidth: 2 } },
});

export const movementPieProps = {
  style: {
    labels: {
      fill: CHART_COLORS.textSecondary,
      fontFamily: "'Fira Code', monospace",
      fontSize: 9,
    },
  },
};
