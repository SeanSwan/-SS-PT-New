/**
 * themeTextTokenGaps.test.ts
 * ==========================
 *
 * The two TEXT-token gaps that are tracked rather than fixed, plus the derivation
 * gate for `--text-inverse`. Split out of `themeTokens.test.ts` under Rule 4's
 * 300-line cap, grouped by subject: that file owns the token CONTRACT (every theme
 * emits the same, complete, non-empty set of tokens); this one owns the tokens
 * whose measured contrast is a known, owned gap.
 *
 * Both ledgers follow the same doctrine as `--text-muted` in
 * `themeContrast.test.ts`: the number is recorded so it cannot move without
 * someone deciding it should. A ledger is not a waiver, and neither ledger is
 * allowed to grow to make a run go green.
 *
 * ── Why these are not fixed here ─────────────────────────────────────────────
 * Every theme in both ledgers is a palette VALUE, not a lens style. Repainting a
 * palette repaints the whole application, and 15+ themes' filled buttons is a
 * design decision that belongs to Sean. A lens review that "fixed" these by
 * editing the palettes would be doing the app-wide thing under a lens mandate.
 */

import { describe, expect, it } from 'vitest';
import { themeCycle, type ThemeId } from './UniversalThemeContext';
import { compositedContrast, readableOn } from './themeColorMath';
import {
  AA_NORMAL,
  colorDeclarations,
  key,
  panel,
  styledBlock,
  textBearingComponents,
  token,
  varsIn,
} from './themeContrastInstrument';

/**
 * `--text-inverse` — the LAST hand-maintained theme-id list in the emitter.
 *
 * Hostile-review round 4. Every other colour token in `generateCSSVariables` is
 * derived from the palette. This one was a three-branch ternary on the theme id:
 *
 *   themeId === 'crystalline-light' ? '#E0ECF4'
 *     : themeId === 'crystalline-mono' ? '#000000' : '#0F172A'
 *
 * `--text-inverse` is text painted on an ACCENT surface — the call sites are
 * `background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))`
 * with `color: var(--text-inverse)` (e.g. BootcampBuilderStyles.ts:155-158,
 * UserDashboard/components/HomeTabVisionCards.styles.ts:52-56). The palette already
 * answers "what text reads on the accent" — `getReadableAccentText(colors.primary)`,
 * emitted as `--text-on-accent` and used by `SelectedMark` for exactly this reason
 * (see ThemeLensPopover.styles.ts:225-238, where the same defect was fixed for
 * `--bg-base`). `--text-inverse` was simply never brought along.
 *
 * Measured before the fix, worst case over the accent gradient:
 *
 *   obsidian-black    inverse #0F172A on primary #002060 = 1.17:1   (readableOn -> #FFFFFF)
 *   nebula-crown      inverse #0F172A on primary #9333EA = 3.32:1   (readableOn -> #FFFFFF)
 *   crystalline-light inverse #E0ECF4 on primary #0284C7 = 3.41:1   (readableOn -> #030712)
 *
 * The first assertion is the derivation gate: the token must be the palette's own
 * answer, not a list. The second is a ledger for the part that is NOT fixable by
 * choosing a better single colour — a two-stop gradient spanning both luminance
 * extremes cannot be satisfied by any one text colour.
 */
