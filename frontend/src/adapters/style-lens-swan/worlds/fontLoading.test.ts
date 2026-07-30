/**
 * FONT REALITY — a world may not request a typeface the app never loads.
 * =====================================================================
 * WHY (hostile round 6): a world's entire character is carried by
 * `world-title-font`. If that family is never loaded, the browser silently walks
 * the stack to the generic keyword and the world renders in the system UI face —
 * no error, no warning, no failing test. Same for a WEIGHT the loaded subset
 * does not include: the browser synthesises faux-bold/faux-italic, which looks
 * cheap on a display face and is invisible to every existing gate.
 *
 * This is the typography twin of the Law-A "no silent forever-fallback" check on
 * custom properties: assert against the REAL loader (`index.html`), not intent.
 *
 * THE RULE: at least one family in a recipe's font stack, BEFORE the generic
 * keyword, must be loaded at the requested weight. A stack may still name an
 * aspirational face first (e.g. Sora) — it just may not be the ONLY real option,
 * so the render is a deliberate choice rather than the system default.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { builtWorlds } from './registry';

const INDEX_CANDIDATES = ['index.html', '../index.html', 'frontend/index.html'];
const indexPath = INDEX_CANDIDATES.map((p) => resolve(process.cwd(), p)).find(existsSync);
if (!indexPath) {
  throw new Error(
    `font guard cannot locate index.html from cwd ${process.cwd()} — update ` +
      `INDEX_CANDIDATES (do NOT delete this check).`,
  );
}
const indexHtml = readFileSync(indexPath, 'utf8');

/**
 * A loaded axis is either a set of discrete static weights or a VARIABLE range.
 * Google Fonts serves `wght@200..800` as a single variable file covering every
 * weight in between — including the intermediate values this codebase actually
 * uses (650 / 720 / 750), which no static weight list can serve.
 */
interface Axis {
  readonly discrete: Set<number>;
  ranges: Array<[number, number]>;
}
const has = (axis: Axis, weight: number): boolean =>
  axis.discrete.has(weight) || axis.ranges.some(([lo, hi]) => weight >= lo && weight <= hi);
const isEmpty = (axis: Axis): boolean => axis.discrete.size === 0 && axis.ranges.length === 0;

/** family (lowercased) → loaded weights, split by upright vs italic axis. */
const LOADED: Map<string, { upright: Axis; italic: Axis }> = new Map();
const entry = (family: string) => {
  const existing = LOADED.get(family);
  if (existing) return existing;
  const fresh = {
    upright: { discrete: new Set<number>(), ranges: [] as Array<[number, number]> },
    italic: { discrete: new Set<number>(), ranges: [] as Array<[number, number]> },
  };
  LOADED.set(family, fresh);
  return fresh;
};
for (const match of indexHtml.matchAll(/family=([A-Za-z+0-9]+):(?:(ital),)?wght@([0-9,;.]+)/g)) {
  const family = match[1].replace(/\+/g, ' ').toLowerCase();
  const hasItalAxis = Boolean(match[2]);
  const loaded = entry(family);
  for (const spec of match[3].split(';')) {
    // With an `ital` axis each spec is `<ital>,<wght>`; otherwise just `<wght>`.
    const parts = spec.split(',');
    const ital = hasItalAxis ? Number(parts[0]) : 0;
    const raw = parts[hasItalAxis ? 1 : 0];
    const axis = ital === 1 ? loaded.italic : loaded.upright;
    const range = raw.match(/^(\d+)\.\.(\d+)$/);
    if (range) {
      axis.ranges.push([Number(range[1]), Number(range[2])]);
      continue;
    }
    const weight = Number(raw);
    if (Number.isFinite(weight)) axis.discrete.add(weight);
  }
}
// Families with no `wght` axis at all load the single default upright weight.
for (const match of indexHtml.matchAll(/family=([A-Za-z+0-9]+)(?=[&"'])/g)) {
  const family = match[1].replace(/\+/g, ' ').toLowerCase();
  if (!LOADED.has(family)) entry(family).upright.discrete.add(400);
}

/**
 * Display variants whose representation CSS applies `font-style: italic`. A
 * world wearing one needs its face loaded in the ITALIC axis at that weight, or
 * the browser fakes the slant (oblique synthesis) on a display serif.
 * Keep in lock-step with `lensRepresentationStyles.ts`.
 */
const ITALIC_DISPLAY_VARIANTS = new Set(['vaulted-editorial']);

const GENERIC = new Set(['sans-serif', 'serif', 'monospace', 'system-ui', 'cursive', 'fantasy']);

/** Split a CSS `font` shorthand into its weight and its family stack. */
const parseFontShorthand = (value: string): { weight: number; families: string[] } | null => {
  const m = value.match(/^\s*(\d{3})\s+.*?\/[\d.]+\s+(.+)$/);
  if (!m) return null;
  return {
    weight: Number(m[1]),
    families: m[2].split(',').map((f) => f.trim().replace(/^['"]|['"]$/g, '').toLowerCase()),
  };
};

describe('font reality · every built world', () => {
  it('parsed a real font loader out of index.html (anti-vacuous guard)', () => {
    expect(LOADED.size).toBeGreaterThanOrEqual(2);
    expect([...LOADED.values()].every((w) => !isEmpty(w.upright))).toBe(true);
    // At least one family must publish an italic axis, or the italic check below
    // would pass vacuously for want of any italic data at all.
    expect([...LOADED.values()].some((w) => !isEmpty(w.italic))).toBe(true);
    // And at least one VARIABLE range must have parsed, or a regression back to
    // static-only weights would silently disable the range half of this parser.
    expect([...LOADED.values()].some((w) => w.upright.ranges.length > 0)).toBe(true);
  });

  it('requests only typefaces + weights the app actually loads', () => {
    const failures: string[] = [];
    for (const world of builtWorlds()) {
      const raw = String(world.recipe.tokens?.['world-title-font'] ?? '');
      if (!raw) continue;
      const parsed = parseFontShorthand(raw);
      expect(parsed, `${world.id}: world-title-font is not a parseable font shorthand — "${raw}"`)
        .not.toBeNull();
      if (!parsed) continue;

      const displayVariant = world.recipe.components?.['text.display']?.variant ?? '';
      const needsItalic = ITALIC_DISPLAY_VARIANTS.has(displayVariant);
      const axis = needsItalic ? 'italic' : 'upright';
      const realOption = parsed.families.some((family) => {
        if (GENERIC.has(family)) return false;
        const loaded = LOADED.get(family);
        return Boolean(loaded && has(loaded[axis], parsed.weight));
      });
      if (!realOption) {
        const stack = parsed.families.filter((f) => !GENERIC.has(f));
        failures.push(
          `${world.id}: no family in [${stack.join(', ')}] is loaded in the ${axis} axis at weight ` +
            `${parsed.weight}${needsItalic ? ` (the "${displayVariant}" display variant applies font-style: italic)` : ''} ` +
            `— the browser will fall through to the generic keyword or synthesise it`,
        );
      }
    }
    expect(failures, `\n${failures.join('\n')}\n`).toEqual([]);
  });
});
