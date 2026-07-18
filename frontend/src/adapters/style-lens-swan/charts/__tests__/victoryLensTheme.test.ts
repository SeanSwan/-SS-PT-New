/**
 * Slice 3 / C7 — resolveLensVictoryTheme composition/deferral/fail-closed (KIMI-SWAN-LENS-SLICE3 §4.2).
 * Retired-hex literals concatenated (§3.D).
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { resolveLensVictoryTheme, SWAN_CHROME_FALLBACKS } from '../victoryLensTheme';
import { SWAN_CHART_PALETTE } from '../../../../components/Charts/chartTheme';

const HEX6 = /^#[0-9a-fA-F]{6}$/;
const RGBA = /^rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (0(\.\d+)?|1)\)$/;
const RETIRED = new RegExp(['#0a0a' + '1a', '#00ff' + 'ff', '#7851' + 'a9'].join('|'), 'i');

const hosts: HTMLElement[] = [];
const hostWith = (vars: Record<string, string>): HTMLElement => {
  const el = document.createElement('div');
  Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
  document.body.appendChild(el);
  hosts.push(el);
  return el;
};
afterEach(() => {
  hosts.splice(0).forEach((el) => el.remove());
});

describe('C7 resolveLensVictoryTheme — composes the shipped bridge', () => {
  it('primary follows --world-accent per host; secondary + chrome stay Swan-fixed', () => {
    const a = resolveLensVictoryTheme(hostWith({ '--world-accent': '#60c0f0' }));
    const b = resolveLensVictoryTheme(hostWith({ '--world-accent': '#8b5cf6' }));
    expect(a.theme.palette.qualitative[0]).not.toBe(b.theme.palette.qualitative[0]);
    expect(a.theme.palette.qualitative[1]).toBe(b.theme.palette.qualitative[1]);
    expect(a.theme.palette.qualitative[1]).toBe(SWAN_CHART_PALETTE.secondary);
    expect(a.theme.axis).toEqual(b.theme.axis); // chrome is lens-invariant
    expect(a.tooltip).toEqual(b.tooltip);
  });

  it('CHART CHARTER DEFERRAL guard: qualitative is EXACTLY 2 entries', () => {
    expect(resolveLensVictoryTheme(null).theme.palette.qualitative).toHaveLength(2);
  });

  it('all emitted colors are valid; no deferred dataviz tokens; no retired literals', () => {
    const bundle = resolveLensVictoryTheme(null);
    const flat = JSON.stringify(bundle);
    expect(flat).not.toContain('--world-' + 'data');
    expect(RETIRED.test(flat)).toBe(false);
    [
      ...bundle.theme.palette.qualitative,
      bundle.theme.axis.style.tickLabels.fill,
      bundle.theme.axis.style.axisLabel.fill,
      bundle.tooltip.flyoutStyle.fill,
      bundle.tooltip.style.fill,
    ].forEach((c) => expect(c).toMatch(HEX6));
    [
      bundle.theme.axis.style.axis.stroke,
      bundle.theme.axis.style.grid.stroke,
      bundle.theme.axis.style.ticks.stroke,
      bundle.tooltip.flyoutStyle.stroke,
    ].forEach((c) => expect(c).toMatch(RGBA));
  });

  it('fail-closed: corrupt --frost-white => table fallback, no throw', () => {
    const host = hostWith({ '--frost-white': 'not-a-color' });
    const bundle = resolveLensVictoryTheme(host);
    expect(bundle.theme.axis.style.tickLabels.fill).toBe(SWAN_CHROME_FALLBACKS.labelFill);
  });

  it('fail-closed: getComputedStyle throws => complete pure-Swan bundle', () => {
    const spy = vi.spyOn(window, 'getComputedStyle').mockImplementation(() => {
      throw new Error('boom');
    });
    const bundle = resolveLensVictoryTheme(null);
    expect(bundle.theme.palette.qualitative).toEqual([SWAN_CHART_PALETTE.primary, SWAN_CHART_PALETTE.secondary]);
    expect(bundle.tooltip.flyoutStyle.fill).toBe(SWAN_CHROME_FALLBACKS.tooltipBg);
    spy.mockRestore();
  });

  it('drift guard: fallbacks mirror the shipped S1-A §B theme values', () => {
    expect(SWAN_CHROME_FALLBACKS.labelFill).toBe('#e0ecf4'); // --frost-white
    expect(SWAN_CHROME_FALLBACKS.tooltipBg).toBe('#141419'); // --bg-surface
  });
});
