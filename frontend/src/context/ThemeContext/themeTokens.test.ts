/**
 * themeTokens.test.ts
 * ===================
 *
 * The gate for the CSS custom-property contract: every registered theme must emit
 * the same, complete, non-empty set of tokens.
 *
 * Authored from a measured failure risk rather than a failure: HY4 round 1
 * (Finding 7) flagged that `OptionLabel` used a *fallback* value —
 * `var(--text-secondary, rgba(248, 250, 252, 0.85))` — and that a light-on-light
 * fallback would fail WCAG 4.5:1. The finding was about the fallback, and the
 * question that decides whether it matters is: can the fallback ever be reached?
 *
 * Measured across all 28 themes: no. Every theme emits `--text-secondary` with a
 * real value, and every theme emits exactly 130 tokens with identical names. The
 * fallback is unreachable, so the risk is closed by construction — and this gate
 * is what keeps it closed. A palette that loses a field would otherwise render an
 * empty custom property, which CSS treats as absent, which silently activates
 * every fallback in the codebase at once.
 *
 * ── What this gate does NOT cover ────────────────────────────────────────────
 * It does not assert contrast ratios, and that is deliberate rather than an
 * omission. `themeColorMath.contrastRatio` parses hex only, and 27 of the 28
 * themes express `--text-secondary` and/or `--bg-elevated` as `rgba(...)`. A
 * contrast assertion built on the existing helper would silently cover ONE theme
 * and report a pass — a gate that scores an adjacent property and certifies the
 * failure it was written for. Doing it properly needs alpha compositing against a
 * defined backdrop, which the palettes do not currently specify. Recorded as an
 * open item; measured coverage if it were attempted today: 1/28.
 *
 * The contrast assertions that DO exist are per-token and live elsewhere:
 * `themeContrast.test.ts` (the lens surfaces) and `themeTextTokenGaps.test.ts`
 * (the two tracked text-token gaps, and the `--text-inverse` derivation gate).
 * Split out of this file under Rule 4's 300-line cap.
 */

import { describe, expect, it } from 'vitest';
import { themeCycle } from './UniversalThemeContext';
import { generateCSSVariables } from '../../utils/theme/themeUtils';

/**
 * Parse the emitted `:root { ... }` block into a token map. Flatten newlines first
 * so a value that happens to wrap is still read as one declaration.
 */
const parseVars = (css: string): Map<string, string> => {
  const flat = css.replace(/\s*\n\s*/g, ' ');
  const map = new Map<string, string>();
  for (const match of flat.matchAll(/(--[a-z0-9-]+):\s*([^;]*);/gi)) {
    map.set(match[1], match[2].trim());
  }
  return map;
};

/** Measured reference: 130 tokens, identical across all 28 registered themes. */
const EXPECTED_TOKEN_COUNT = 130;

describe('CSS custom-property contract', () => {
  const perTheme = themeCycle.map((id) => ({ id, vars: parseVars(generateCSSVariables(id)) }));

  it('emits the expected number of tokens for the reference theme', () => {
    expect(perTheme[0].vars.size).toBe(EXPECTED_TOKEN_COUNT);
  });

  it('emits the same token NAMES for every registered theme', () => {
    const reference = perTheme[0].vars;
    const disagreements: string[] = [];

    for (const { id, vars } of perTheme) {
      for (const name of reference.keys()) {
        if (!vars.has(name)) disagreements.push(`${id} is MISSING ${name}`);
      }
      for (const name of vars.keys()) {
        if (!reference.has(name)) disagreements.push(`${id} has EXTRA ${name}`);
      }
    }

    expect(disagreements).toEqual([]);
  });

  it('emits a non-empty, resolved value for every token of every theme', () => {
    // `undefined` / `NaN` reaching a custom property means a palette field is
    // missing or a template expression produced nothing. CSS treats an invalid
    // custom property as unset, so it fails silently at the consumer.
    const broken: string[] = [];

    for (const { id, vars } of perTheme) {
      for (const [name, value] of vars) {
        if (!value || /undefined|NaN|\[object/i.test(value)) {
          broken.push(`${id} ${name}: "${value}"`);
        }
      }
    }

    expect(broken).toEqual([]);
  });

  /**
   * The specific claim that closes HY4 Finding 7: the fallback is unreachable.
   * If this fails, every `var(--text-secondary, <literal>)` in the codebase starts
   * using its literal — which on the light themes is light text on a light surface.
   */
  it('always emits --text-secondary, so its fallbacks are unreachable', () => {
    const missing = perTheme.filter(({ vars }) => !vars.get('--text-secondary'));

    expect(missing.map((t) => t.id)).toEqual([]);
  });

  it('always emits the page-background and accent tokens the swatch derives from', () => {
    const required = ['--bg-primary', '--bg-elevated', '--accent-primary', '--text-primary'];
    const missing: string[] = [];

    for (const { id, vars } of perTheme) {
      for (const name of required) {
        if (!vars.get(name)) missing.push(`${id} ${name}`);
      }
    }

    expect(missing).toEqual([]);
  });
});
