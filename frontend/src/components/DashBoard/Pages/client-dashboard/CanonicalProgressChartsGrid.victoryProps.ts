/**
 * COMPONENT: CanonicalProgressChartsGrid.victoryProps
 * OWNER: Client Dashboard / Progress
 * PURPOSE: Shared Victory style props for the canonical 15-chart grid.
 */

import {
  CHART_COLORS,
  hexAlpha,
  SWAN_CHART_PALETTE,
  type LensChartPalette,
} from '../../../Charts/chartTheme';

/**
 * Lens-seamed series props (Lens v2 bridge): the primary/secondary data
 * series follow the active lens palette. hexAlpha only accepts 6-digit
 * hex, so alpha fills fall back to the Swan hex when a resolved token is
 * not hex-shaped (fail-closed to brand color).
 */
export const buildSeamedVictoryProps = (palette: LensChartPalette) => {
  const secondaryFill = /^#[0-9a-fA-F]{6}$/.test(palette.secondary)
    ? hexAlpha(palette.secondary, 0.3)
    : hexAlpha(CHART_COLORS.wingPurple, 0.3);
  return {
    workoutFrequencyBarProps: { style: { data: { fill: palette.primary } } },
    weeklyVolumeAreaProps: {
      style: { data: { fill: secondaryFill, stroke: palette.secondary, strokeWidth: 2 } },
    },
    durationLineProps: { style: { data: { stroke: palette.primary, strokeWidth: 2 } } },
    durationScatterProps: { size: 5, style: { data: { fill: palette.primary, cursor: 'pointer' } } },
    intensityLineProps: { style: { data: { stroke: palette.secondary, strokeWidth: 2 } } },
  };
};

export type SeamedVictoryProps = ReturnType<typeof buildSeamedVictoryProps>;

// Swan-default builds: identical to the pre-bridge literals by
// construction (locked by CanonicalProgressChartsGrid.victoryProps.test).
const swanSeamed = buildSeamedVictoryProps(SWAN_CHART_PALETTE);
export const workoutFrequencyBarProps = swanSeamed.workoutFrequencyBarProps;
export const weeklyVolumeAreaProps = swanSeamed.weeklyVolumeAreaProps;
export const durationLineProps = swanSeamed.durationLineProps;
export const durationScatterProps = swanSeamed.durationScatterProps;
export const intensityLineProps = swanSeamed.intensityLineProps;

export const setsRepsLegendProps = {
  style: { labels: { fill: CHART_COLORS.textSecondary, fontSize: 10 } },
};

/* Sets/reps keep DATA-ONLY palette colors (Arctic Cyan / Gilded Fern) —
   deliberately unseamed so multi-series charts stay distinguishable. */
export const setsBarProps = {
  style: { data: { fill: CHART_COLORS.arcticCyan } },
};

export const repsBarProps = {
  style: { data: { fill: CHART_COLORS.gildedFern } },
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
