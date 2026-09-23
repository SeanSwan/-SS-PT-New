/**
 * themeContrast.test.ts
 * =====================
 *
 * WCAG 2.1 AA contrast for the text the theme lens actually renders. The measuring
 * apparatus lives in `themeContrastInstrument.ts`; this file holds the assertions and
 * the reasoning behind them.
 *
 * WHY THIS EXISTS
 * HY4 round 2 (MEDIUM #4): `themeTokens.test.ts` proves the `var(--text-secondary, …)`
 * fallback is unreachable, but it explicitly does not assert contrast — so the
 * question was substituted away rather than answered. `themeColorMath.contrastRatio`
 * parses hex only, and 27 of the 28 themes express their text tokens as `rgba(...)`,
 * so a contrast assertion built on the old helper would have silently covered ONE
 * theme and reported a pass. The fix is an alpha-compositing helper, and this gate.
 *
 * WHY IT WAS REWRITTEN (HY4 round 3, #1 CRITICAL and #6 LOW)
 * The first version had TWO structural blind spots, and the CRITICAL finding lived in
 * exactly their overlap: it scanned ONE stylesheet (so the tooltip, which lives in
 * `ThemeLensButton.styles.ts`, was out of scope), and it scanned only `var(--text-…)`
 * (so a colour written as `$swatch.icon` or `var(--bg-base)` was invisible). Both are
 * now closed by construction: every lens stylesheet is scanned (the set is DISCOVERED
 * from the filesystem, not listed — see `themeContrastCoverage.test.ts`), and every
 * `color:` declaration is compared against a declared token set so a swap fails loudly.
 *
 * This file scores; `themeContrastCoverage.test.ts` checks that the scoring covers
 * everything it claims to. `themeContrastSites.ts` holds the table of what is measured.
 *
 * THE BACKDROP IS A CHAIN, NOT A TOKEN
 * `Panel` paints `var(--bg-elevated)`, itself translucent, over an opaque page; the
 * labels sit on further `color-mix(… N%, transparent)` washes on top of that. A colour
 * measured against a token in isolation is a number for a colour nobody sees.
 *
 * WHAT THIS GATE DOES NOT COVER
 *  - `LensButton`'s glyph colour is `$swatch.icon` on a `$swatch.fill` gradient. That
 *    is deliberately NOT scored here: it is a small NON-text graphic drawn near the
 *    middle of the gradient, so `readableOn(gradientMidpoint(from, to))` is the right
 *    instrument and `themeSwatch.test.ts` is its gate. It is the 260px TEXT bubble
 *    spanning the same gradient that the midpoint heuristic gets wrong, and that one
 *    is scored below.
 *  - The panel is `position: absolute` over a blurred, 85%-opaque header, so the real
 *    backdrop at the panel's edge is partly page CONTENT (hero images, gradients).
 *    A token-level gate cannot model that. Marked UNVERIFIED, not assumed fine.
 */

import { describe, expect, it } from 'vitest';
import { themeCycle, type ThemeId } from './UniversalThemeContext';
import { compositeOver, compositedContrast } from './themeColorMath';
import { SITES } from './themeContrastSites';
import {
  AA_NON_TEXT,
  AA_NORMAL,
  colorDeclarations,
  panel,
  styledBlock,
  textBearingComponents,
  token,
  varsIn,
} from './themeContrastInstrument';

