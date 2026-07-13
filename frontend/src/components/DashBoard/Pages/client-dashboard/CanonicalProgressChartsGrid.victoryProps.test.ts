/**
 * TEST: Lens v2 → Victory bridge contracts.
 * Locks (1) zero-visual-delta: the Swan-default build is byte-identical to
 * the pre-bridge literals; (2) the palette resolver reads --world tokens
 * from a host element and falls back to Swan without one; (3) sets/reps
 * stay on the DATA-ONLY palette (deliberately unseamed).
 */
import { describe, expect, it, vi } from 'vitest';
import {
  CHART_COLORS,
  hexAlpha,
  resolveLensChartPalette,
  SWAN_CHART_PALETTE,
} from '../../../Charts/chartTheme';
import {
  buildSeamedVictoryProps,
  durationLineProps,
  durationScatterProps,
  intensityLineProps,
  repsBarProps,
  setsBarProps,
  weeklyVolumeAreaProps,
  workoutFrequencyBarProps,
} from './CanonicalProgressChartsGrid.victoryProps';

describe('Victory bridge — zero-visual-delta contract', () => {
  it('Swan-default build equals the pre-bridge literals', () => {
    const swan = buildSeamedVictoryProps(SWAN_CHART_PALETTE);
    expect(swan.workoutFrequencyBarProps).toEqual({ style: { data: { fill: CHART_COLORS.iceWing } } });
    expect(swan.weeklyVolumeAreaProps).toEqual({
      style: {
        data: {
          fill: hexAlpha(CHART_COLORS.wingPurple, 0.3),
          stroke: CHART_COLORS.wingPurple,
          strokeWidth: 2,
        },
      },
    });
    expect(swan.durationLineProps).toEqual({ style: { data: { stroke: CHART_COLORS.iceWing, strokeWidth: 2 } } });
    expect(swan.durationScatterProps).toEqual({ size: 5, style: { data: { fill: CHART_COLORS.iceWing, cursor: 'pointer' } } });
    expect(swan.intensityLineProps).toEqual({ style: { data: { stroke: CHART_COLORS.wingPurple, strokeWidth: 2 } } });
    // Static exports ARE the Swan build (identity by construction).
    expect(workoutFrequencyBarProps).toEqual(swan.workoutFrequencyBarProps);
    expect(weeklyVolumeAreaProps).toEqual(swan.weeklyVolumeAreaProps);
    expect(durationLineProps).toEqual(swan.durationLineProps);
    expect(durationScatterProps).toEqual(swan.durationScatterProps);
    expect(intensityLineProps).toEqual(swan.intensityLineProps);
  });

  it('keeps sets/reps on the DATA-ONLY palette (unseamed)', () => {
    expect(setsBarProps.style.data.fill).toBe(CHART_COLORS.arcticCyan);
    expect(repsBarProps.style.data.fill).toBe(CHART_COLORS.gildedFern);
  });

  it('a lens palette repaints the primary/secondary series', () => {
    const lens = buildSeamedVictoryProps({ primary: '#ff7a45', secondary: '#112233' });
    expect(lens.workoutFrequencyBarProps.style.data.fill).toBe('#ff7a45');
    expect(lens.intensityLineProps.style.data.stroke).toBe('#112233');
    expect(lens.weeklyVolumeAreaProps.style.data.fill).toBe(hexAlpha('#112233', 0.3));
  });

  it('non-hex secondary falls back to the Swan alpha fill (fail-closed)', () => {
    const lens = buildSeamedVictoryProps({ primary: '#ff7a45', secondary: 'var(--x)' });
    expect(lens.weeklyVolumeAreaProps.style.data.fill).toBe(hexAlpha(CHART_COLORS.wingPurple, 0.3));
    expect(lens.weeklyVolumeAreaProps.style.data.stroke).toBe('var(--x)');
  });
});

describe('resolveLensChartPalette', () => {
  it('falls back to Swan without a host', () => {
    expect(resolveLensChartPalette(null)).toEqual(SWAN_CHART_PALETTE);
    expect(resolveLensChartPalette(undefined)).toEqual(SWAN_CHART_PALETTE);
  });

  it('reads --world-accent from the host; secondary stays Swan-fixed (world-action is a button token)', () => {
    // jsdom's getComputedStyle does not resolve inline custom properties — stub it.
    const host = document.createElement('div');
    const spy = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: (token: string) => (token === '--world-accent' ? '#ff7a45' : ''),
    } as unknown as CSSStyleDeclaration);
    expect(resolveLensChartPalette(host)).toEqual({ primary: '#ff7a45', secondary: SWAN_CHART_PALETTE.secondary });
    spy.mockRestore();
  });

  it('falls back per-token when the host defines none', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    expect(resolveLensChartPalette(host)).toEqual(SWAN_CHART_PALETTE);
    host.remove();
  });
});
