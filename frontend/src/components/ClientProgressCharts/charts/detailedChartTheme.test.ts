/**
 * TEST: detailedChartTheme — zero-visual-delta + seam contracts for the
 * /progress/detailed NASM charts.
 * Locks (1) the shared chrome equals the pre-extraction literals byte-for-
 * byte; (2) every seam builder at the Swan primary reproduces the exact
 * pre-slice literal objects; (3) a lens primary repaints only the seamed
 * slots; (4) the Swan default the provider falls back to IS Ice Wing, so
 * no-lens production renders are unchanged by construction; (5) the
 * /progress/detailed route wrapper actually wears the frame + provider.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SWAN_CHART_PALETTE } from '../../Charts/chartTheme';
import {
  buildCurrentAreaProps,
  buildVolumeAreaProps,
  buildWeightSeriesTheme,
  DETAILED_AXIS_STYLE,
  DETAILED_TOOLTIP_PROPS,
} from './detailedChartTheme';

const SWAN = SWAN_CHART_PALETTE.primary;

describe('detailedChartTheme — shared chrome equals the pre-extraction literals', () => {
  it('keeps the provider fallback on Ice Wing (zero-delta anchor)', () => {
    expect(SWAN).toBe('#60C0F0');
  });

  it('DETAILED_AXIS_STYLE matches the duplicated AXIS_STYLE literal (was ×7)', () => {
    expect(DETAILED_AXIS_STYLE).toEqual({
      axis: { stroke: 'rgba(96, 192, 240, 0.3)' },
      tickLabels: { fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" },
      grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
    });
  });

  it('DETAILED_TOOLTIP_PROPS matches the duplicated TOOLTIP_PROPS literal (was ×4)', () => {
    expect(DETAILED_TOOLTIP_PROPS).toEqual({
      flyoutStyle: { fill: '#141419', stroke: 'rgba(139, 92, 246, 0.3)', strokeWidth: 1 },
      style: { fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" },
    });
  });
});

describe('seam builders — Swan build equals the pre-slice literals', () => {
  it('buildWeightSeriesTheme(Swan) reproduces WEIGHT_AXIS_PROPS + WEIGHT_AREA_PROPS', () => {
    const { weightAxisProps, weightAreaProps } = buildWeightSeriesTheme(SWAN);
    expect(weightAxisProps).toEqual({
      style: {
        ...DETAILED_AXIS_STYLE,
        tickLabels: { ...DETAILED_AXIS_STYLE.tickLabels, fill: '#60C0F0' },
        axisLabel: { fill: '#60C0F0', fontSize: 12, fontFamily: "'Fira Code', monospace", padding: 40 },
      },
    });
    expect(weightAreaProps).toEqual({
      style: { data: { fill: 'url(#victoryBodyWeightGradient)', stroke: '#60C0F0', strokeWidth: 2 } },
    });
  });

  it('buildCurrentAreaProps(Swan) reproduces CURRENT_AREA_PROPS', () => {
    expect(buildCurrentAreaProps(SWAN)).toEqual({
      style: { data: { fill: '#60C0F0', fillOpacity: 0.25, stroke: '#60C0F0', strokeWidth: 2 } },
    });
  });

  it('buildVolumeAreaProps(Swan) reproduces AREA_PROPS', () => {
    expect(buildVolumeAreaProps(SWAN)).toEqual({
      style: { data: { fill: 'url(#victoryVolumeGradient)', stroke: '#60C0F0', strokeWidth: 2 } },
    });
  });

  it('a lens primary repaints only the seamed slots', () => {
    const lens = buildWeightSeriesTheme('#ff7a45');
    expect(lens.weightAxisProps.style.tickLabels.fill).toBe('#ff7a45');
    expect(lens.weightAreaProps.style.data.stroke).toBe('#ff7a45');
    // Chrome stays Swan-fixed: the base axis stroke is untouched by the seam.
    expect(lens.weightAxisProps.style.axis).toEqual(DETAILED_AXIS_STYLE.axis);
    expect(buildCurrentAreaProps('#ff7a45').style.data.fill).toBe('#ff7a45');
    expect(buildVolumeAreaProps('#ff7a45').style.data.stroke).toBe('#ff7a45');
  });
});

describe('route wrapper wears the lens bridge (source contract)', () => {
  it('ClientProgressWrapper composes frame > provider > NASMProgressCharts', () => {
    const source = readFileSync(
      resolve(__dirname, '../../DashBoard/UniversalDashboardLayout.routeComponents.tsx'),
      'utf8',
    );
    const frameAt = source.indexOf('<ClientProgressLensFrame>');
    const providerAt = source.indexOf('<LensChartPaletteProvider>');
    const chartsAt = source.indexOf('<NASMProgressCharts clientId={clientId} />');
    expect(frameAt).toBeGreaterThan(-1);
    expect(providerAt).toBeGreaterThan(frameAt);
    expect(chartsAt).toBeGreaterThan(providerAt);
  });
});
