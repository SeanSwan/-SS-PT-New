import {
  CHART_COLORS,
  FULL_PALETTE,
  hexAlpha,
} from '../../../../Charts/chartTheme';

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

export const setsBarProps = {
  style: { data: { fill: CHART_COLORS.arcticCyan } },
};

export const repsBarProps = {
  style: { data: { fill: CHART_COLORS.gildedFern } },
};

export const durationLineProps = {
  style: { data: { stroke: CHART_COLORS.iceWing, strokeWidth: 2 } },
};

export const intensityLineProps = {
  style: { data: { stroke: CHART_COLORS.wingPurple, strokeWidth: 2 } },
};

export const movementPatternLabelProps = {
  style: {
    labels: {
      fill: CHART_COLORS.textSecondary,
      fontFamily: "'Fira Code', monospace",
      fontSize: 9,
    },
  },
};

export const getAnchorLineProps = (index: number) => ({
  style: {
    data: {
      stroke: FULL_PALETTE[index % FULL_PALETTE.length],
      strokeWidth: 2,
    },
  },
});

export const selectSetsRepsPulseSource = (
  bundle: { sets: { x: string; y: number }[]; reps: { x: string; y: number }[] },
) => (
  bundle.reps.length > 0
    ? { label: 'Rep Pulse', points: bundle.reps, unit: 'reps' }
    : { label: 'Set Pulse', points: bundle.sets, unit: 'sets' }
);

export const summaryForRows = (title: string, rowCount: number) => (
  `Showing ${rowCount} verified ${title} point${rowCount === 1 ? '' : 's'} for this client.`
);

export type ExerciseFrequencyPoint = {
  x: string;
  y: number;
  sets?: number;
};

export type RecoverySignalPoint = {
  x: string;
  painFlags?: number;
  highRpeFlags?: number;
  totalSets?: number;
};
