/**
 * swanDirections.mjs — GATE 0. The options, at zero cost.
 *
 * `forge-compiler-contract.md` §6 specifies `directions(brief, n)` and says why it
 * exists: *"`directions()` costs nothing — it is text plus facet swatches.
 * Generating preview images for three directions triples spend before a choice is
 * made."* It was specified and never implemented, so the only way to see options
 * was `forge bracket … --confirm-spend`, which BILLS BEFORE YOU HAVE CHOSEN.
 *
 * THIS MODULE IS PURE. No I/O, no network, no provider, no clock, no random. It
 * imports vocabulary and nothing else. That is not a style preference — it is the
 * property that makes "zero cost" a fact rather than a promise, and
 * `directions.test.mjs` asserts it by scanning this file's own import list.
 *
 * TIER IS TRUTH (taste-discovery-grill.md §2 law 3). A direction backed by >=2 of
 * Sean's own picks is `evidence` and must cite the event ids; everything else is
 * `prior` and must SAY SO on the card. This module cannot know his picks — it is
 * pure — so evidence is INJECTED by the caller via `opts.evidence`. With no
 * injection every direction is `prior`, which is the honest cold-start state and
 * is rendered as such rather than hidden.
 *
 * Split from swanPromptCompiler.mjs at the 300-line cap (rule 4), matching the
 * seam swanVocabulary.mjs already documents. Re-exported from the compiler so the
 * CLI and MCP get it from one import path — one brain, not two.
 */

import { FACETS } from './swanVocabulary.mjs';

/**
 * The direction seeds — DATA, not behaviour (same split as FACETS).
 *
 * Each seed is a coherent facet BUNDLE plus the two things the contract requires a
 * direction to carry: an evocative `name`, and `phenomenon` — *"the single
 * impossible thing — load-bearing, never confetti"*.
 *
 * Coherence matters more than variety: the failure this prevents is a direction
 * that resolves to a contradiction (arctic light over ember palette), which reads
 * as noise and teaches the operator nothing about what they are choosing between.
 *
 * `paletteLaw` is 'A-swan-native' for every seed here because every facet comes
 * from `FACETS`, which IS Swan vocabulary. The field exists so that World-Engine
 * recipes (`worlds.md`, 18 DNA recipes) can be marked 'B-world-native' when that
 * wiring lands. Claiming a world palette before worlds are wired would be a
 * fabricated provenance, so none does.
 */
export const DIRECTION_SEEDS = Object.freeze([
  {
    name: 'Glacier Cathedral',
    sentence: 'A nave of ice, low vantage, the frame holding its breath. One dominant gesture, no clutter.',
    phenomenon: 'light bending through melt seams in a structure that has no ceiling',
    facets: ['Temperature>Arctic', 'Surface>Crystalline', 'Scale>Vast'],
    affinity: { hero: 3, substrate: 1, texture: 0, icon: 0, editorial: 1, demo: 0 },
  },
  {
    name: 'Slow Water',
    sentence: 'Melt as the subject, restrained contrast, the whole frame understated.',
    phenomenon: 'stillness that moves',
    facets: ['Mood>Subdued', 'Surface>Frost', 'Scale>Macro'],
    affinity: { hero: 1, substrate: 3, texture: 2, icon: 0, editorial: 2, demo: 1 },
  },
  {
    name: 'Prism Fault',
    sentence: 'A fracture in a crystal body, colour arriving from inside the material.',
    phenomenon: 'colour with no source',
    facets: ['Optics>Caustics', 'Surface>Crystalline', 'Optics>Dispersion'],
    affinity: { hero: 2, substrate: 1, texture: 1, icon: 1, editorial: 2, demo: 1 },
  },
  {
    name: 'Drafting Table',
    sentence: 'Monochrome, precise edges, strict construction. Nothing decorative survives.',
    phenomenon: 'a line that casts a shadow',
    facets: ['Colour>BW', 'Mark>FineLines', 'Form>Geometric'],
    affinity: { hero: 1, substrate: 2, texture: 2, icon: 3, editorial: 2, demo: 2 },
  },
  {
    name: 'Obsidian Plane',
    sentence: 'Most of the frame in shadow, one lit plane carrying everything.',
    phenomenon: 'a lit plane with nothing holding it up',
    facets: ['Mood>Dark', 'Form>Minimalist', 'Surface>Metal'],
    affinity: { hero: 3, substrate: 2, texture: 1, icon: 1, editorial: 1, demo: 0 },
  },
  {
    name: 'Ember Field',
    sentence: 'Low warm key, deep falloff, non-representational. Heat read as temperature, never as metal.',
    phenomenon: 'heat with no flame',
    facets: ['Temperature>Ember', 'Mood>Moody', 'Form>Abstract'],
    affinity: { hero: 2, substrate: 2, texture: 1, icon: 0, editorial: 2, demo: 0 },
  },
  {
    name: 'Woven Frost',
    sentence: 'A repeating modular lattice, seamless, read at extreme close range.',
    phenomenon: 'a lattice that grows while you watch it',
    facets: ['Form>Patterns', 'Surface>Frost', 'Scale>Macro'],
    affinity: { hero: 0, substrate: 2, texture: 3, icon: 1, editorial: 1, demo: 1 },
  },
  {
    name: 'Interference',
    sentence: 'A single source, brushed metal, colour that is a thickness rather than a pigment.',
    phenomenon: 'a surface whose colour is a measurement',
    facets: ['Optics>Interference', 'Surface>Metal', 'Mood>Subdued'],
    affinity: { hero: 2, substrate: 2, texture: 2, icon: 1, editorial: 1, demo: 1 },
  },
  {
    name: 'Quiet Frame',
    sentence: 'Available light, unstaged, wide. The decisive moment deliberately does not arrive.',
    phenomenon: 'a decisive moment that never arrives',
    facets: ['Render>Documentary', 'Mood>Subdued', 'Scale>Vast'],
    affinity: { hero: 2, substrate: 1, texture: 0, icon: 0, editorial: 3, demo: 3 },
  },
]);

