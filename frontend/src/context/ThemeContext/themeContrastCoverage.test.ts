/**
 * themeContrastCoverage.test.ts
 * =============================
 *
 * Does the contrast gate COVER what it claims to cover?
 *
 * Split out of `themeContrast.test.ts` under Rule 4 on 2026-09-20, when the A1-03
 * additions took that file past 300 lines. The seam is scoring vs coverage:
 * `themeContrast.test.ts` asserts that every scored site clears its threshold; this
 * file asserts that the set of scored sites is COMPLETE and that its recipes match
 * what the stylesheets actually paint.
 *
 * Why this earns its own file rather than a section: a coverage assertion that is
 * wrong reports a PASS. Round 3's CRITICAL finding lived in exactly that failure — a
 * gate that scanned one stylesheet and one token form, green throughout. The question
 * "is this gate trustworthy?" should be findable on its own terms.
 *
 * TWO A1-03 DEFECTS ARE CLOSED HERE, and they are the same defect twice: the gate held
 * a second, hand-maintained copy of the thing it was checking.
 *
 *   1. THE INVENTORY WAS A LITERAL ARRAY that claimed to be self-enforcing — "A new one
 *      must be declared here or the gate fails." Nothing made that true.
 *      `textBearingComponents()` iterates the array, so a stylesheet absent from it was
 *      never scanned, never appeared in `actual`, and left the coverage assertion
 *      green. A new lens stylesheet with a failing text colour was invisible. Now the
 *      list is discovered from the filesystem, and a test proves the discovery is real.
 *
 *   2. THE WASH RECIPES WERE HAND-ENTERED, and the token-level comparison could not see
 *      them drift: `--accent-primary` at 14% and at 18% are the same TOKEN. Changing a
 *      wash in the stylesheet left the gate measuring a surface that no longer existed
 *      — and reporting a pass for it. Every surface now states its recipe, and
 *      `washDrift()` checks it against the block.
 */

