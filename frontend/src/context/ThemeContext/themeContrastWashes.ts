/**
 * themeContrastWashes.ts
 * ======================
 *
 * The wash half of the contrast apparatus: what a surface is painted with, and whether
 * the stylesheet agrees.
 *
 * Split out of `themeContrastInstrument.ts` under Rule 4 on 2026-09-20, when hardening the
 * N1 defect pushed the instrument to 319 lines. Extraction rather than comment-trimming —
 * the remedy this lane has used twice before, and the reason its largest files stay honest.
 *
 * WHAT LIVES HERE, AND WHY IT IS SEPARATE
 * A wash is a token at a percentage over the panel. It is a small model with its own
 * assertions, and it is the part of the apparatus that has been wrong TWICE:
 *
 *   - A1-03: the percentages were hand-entered, and the token-level check could not see
 *     them drift, because `--accent-primary` at 14% and at 18% are the same TOKEN.
 *   - N1 (Astra R6): the first fix sorted its washes into an UNORDERED signature, which
 *     discarded which wash pairs with which STATE. Swapping the selected/unselected
 *     ternary branches left the signature identical, so the guard returned `[]` while
 *     `deep-ocean` measured 4.26:1 on the wrong pairing. It proved a SET, not a PAIRING —
 *     the same shape as the defect it replaced, one level up.
 *
 * DEPENDENCY DIRECTION. `Wash` is declared in the instrument because `Surface` embeds it;
 * the scanner (`declarations`, `styledBlock`) and the panel maths (`washOverPanel`) are
 * imported from there too. Nothing here is imported BY the instrument, so the dependency
 * runs one way and there is no cycle — a type-only back-reference would have been erased
 * at build time but is still the kind of thing that breaks later.
 */

import { themeCycle, type ThemeId } from './UniversalThemeContext';
import {
  type Surface,
  type TextSite,
  type Wash,
  declarations,
  styledBlock,
  washOverPanel,
} from './themeContrastInstrument';


/**
 * The lens's wash form: `color-mix(in srgb, var(--X, …) N%, transparent)`.
 *
 * `[^)]*` after the token name, NOT `[^,)]*` — the fallback argument is separated by a
 * comma (`var(--accent-primary, #60c0f0)`), so a character class that excludes commas
 * cannot reach the closing paren and the pattern silently matches nothing. That mistake
 * made every block report "painted [(none)]", which is exactly the kind of silent
 * nothing this whole file exists to prevent.
 */
const WASH = /color-mix\(\s*in srgb,\s*var\(\s*(--[a-z0-9-]+)[^)]*\)\s*([\d.]+)%\s*,\s*transparent\s*\)/gi;

/**
 * A surface that states its own recipe. The same arguments produce the colour AND the
 * recorded wash, so the percentage cannot drift from the measurement that used it.
 */
export const washSurface = (id: ThemeId, name: string, percent: number, label?: string): Surface => ({
  label: label ?? `panel+${name}${percent}`,
  color: washOverPanel(id, name, percent),
  wash: { token: name, percent },
});

/** Every wash painted by the `background:` declarations of a block. */
export const backgroundWashes = (block: string): Wash[] => {
  const found: Wash[] = [];
  for (const decl of declarations(block, 'background')) {
    for (const m of decl.matchAll(WASH)) found.push({ token: m[1], percent: Number(m[2]) });
  }
  return found;
};

/** Every wash the site table declares. Theme-independent: a recipe is a token and a %. */
export const declaredWashes = (site: TextSite, id: ThemeId): Wash[] => {
  const found: Wash[] = [];
  for (const surfaces of Object.values(site.surfaces)) {
    for (const surface of surfaces(id)) if (surface.wash) found.push(surface.wash);
  }
  return found;
};

/**
 * The wash signature. **ORDERED, and the order is load-bearing.**
 *
 * This sorted its washes in the first version, and that was a real defect — found by
 * Astra's R6 pass, not by this lane's own tests. See `washDriftFor`.
 */
const washKey = (washes: Wash[]): string =>
  washes.map((w) => `${w.token}@${w.percent}%`).join(', ') || '(none)';

/**
 * A1-03, then hardened against **N1** (Astra R6, 2026-09-20).
 *
 * N1 WAS A DEFECT IN THE FIRST VERSION OF THIS CHECK, and it is worth stating plainly
 * because it is the same shape as the one A1-03 was written to fix. `washKey` sorted its
 * washes, throwing away WHICH wash pairs with WHICH state. Swapping the two ternary
 * branches in `Option` — selected ⇄ unselected — left the sorted signature **identical**,
 * so `washDrift()` returned `[]` for a picker whose two states had been exchanged, and
 * `deep-ocean` then measured **4.26:1** on the wrong pairing.
 *
 * The broken invariant: each foreground must clear contrast against the background of the
 * **same state**. Knowing that both washes occur somewhere is not the same claim. The
 * guard proved a SET, not a PAIRING — one level up from the token-only check it replaced,
 * which proved a token set and not a surface.
 *
 * So the signature is ordered, and it must match the stylesheet's declaration order. That
 * coupling is deliberate: a ternary's branch order IS the state mapping, so an edit that
 * reorders the branches is precisely the edit this has to catch.
 *
 * `block` is a parameter rather than a file read so the branch-swap can be exercised as a
 * negative control in `themeContrastCoverage.test.ts` — a guard that has never been shown
 * to fail is a guard that is only believed.
 */
export const washDriftFor = (site: TextSite, block: string, id: ThemeId): string => {
  const painted = washKey(backgroundWashes(block));
  const declared = washKey(declaredWashes(site, id));
  return painted === declared
    ? ''
    : `${site.file}::${site.component}: painted [${painted}] but declared [${declared}]`;
};

export const washDrift = (
  sites: TextSite[],
  id: ThemeId = (themeCycle as ThemeId[])[0],
): string[] => {
  const drift: string[] = [];
  for (const site of sites) {
    // The wash may be painted by an ancestor block — see `paintedBy`.
    const block = styledBlock(site.file, site.paintedBy ?? site.component);
    const message = washDriftFor(site, block, id);
    if (message) drift.push(message);
  }
  return drift;
};