/** Public surfaces get the full enchantment budget; in-app stays calm (LAW 6). */
const SURFACE_AFFINITY = Object.freeze({
  public: { 'Mood>Dark': 1, 'Scale>Vast': 1, 'Temperature>Arctic': 1, 'Form>Abstract': 1 },
  'in-app': { 'Mood>Subdued': 1, 'Form>Minimalist': 1, 'Surface>Metal': 1 },
});

/** Stable 32-bit FNV-1a. Deterministic across runs and machines — no Math.random. */
function stableHash(text) {
  let h = 2166136261;
  for (let i = 0; i < String(text).length; i += 1) {
    h ^= String(text).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) >>> 0;
}

/**
 * A swatch strip from facet names alone. Deterministic, and derived from the same
 * input every time — so the strip is a stable property of the direction rather
 * than a random decoration. No image bytes, no network, no palette lookup.
 */
export function swatchesFor(facets = []) {
  return facets.map((facet) => {
    const hue = stableHash(facet) % 360;
    // Low saturation, mid lightness — a reading strip, not a colour claim. The
    // real palette comes from the resolved slots, not from here.
    const sat = 22 + (stableHash(facet + ':s') % 14);
    const light = 44 + (stableHash(facet + ':l') % 18);
    return { facet, hue, hex: hslToHex(hue, sat, light) };
  });
}

function hslToHex(h, s, l) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const v = l / 100 - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * v).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Gate 0. Returns `n` directions for a brief, at zero cost.
 *
 * PURE: same brief + same opts always yields the same directions in the same
 * order. There is no clock, no random, and no provider.
 *
 * @param {object} brief            same shape `resolveSlots` accepts
 * @param {2|3}    [n]              the contract allows 2 or 3
 * @param {object} [opts]
 * @param {Record<string,string[]>} [opts.evidence]  theme/facet -> Sean's event ids.
 *        Injected by the caller because taste is not this module's to know.
 * @returns {Array<object>} Direction[]
 */
export function directions(brief = {}, n = 3, opts = {}) {
  const count = n === 2 ? 2 : 3; // the contract allows 2 or 3; anything else is 3
  const intent = brief.intent || 'hero';
  const surface = brief.surfaceClass || 'in-app';
  const evidence = opts.evidence || {};
  const text = String(brief.text || '');

  const scored = DIRECTION_SEEDS.map((seed) => {
    const intentScore = (seed.affinity && seed.affinity[intent]) || 0;
    const surfaceScore = seed.facets.reduce(
      (sum, f) => sum + (((SURFACE_AFFINITY[surface] || {})[f]) || 0), 0,
    );
    return { seed, score: intentScore + surfaceScore, tie: stableHash(text + '|' + seed.name) };
  });

  // Deterministic order: score desc, then a stable hash tie-break. Without the
  // tie-break, two directions scoring equally would order by array position, which
  // silently makes the third option an artefact of where someone appended it.
  scored.sort((a, b) => (b.score - a.score) || (a.tie - b.tie));

  return scored.slice(0, count).map(({ seed }) => {
    const ids = seed.facets.flatMap((f) => evidence[f] || []);
    const unique = [...new Set(ids)];
    return {
      name: seed.name,
      sentence: seed.sentence,
      phenomenon: seed.phenomenon,
      facets: [...seed.facets],
      paletteLaw: 'A-swan-native',
      swatches: swatchesFor(seed.facets),
      // Tier is truth. `evidence` requires >=2 of Sean's own picks behind it;
      // anything else is `prior` and the card must say so.
      tier: unique.length >= 2 ? 'evidence' : 'prior',
      ...(unique.length >= 2 ? { evidenceEventIds: unique } : {}),
      tierReason: unique.length >= 2
        ? `${unique.length} of your own closest picks back this direction.`
        : 'from the facet vocabulary — not yet backed by your picks. '
          + 'Two or more closest picks of this kind would flip it to EVIDENCE.',
    };
  });
}
