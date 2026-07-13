/**
 * FILE: detailedChartTheme.ts
 * OWNER: ClientProgressCharts (/progress/detailed NASM analytics)
 * PURPOSE: Single source for the Victory axis/tooltip chrome that was
 * duplicated verbatim across the NASM chart files (AXIS_STYLE ×7 identical,
 * TOOLTIP_PROPS ×4 identical — hash-verified before extraction).
 * The color strings are preserved BYTE-EXACTLY (rgba forms included):
 * Victory hands them straight to SVG presentation attributes, and the
 * zero-visual-delta contract tests compare prop objects by value.
 * Chrome (axis/grid/tooltip) is Swan-fixed — only series-identity colors
 * seam through the lens palette (see useLensChartPalette in each chart).
 * Ice Wing rgb = 96,192,240 · Wing Purple rgb = 139,92,246 (Active Palette).
 */

export const DETAILED_AXIS_STYLE = {
  axis: { stroke: 'rgba(96, 192, 240, 0.3)' },
  tickLabels: {
    fill: '#E0ECF4',
    fontSize: 11,
    fontFamily: "'Fira Code', monospace",
  },
  grid: {
    stroke: 'rgba(96, 192, 240, 0.08)',
    strokeDasharray: '4,4',
  },
} as const;

export const DETAILED_TOOLTIP_PROPS = {
  flyoutStyle: {
    fill: '#141419',
    stroke: 'rgba(139, 92, 246, 0.3)',
    strokeWidth: 1,
  },
  style: {
    fill: '#E0ECF4',
    fontSize: 11,
    fontFamily: "'Fira Code', monospace",
  },
} as const;

/**
 * Primary-series builders (Lens v2 seam). Each takes the resolved lens
 * primary (Swan Ice Wing #60C0F0 by default via useLensChartPalette) and
 * returns the SAME objects the charts previously declared as literals —
 * zero visual delta at the Swan default is locked by the contract test.
 * Secondary/tertiary series (Wing Purple, Gilded Fern, Arctic Cyan) stay
 * Swan-fixed by doctrine and never route through these builders.
 */

/** BodyComposition: the weight series owns the left axis tint + area stroke. */
export const buildWeightSeriesTheme = (primary: string) => ({
  weightAxisProps: {
    style: {
      ...DETAILED_AXIS_STYLE,
      tickLabels: { ...DETAILED_AXIS_STYLE.tickLabels, fill: primary },
      axisLabel: {
        fill: primary,
        fontSize: 12,
        fontFamily: "'Fira Code', monospace",
        padding: 40,
      },
    },
  },
  weightAreaProps: {
    style: {
      data: {
        fill: 'url(#victoryBodyWeightGradient)',
        stroke: primary,
        strokeWidth: 2,
      },
    },
  },
});

/** MuscleGroupRadar: the current-period polygon is the primary series. */
export const buildCurrentAreaProps = (primary: string) => ({
  style: {
    data: {
      fill: primary,
      fillOpacity: 0.25,
      stroke: primary,
      strokeWidth: 2,
    },
  },
});

/** VolumeOverTime: the volume area stroke is the primary series. */
export const buildVolumeAreaProps = (primary: string) => ({
  style: {
    data: {
      fill: 'url(#victoryVolumeGradient)',
      stroke: primary,
      strokeWidth: 2,
    },
  },
});
