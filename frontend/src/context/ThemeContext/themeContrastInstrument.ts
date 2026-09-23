/**
 * themeContrastInstrument.ts
 * ==========================
 *
 * The measuring apparatus behind `themeContrast.test.ts`, extracted under Rule 4's
 * remedy list when that module reached 480 lines. It is the half that is mechanical
 * — finding text colours in stylesheets and resolving them against real backdrops —
 * and keeping it separate leaves the test file holding the assertions and the
 * reasoning, which is the half a reviewer needs to read.
 *
 * WHY THE TOKENS COME FROM THE APP
 * Values are resolved by `generateCSSVariables(id)` — the same function the app calls
 * to inject `:root`. The first version of the gate kept a hand-written `TOKEN_VALUE`
 * map, which is a second copy of the palette and can drift from it. There is no map.
 *
 * WHY THE SCAN IS DECLARATION-LEVEL
 * Round 3's CRITICAL finding lived in two structural blind spots at once: the gate
 * scanned ONE stylesheet, and it scanned only `var(--text-…)`. A text colour written
 * as `$swatch.icon` was not merely unscored, it was invisible — the gate could not
 * have failed if it had looked. So every `color:` declaration is extracted whatever
 * it is written as, and the token set it resolves to is compared against a declared
 * set. A new token, or a swapped one, fails loudly instead of scoring less.
 *
 * Reading to the terminating `;` at interpolation-depth zero is what makes a ternary
 * (`color: ${… ? 'var(--a)' : 'var(--b)'}`) yield BOTH tokens instead of neither.
 * `(?<![-\w])` keeps `border-color:`, `background-color:` and `scrollbar-color:` out,
 * and the `:` requirement keeps `color-mix(` out.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { themeCycle, type ThemeId } from './UniversalThemeContext';
import { generateCSSVariables } from '../../utils/theme/themeUtils';
import { compositeOver, parseColor } from './themeColorMath';

/** WCAG 2.1 AA for normal-size text. */
export const AA_NORMAL = 4.5;
/** WCAG 2.1 AA for UI components and graphical objects (1.4.11). */
export const AA_NON_TEXT = 3;

const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Read a stylesheet once, comments already removed. */
const sourceCache = new Map<string, string>();
const source = (file: string): string => {
  const cached = sourceCache.get(file);
  if (cached !== undefined) return cached;
  const text = stripComments(readFileSync(join(__dirname, file), 'utf8'));
  sourceCache.set(file, text);
  return text;
};

/**
 * The body of a named styled-component template literal — from its declaration to
 * the next top-level `export const`. Comments are already stripped, so the block is
 * exactly the CSS that component owns.
 */
export const styledBlock = (file: string, component: string): string => {
  const text = source(file);
  const marker = `export const ${component} = styled`;
  const start = text.indexOf(marker);
  if (start === -1) throw new Error(`${component} not found in ${file}`);
  const next = text.indexOf('\nexport const ', start + marker.length);
  return text.slice(start, next === -1 ? undefined : next);
};

/**
 * Every `<property>:` declaration in a block, with its full value text.
 *
 * Reading to the terminating `;` at interpolation-depth zero is what makes a ternary
 * (`color: ${… ? 'var(--a)' : 'var(--b)'}`) yield BOTH tokens instead of neither.
 * `(?<![-\w])` keeps `border-color:` out of a `color` scan and `background-color:` out
 * of a `background` scan, and the `:` requirement keeps `color-mix(` out.
 */
export const declarations = (block: string, property: string): string[] => {
  const found: string[] = [];
  const opener = new RegExp(`(?<![-\\w])${property}\\s*:`, 'g');
  let match: RegExpExecArray | null;

  while ((match = opener.exec(block))) {
    let i = match.index + match[0].length;
    let depth = 0;
    let value = '';
    while (i < block.length) {
      const ch = block[i];
      if (ch === '$' && block[i + 1] === '{') {
        depth = 1;
        value += '${';
        i += 2;
        continue;
      }
      if (depth > 0) {
        if (ch === '{') depth += 1;
        else if (ch === '}') depth -= 1;
      } else if (ch === ';') break;
      value += ch;
      i += 1;
    }
    found.push(value.trim());
  }
  return found;
};

/** Every `color:` declaration in a block. See {@link declarations}. */
export const colorDeclarations = (block: string): string[] => declarations(block, 'color');

/** Every custom property referenced by a declaration value, sorted and unique. */
export const varsIn = (declarations: string[]): string[] => {
  const names = new Set<string>();
  for (const decl of declarations) {
    for (const m of decl.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) names.add(m[1]);
  }
  return [...names].sort();
};

// ── Token values, straight from the app's own emitter ────────────────────────

