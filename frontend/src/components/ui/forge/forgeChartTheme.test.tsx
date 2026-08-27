/**
 * forgeChartTheme tests — proves the chart theme is DERIVED from the generated
 * pack projection (first real consumer of forgeTheme.generated.ts) and that
 * ForgeChart composes the trusted SafeChart boundary.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { forgeTheme } from '../../../styles/forgeTheme.generated';
import { forgeVictoryTheme, forgeVictoryAnimate, FORGE_SERIES } from './forgeChartTheme';
import ForgeChart from './ForgeChart';

describe('forgeChartTheme derives from the generated pack projection', () => {
  it('series palette = Dual-Button Glow poles + gold, straight from tokens', () => {
    expect(FORGE_SERIES[0]).toBe(forgeTheme.glowB);
    expect(FORGE_SERIES[1]).toBe(forgeTheme.glowA);
    expect(FORGE_SERIES[2]).toBe(forgeTheme.colorGold);
  });
  it('line/bar strokes and label fills are token values (no literal hex in the theme module)', () => {
    expect(forgeVictoryTheme.line.style.data.stroke).toBe(forgeTheme.glowB);
    expect(forgeVictoryTheme.bar.style.data.fill).toBe(forgeTheme.glowB);
    expect(forgeVictoryTheme.axis.style.tickLabels.fill).toBe(forgeTheme.textSecondary);
    expect(forgeVictoryTheme.axis.style.tickLabels.fontFamily).toBe(forgeTheme.fontData);
  });
  it('alpha helper renders rgba from the token hex (tooltip flyout uses elevated bg)', () => {
    expect(forgeVictoryTheme.tooltip.flyoutStyle.fill).toMatch(/^rgba\(26, 26, 36, 0\.95\)$/);
  });
  it('animation follows the pack motion multiplier', () => {
    expect(forgeTheme.motion).toBe('1');
    expect(forgeVictoryAnimate).toEqual({ duration: 800, easing: 'cubicInOut' });
  });
});

describe('ForgeChart frame', () => {
  it('renders a self-scoped data card wrapping SafeChart with the child chart', () => {
    render(<ForgeChart chartName="demo" title="Weight" meta="last 30 days"><div data-testid="chart">chart</div></ForgeChart>);
    const card = screen.getByRole('article', { name: 'Weight' });
    expect(card.className).toContain('sw-pack-crystalline-swan');
    expect(card.className).toContain('sw-card--data');
    expect(screen.getByTestId('chart')).toBeInTheDocument();
    expect(screen.getByText('last 30 days')).toBeInTheDocument();
  });
});