describe('--text-inverse is derived from the palette, not hand-listed', () => {
  const inverseFor = (id: ThemeId): string => token(id, '--text-inverse');
  const accentFor = (id: ThemeId): string => token(id, '--accent-primary');

  it('is the readable tone for the accent surface it is painted on, for every theme', () => {
    const wrong: string[] = [];

    for (const id of themeCycle as ThemeId[]) {
      const inverse = inverseFor(id);
      const wanted = readableOn(accentFor(id));
      if (inverse !== wanted) {
        wrong.push(`${id}: emits ${inverse} but the accent ${accentFor(id)} wants ${wanted}`);
      }
    }

    expect(
      wrong,
      'A theme id was added to a hand-written list instead of deriving the token. ' +
        'Use readableOn(colors.primary) — the same answer --text-on-accent already carries.'
    ).toEqual([]);
  });

  it('agrees with --text-on-accent, which answers the same question', () => {
    const drift: string[] = [];

    for (const id of themeCycle as ThemeId[]) {
      const inverse = token(id, '--text-inverse');
      const onAccent = token(id, '--text-on-accent');
      if (inverse !== onAccent) drift.push(`${id}: inverse=${inverse} on-accent=${onAccent}`);
    }

    expect(drift, 'two tokens for the same surface disagree — one of them is wrong').toEqual([]);
  });

  it('clears 4.5:1 on the accent start-stop in every theme', () => {
    const below: string[] = [];

    for (const id of themeCycle as ThemeId[]) {
      const ratio = compositedContrast(inverseFor(id), accentFor(id));
      if (ratio < 4.5) below.push(`${id} = ${ratio.toFixed(2)}:1`);
    }

    expect(below).toEqual([]);
  });

  /**
   * TRACKED GAP — the half that a single colour cannot fix.
   *
   * The gradient runs accent-primary -> accent-secondary. On these themes the two
   * stops sit on opposite sides of the luminance scale (solar-gold: #F6C453 -> #9A3412),
   * so whichever tone `readableOn` picks, the far end of every label fails. Fixing it
   * means changing how 15 themes paint filled buttons — a design decision owned by
   * Sean, not a review fix. This ledger keeps the number from moving silently.
   *
   * The derivation fix above took this from 19 themes to 15, and made every theme
   * clear 4.5:1 at the gradient's START (worst: frozen-aurora 4.51:1). obsidian-black
   * went from 1.17:1 to 15.27:1 on the start stop.
   */
  it('records the themes whose accent GRADIENT end cannot carry any single text tone', () => {
    const KNOWN_BELOW_AA_ON_GRADIENT_END: ThemeId[] = [
      'aqua-abyss',
      'cinematic-ember',
      'copper-patina',
      'crystalline-default',
      'crystalline-light',
      'ember-realm',
      'emerald-vault',
      'graphite-luxe',
      'nebula-crown',
      'obsidian-black',
      'obsidian-bloom',
      'rose-quartz',
      'ruby-forge',
      'solar-gold',
      'twilight-lagoon',
    ];

    const below = (themeCycle as ThemeId[])
      .filter(
        (id) => compositedContrast(token(id, '--text-inverse'), token(id, '--accent-secondary')) < 4.5
      )
      .sort();

    expect(
      below,
      'The gradient-end gap moved. If it improved, update the ledger and this comment; ' +
        'if it worsened, a palette regressed. Do not widen the list to go green.'
    ).toEqual([...KNOWN_BELOW_AA_ON_GRADIENT_END].sort());
  });
});

/**
 * `--text-accent` — the SECOND tracked palette gap, and it had no ledger at all.
 *
 * Hostile-review round 4. `--text-muted` is measured and recorded (see
 * themeContrast.test.ts). `--text-accent` is a text token emitted by the same
 * function, used as text in the app, and nothing measured it. Measured against
 * both surfaces it can be painted on:
 *
 *   theme            tone       vs page    vs elevated panel
 *   frozen-aurora    #6366F1      4.04:1      4.39:1    fails both
 *   nebula-crown     #9333EA      3.77:1      3.72:1    fails both
 *   obsidian-black   #8B5CF6      4.66:1      4.07:1    fails elevated only
 *
 * The ledger is keyed to the STRICTER of the two, so obsidian-black is in it on
 * the strength of the elevated surface alone — it clears AA on the page. That
 * distinction is recorded rather than flattened, because it decides the fix: the
 * first two need a new tone, obsidian-black needs the panel wash lightened.
 *
 * All three are palette values, all three are app-wide (not lens) tokens, and none
 * is in scope for a lens review to repaint. The ledger exists so the count cannot
 * move without someone deciding it should — the same doctrine as `--text-muted`.
 */
describe('tracked gap: --text-accent below AA (app-wide, out of scope for the lens)', () => {
  const KNOWN_BELOW_AA: ThemeId[] = ['frozen-aurora', 'nebula-crown', 'obsidian-black'];

  /** Both surfaces the token can be painted on; the ledger keys to the worse of the two. */
  const surfacesFor = (id: ThemeId): string[] => [token(id, '--bg-primary'), panel(id)];

  it('fails AA on at least one surface in exactly the recorded themes, and no others', () => {
    const below = (themeCycle as ThemeId[])
      .filter((id) =>
        surfacesFor(id).some(
          (surface) => compositedContrast(token(id, '--text-accent'), surface) < AA_NORMAL
        )
      )
      .sort();

    expect(
      below,
      'The --text-accent gap changed. If it improved, update the ledger and this ' +
        'comment; if it worsened, a palette regressed. Do not widen the list to go green.'
    ).toEqual([...KNOWN_BELOW_AA].sort());
  });

  /**
   * The first version of this assertion read
   * `generateCSSVariables(id).includes('color: var(--text-accent')` — which scans the
   * EMITTER's output. The emitter writes `--text-accent: …`, a custom-property
   * DEFINITION; it never writes `color: var(--text-accent`. So the check could not
   * fail, whatever the lens did. A gate that cannot fail is worse than no gate,
   * because it reads as coverage. This one scans the lens stylesheets through the
   * same instrument `themeContrast.test.ts` uses, and proves it swept something.
   */
  it('is not used as a text colour anywhere in the lens', () => {
    const sites = textBearingComponents();
    expect(sites.length, 'the scan found no text sites — it would pass vacuously').toBeGreaterThan(0);

    const offenders = sites
      .filter(({ file, component }) =>
        varsIn(colorDeclarations(styledBlock(file, component))).includes('--text-accent')
      )
      .map(({ file, component }) => key(file, component));

    expect(offenders).toEqual([]);
  });
});