const VARS = new Map<ThemeId, Map<string, string>>();
for (const id of themeCycle as ThemeId[]) {
  const flat = generateCSSVariables(id).replace(/\s*\n\s*/g, ' ');
  const map = new Map<string, string>();
  for (const m of flat.matchAll(/(--[a-z0-9-]+):\s*([^;]*);/gi)) map.set(m[1], m[2].trim());
  VARS.set(id, map);
}

export const token = (id: ThemeId, name: string): string => {
  const value = VARS.get(id)!.get(name);
  if (!value) throw new Error(`${id} does not emit ${name}`);
  return value;
};

/** `color-mix(in srgb, C N%, transparent)` === C at N% alpha. */
export const mixAlpha = (color: string, percent: number): string => {
  const c = parseColor(color);
  if (!c) throw new Error(`unparseable colour: ${color}`);
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${percent / 100})`;
};

export interface Surface {
  label: string;
  color: string;
  /**
   * The wash this surface is painted with, if any. Stated here so the percentage is
   * ASSERTED rather than merely used — see `washDrift` and `themeContrastSites.ts`.
   */
  wash?: Wash;
}

export interface TextSite {
  file: string;
  component: string;
  /**
   * The block whose `background:` actually paints the surface this text sits on, when
   * that is not the text's own block.
   *
   * `SystemLabel` is a child of `SystemRow`, and `OptionLabel` a child of `Option` — in
   * both cases the wash is declared in the PARENT. A check that looked only at the
   * text's own block therefore found no background at all and reported "painted
   * [(none)]" for exactly those two sites, which is what the first run of `washDrift`
   * did. The mapping is the point: text and backdrop routinely live in different blocks.
   */
  paintedBy?: string;
  threshold: number;
  note: string;
  /**
   * Token → the surfaces that token can land on. Must equal what the block
   * actually declares; the pairing matters, because a cross-product would test
   * the unselected label against the selected wash and manufacture a failure.
   */
  surfaces: Record<string, (id: ThemeId) => Surface[]>;
}

/** The panel's surface as painted: elevated over the opaque page. */
export const panel = (id: ThemeId): string =>
  compositeOver(token(id, '--bg-elevated'), token(id, '--bg-primary'));

export const washOverPanel = (id: ThemeId, name: string, percent: number): string =>
  compositeOver(mixAlpha(token(id, name), percent), panel(id));

/** A wash as painted: a token, at a percentage, over the panel. */
export interface Wash {
  token: string;
  percent: number;
}

// The wash model — Wash, washSurface, backgroundWashes, declaredWashes, washDrift —
// lives in `themeContrastWashes.ts`. Split under Rule 4 on 2026-09-20.

/**
 * Every lens stylesheet, DISCOVERED rather than listed.
 *
 * This replaced a hand-written array whose comment read "A new one must be declared
 * here or the gate fails." Nothing enforced that: `textBearingComponents()` iterates
 * the list, so a stylesheet missing from it was never scanned, never appeared in the
 * coverage assertion's `actual`, and left that assertion green. A new lens stylesheet
 * carrying a failing text colour would have been invisible — the round-3 blind spot,
 * reopened by the fix for it. A hand-written list is a second copy of the thing being
 * checked and rots exactly like one; this walks the directory instead.
 */
export const discoverLensStylesheets = (dir: string = __dirname): string[] =>
  readdirSync(dir).filter((f) => /^ThemeLens.*\.styles\.ts$/.test(f)).sort();

export const LENS_STYLESHEETS = discoverLensStylesheets();

/**
 * Text colours that are legitimately NOT palette tokens. Exactly one, and it is a
 * non-text graphic — see "WHAT THIS GATE DOES NOT COVER" in the test file. Listing it
 * rather than skipping unknown declarations is the point: anything new fails.
 */
export const NON_TOKEN_TEXT = [{ file: 'ThemeLensButton.styles.ts', component: 'LensButton' }];

export const key = (file: string, component: string): string => `${file}::${component}`;

/** Components in the lens stylesheets that carry a `color:` declaration. */
export const textBearingComponents = (): Array<{ file: string; component: string }> => {
  const found: Array<{ file: string; component: string }> = [];
  for (const file of LENS_STYLESHEETS) {
    const names = [...source(file).matchAll(/export const (\w+) = styled/g)].map((m) => m[1]);
    for (const component of names) {
      if (colorDeclarations(styledBlock(file, component)).length > 0) {
        found.push({ file, component });
      }
    }
  }
  return found;
};

// The site table lives in `themeContrastSites.ts` — data vs apparatus, split under
// Rule 4 on 2026-09-20 when the wash machinery pushed this module past 300 lines.