import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SITES } from './themeContrastSites';
import {
  LENS_STYLESHEETS,
  NON_TOKEN_TEXT,
  colorDeclarations,
  discoverLensStylesheets,
  key,
  styledBlock,
  textBearingComponents,
  varsIn,
} from './themeContrastInstrument';
import { washDrift, washDriftFor } from './themeContrastWashes';

  describe('the site table covers the stylesheets', () => {
    it('accounts for every component that declares a text colour', () => {
      const declared = new Set([
        ...SITES.map((s) => key(s.file, s.component)),
        ...NON_TOKEN_TEXT.map((s) => key(s.file, s.component)),
      ]);
      const actual = textBearingComponents().map((s) => key(s.file, s.component));

      // Fails in BOTH directions: an unscored text colour, or a stale entry.
      expect(actual.sort()).toEqual([...declared].sort());
    });

    it('declares exactly the tokens each block actually uses', () => {
      const drift: string[] = [];

      for (const site of SITES) {
        const found = varsIn(colorDeclarations(styledBlock(site.file, site.component)));
        const declared = Object.keys(site.surfaces).sort();
        if (found.join(',') !== declared.join(',')) {
          drift.push(
            `${site.component}: block uses [${found.join(', ')}] but the gate declares ` +
              `[${declared.join(', ')}]`
          );
        }
      }

      expect(
        drift,
        'A text colour changed without the gate following it. Declare the new token and ' +
          'the surface it sits on, then measure it — do not delete the assertion.'
      ).toEqual([]);
    });

    it('keeps the one non-token text colour out of the text sites', () => {
      // LensButton is the allowlisted exception; it must not be scored as text.
      expect(NON_TOKEN_TEXT.map((s) => s.component)).toEqual(['LensButton']);
    });

    /**
     * A1-03, first half — the inventory was a hand-written array that claimed to be
     * self-enforcing. It was not.
     *
     * The instrument's comment read "A new one must be declared here or the gate
     * fails." Nothing made that true: `textBearingComponents()` iterates the array, so
     * a stylesheet absent from it was never scanned, never appeared in `actual`, and
     * left the coverage assertion above *green*. A new lens stylesheet with a failing
     * text colour would have been invisible — the exact round-3 blind spot, reopened by
     * the fix for it.
     */
    it('discovers lens stylesheets from disk rather than from a hand-written list', () => {
      const onDisk = readdirSync(__dirname).filter((f) => /^ThemeLens.*\.styles\.ts$/.test(f));
      expect([...LENS_STYLESHEETS].sort()).toEqual(onDisk.sort());
      // Anti-vacuity: a discovery that finds nothing satisfies the equality above only
      // if the array is also empty, so assert the known minimum separately.
      expect(onDisk.length).toBeGreaterThanOrEqual(3);
    });

    it('picks up a stylesheet that was just added, with no code change', () => {
      // Proves the discovery is a filesystem walk and not a list that happens to match.
      // Self-contained and self-cleaning: the probe lives OUTSIDE the lane, so it cannot
      // break the very gate it is demonstrating (the round-3 `_probeOverCap.ts` lesson).
      const fixture = join(tmpdir(), `swan-lens-inventory-${process.pid}-${Date.now()}`);
      try {
        mkdirSync(fixture, { recursive: true });
        writeFileSync(join(fixture, 'ThemeLensBrandNew.styles.ts'), 'export const X = 1;\n');
        expect(discoverLensStylesheets(fixture)).toContain('ThemeLensBrandNew.styles.ts');
      } finally {
        rmSync(fixture, { recursive: true, force: true });
      }
    });

    /**
     * A1-03, second half — the wash recipes were hand-entered, so the token-level
     * assertion above could not see them drift.
     *
     * "declares exactly the tokens each block actually uses" compares TOKENS.
     * `--accent-primary` at 14% and at 18% are the same token to it. Changing the wash
     * in the stylesheet therefore left the gate measuring a surface that no longer
     * existed, and reporting a pass for it.
     */
    it('declares the wash each block actually paints, not a remembered percentage', () => {
      expect(
        washDrift(SITES),
        'A wash changed in the stylesheet without the gate following it. Update the ' +
          'recipe in SITES to match what is painted, then re-measure — do not delete ' +
          'the assertion.'
      ).toEqual([]);
    });

    /**
     * NEGATIVE CONTROL — Astra R6 (N1, HIGH), 2026-09-20.
     *
     * The first version of the wash guard SORTED its washes, which discarded which wash
     * pairs with which state. Swapping the two ternary branches in `Option` — selected ⇄
     * unselected — left the sorted signature identical, so the guard returned `[]` for a
     * picker whose two states had been exchanged. Astra demonstrated it in memory:
     *
     *     baseline washDrift: []
     *     swapped selected/unselected backgrounds washDrift: []
     *     deep-ocean unselected text on swapped accent wash: 4.264985:1
     *
     * This is the same shape of blind spot as the token-only check the guard replaced:
     * it proved a SET, not a PAIRING. The fix is an ordered signature, and this test is
     * the control that proves the ordering is load-bearing — a guard that has never been
     * shown to fail is a guard that is only believed.
     */
    it('catches the selected/unselected branches being exchanged (N1 negative control)', () => {
      const site = SITES.find((s) => s.component === 'OptionLabel');
      expect(site, 'OptionLabel must exist — this control is meaningless without it').toBeTruthy();

      const block = styledBlock(site!.file, site!.paintedBy ?? site!.component);

      // Baseline: the guard is clean on the real, unmutated stylesheet.
      expect(washDriftFor(site!, block, 'crystalline-dark')).toBe('');

      // Swap the two branches, exactly as a builder restructuring the picker might.
      // The intermediate tokens avoid the replacements cascading into each other.
      const ACCENT = 'color-mix(in srgb, var(--accent-primary, #60c0f0) 20%, transparent)';
      const BASE = 'color-mix(in srgb, var(--bg-base, #030712) 60%, transparent)';
      const swapped = block
        .replace(ACCENT, '@@A@@')
        .replace(BASE, '@@B@@')
        .replace('@@A@@', BASE)
        .replace('@@B@@', ACCENT);

      // Anti-vacuity: if the mutation did not apply, the assertion below proves nothing.
      expect(swapped, 'the branch swap did not apply — the control is inert').not.toBe(block);

      // And the guard must catch it. Sorted, this returned '' and the suite stayed green.
      expect(washDriftFor(site!, swapped, 'crystalline-dark')).not.toBe('');
    });
  });