describe('WCAG AA contrast for the theme lens', () => {
  describe('the instrument', () => {
    it('composites alpha the way the browser does', () => {
      // 50% white over black is mid grey, not white.
      expect(compositeOver('rgba(255, 255, 255, 0.5)', '#000000')).toBe('#808080');
      // Opaque top wins outright.
      expect(compositeOver('#123456', '#ffffff')).toBe('#123456');
      // Unparseable input is returned unchanged rather than silently becoming black.
      expect(compositeOver('not-a-colour', '#ffffff')).toBe('not-a-colour');
    });

    it('can actually detect a failing pair', () => {
      // Control: if this ever reports a pass, the gate is blind and everything below
      // is worthless. #555 on #000 is ~2.7:1.
      expect(compositedContrast('rgba(85, 85, 85, 1)', '#000000')).toBeLessThan(AA_NORMAL);
      expect(compositedContrast('#ffffff', '#000000')).toBeGreaterThan(AA_NORMAL);
    });

    it('reads a ternary colour as BOTH tokens, not neither', () => {
      // This is the shape OptionLabel uses. A line-based scanner would find no token
      // here and the gate would quietly score nothing.
      const block =
        'export const X = styled.span`\n  color: ${({ $on }) =>\n' +
        "    $on ? 'var(--text-primary, #fff)' : 'var(--text-secondary, #eee)'};\n`;\n";
      expect(varsIn(colorDeclarations(block))).toEqual(['--text-primary', '--text-secondary']);
    });

    it('ignores border-color, background-color and scrollbar-color', () => {
      const block =
        'export const X = styled.span`\n' +
        '  border-color: var(--border-strong);\n' +
        '  background-color: var(--bg-base);\n' +
        '  scrollbar-color: color-mix(in srgb, var(--accent-primary) 45%, transparent) transparent;\n' +
        '`;\n';
      expect(colorDeclarations(block)).toEqual([]);
    });

    it('does not mistake color-mix() for a color declaration', () => {
      const block =
        'export const X = styled.span`\n' +
        '  background: color-mix(in srgb, var(--accent-primary) 20%, transparent);\n`;\n';
      expect(colorDeclarations(block)).toEqual([]);
    });
  });

  describe('the token source', () => {
    it('emits every token the declared sites use, for every theme', () => {
      // Anti-vacuity: a site naming a token the emitter does not produce would
      // otherwise throw at read time only for themes that happen to miss it.
      const wanted = new Set<string>();
      for (const site of SITES) for (const name of Object.keys(site.surfaces)) wanted.add(name);

      const missing: string[] = [];
      for (const id of themeCycle as ThemeId[]) {
        for (const name of wanted) if (!token(id, name)) missing.push(`${id} ${name}`);
      }
      expect(missing).toEqual([]);
    });

    it('gives every theme an opaque page colour', () => {
      // The whole chain assumes an opaque base. If one theme ever ships a
      // translucent --bg-primary, every number below becomes meaningless.
      for (const id of themeCycle as ThemeId[]) {
        expect(token(id, '--bg-primary'), `${id} --bg-primary`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });


  describe('every scored site meets its threshold', () => {
    for (const site of SITES) {
      it(`${site.component} (${site.note})`, () => {
        const failures: string[] = [];

        for (const [name, surfaces] of Object.entries(site.surfaces)) {
          for (const id of themeCycle as ThemeId[]) {
            for (const surface of surfaces(id)) {
              const ratio = compositedContrast(token(id, name), surface.color);
              if (ratio < site.threshold) {
                failures.push(
                  `${id} ${name} on ${surface.label} (${surface.color}) = ${ratio.toFixed(2)}:1`
                );
              }
            }
          }
        }

        expect(failures, `below ${site.threshold}:1 — ${failures.join('; ')}`).toEqual([]);
      });
    }
  });

  /**
   * The regression lock for round 3 #1. The tooltip is TEXT spanning a gradient
   * whose light end is `colors.primary`; the swatch's icon colour is chosen for the
   * gradient's MIDPOINT, which is why it measured 1.99:1 (white on #60C0F0) there.
   * Both swatch colours are gradient-derived, so neither may come back.
   */
  describe('the tooltip stays tokenized', () => {
    it('derives no colour from the swatch gradient', () => {
      const block = styledBlock('ThemeLensButton.styles.ts', 'TooltipBubble');
      expect(block).not.toContain('$swatch.fill');
      expect(block).not.toContain('$swatch.icon');
    });

    it('paints its background with an opaque token, so the arrow can match it', () => {
      // A translucent bubble background would make the text's contrast unknowable
      // and would show a seam where the arrow meets the bubble.
      expect(styledBlock('ThemeLensButton.styles.ts', 'TooltipBubble')).toContain(
        'background: var(--bg-primary'
      );
    });
  });

  /**
   * A TRACKED GAP, NOT AN ACCEPTED STANDARD.
   *
   * `--text-muted` is below AA in four themes. It is NOT raised here because it is a
   * palette token with 740 call sites across 355 files: changing it is an app-wide
   * visual redesign and belongs to Sean, not to a lens review. The lens no longer
   * uses it anywhere (PanelTitle was moved to --text-secondary).
   *
   * This ledger exists so the gap cannot move silently. It fails if it WORSENS
   * (regression) and equally if it IMPROVES (the list must then be updated, which
   * makes the improvement a deliberate act instead of an accident).
   */
  describe('tracked gap: --text-muted below AA (app-wide, out of scope for the lens)', () => {
    const KNOWN_BELOW_AA = ['crystalline-mono', 'deep-ocean', 'frozen-aurora', 'obsidian-black'];

    it('fails AA in exactly the recorded themes, and no others', () => {
      const below = (themeCycle as ThemeId[])
        .filter((id) => compositedContrast(token(id, '--text-muted'), panel(id)) < AA_NORMAL)
        .sort();

      expect(
        below,
        'The --text-muted gap changed. If it improved, update KNOWN_BELOW_AA and this ' +
          'comment; if it worsened, the palette regressed. Do not widen the list to make ' +
          'the suite green.'
      ).toEqual(KNOWN_BELOW_AA);
    });

    it('is not used as a text colour anywhere in the lens', () => {
      // The generalisation of the old "is no longer used by the lens itself" test:
      // it now covers every lens stylesheet, not just the popover's.
      const offenders: string[] = [];
      for (const { file, component } of textBearingComponents()) {
        if (varsIn(colorDeclarations(styledBlock(file, component))).includes('--text-muted')) {
          offenders.push(`${file}::${component}`);
        }
      }
      expect(offenders).toEqual([]);
    });

    it('still clears the 3:1 non-text threshold, so it is legible as a graphic', () => {
      // Records WHY this is a tracked gap rather than a stop-ship defect.
      const below = (themeCycle as ThemeId[]).filter(
        (id) => compositedContrast(token(id, '--text-muted'), panel(id)) < AA_NON_TEXT
      );
      expect(below).toEqual(['frozen-aurora']);
    });
  });
});
