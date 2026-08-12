/**
 * swanPromptCompiler.mjs — the 12-slot prompt composer. THE BRAIN.
 *
 * Turns a plain-language brief into a directed, provider-native prompt.
 * Implements docs/ai-workflow/design-brain/forge-compiler-contract.md.
 *
 * THREE THINGS THIS IS NOT:
 *  - Not a template. Slots are RESOLVED from intent + surface class + facets;
 *    a template would produce the same image with different nouns.
 *  - Not deterministic. `forgeVariants` needs controlled variance and provider
 *    seed honouring is unverified. The invariant is REPLAYABLE: everything
 *    needed to re-derive an output is returned and persisted.
 *  - Not a taste authority. swanLawFilter.mjs blocks; this composes. Separate
 *    files so the law can be tested without the composer.
 *
 * CAPABILITY-DRIVEN, AND CAPABILITIES MAY LIE. `seedIsDeterministic` and
 * `honorsNegativePrompt` are tri-state; anything not 'verified' is treated as
 * absent. A provider falsely claiming negative-prompt support would silently
 * void the kill-list, so unverified claims never gate safety behaviour.
 *
 * Dependency-free apart from the law filter.
 */

import { assertLawful } from './swanLawFilter.mjs';

export const BRAIN_VERSION = '0.1.0';

/**
 * Curated facet vocabulary — deliberately ~60, not the full ~765 of the source
 * taxonomy. Ship what the LAWs actually reference; grow only when a direction
 * cannot be expressed. The taxonomy is a garden, not a foundation.
 */
export const FACETS = Object.freeze({
  'Temperature>Arctic':   { light: 'cold rim light, 5600K falling to blue in shadow', palette: 'ice wing cyan over midnight sapphire' },
  // Ember must NOT reach for gold as a palette wash. LAW 2 allows gold only as a
  // PR numeral, <=1px filigree, a focus ring, or one badge — so a warm direction
  // is expressed as light temperature, never as metallic colour. The first
  // version of this facet said "gilded fern warmth" and was correctly rejected
  // by the LAW filter's own facet-lawfulness test.
  'Temperature>Ember':    { light: 'low warm key, 2700K, deep falloff', palette: 'warm ember tones over obsidian, no metallics' },
  'Mood>Subdued':         { material: 'matte surfaces, restrained contrast' },
  'Mood>Moody':           { light: 'single source, most of the frame in shadow' },
  'Mood>Dark':            { palette: 'obsidian dominant, one lit plane' },
  'Mark>FineLines':       { medium: 'fine-line rendering, precise edges' },
  'Mark>BroadStroke':     { medium: 'broad painterly strokes, visible mark-making' },
  'Form>Geometric':       { composition: 'strict geometric construction, symmetrical' },
  'Form>Patterns':        { composition: 'repeating modular pattern, seamless' },
  'Form>Abstract':        { subject: '', composition: 'non-representational, pure phenomenon' },
  'Form>Minimalist':      { composition: 'extreme negative space, single focal element' },
  'Render>Realistic':     { medium: 'photograph', optics: 'full-frame, natural perspective' },
  'Render>Cinematic':     { optics: 'anamorphic framing, shallow depth of field' },
  'Render>Documentary':   { optics: '35mm, available light, unstaged' },
  'Colour>BW':            { palette: 'monochrome, full tonal range, no colour cast' },
  'Optics>Caustics':      { material: 'caustic light through crystal, real refraction' },
  'Optics>Dispersion':    { material: 'spectral dispersion, red outside violet inside' },
  'Optics>Interference':  { material: 'thin-film interference banding' },
  'Scale>Macro':          { composition: 'extreme macro, subject fills frame' },
  'Scale>Vast':           { composition: 'wide, human figure for scale or none at all' },
  'Surface>Crystalline':  { material: 'faceted crystalline surfaces, internal reflection' },
  'Surface>Frost':        { material: 'frost bloom, dendritic ice growth' },
  'Surface>Metal':        { material: 'brushed metal, anisotropic highlight' },
});

/** Photographic vocabulary — picklists, not prose. */
export const OPTICS = Object.freeze({
  lens: ['tilt-shift', 'telephoto', 'ultra wide', 'macro', 'normal', 'vintage', 'fisheye'],
  stock: ['Kodak Portra 400', 'Kodak Tri-X 400', 'CineStill 50', 'Fujichrome Velvia 100', 'Ilford HP5+ 400'],
  light: ['back lighting', 'side lighting', 'top lighting', 'soft lighting', 'contrasty lighting', 'window-blind light'],
});

const INTENT_DEFAULTS = {
  hero:      { intent: 'full-bleed hero plate carrying the page', composition: 'single dominant gesture, generous negative space' },
  substrate: { intent: 'background substrate beneath content', composition: 'low-contrast, nothing competing with text' },
  texture:   { intent: 'tileable surface texture', output: 'seamless, edge-matched' },
  icon:      { intent: 'small-scale mark, legible at 24px', composition: 'centred, high contrast' },
  editorial: { intent: 'editorial illustration supporting a story', composition: 'asymmetric, one focal point' },
  demo:      { intent: 'instructional demonstration frame', composition: 'clear, unobstructed, side view' },
};

/** Public surfaces get the full enchantment budget; in-app stays calm (LAW 6). */
const SURFACE_RULES = {
  'public':  { abstraction: 'high variety, one impossible phenomenon, cinematic' },
  'in-app':  { abstraction: 'low variety, calm, nothing competing with data' },
};

/**
 * The personification formula — slot 4's only legal form.
 * `[Artist]'s [their actual medium] depicting [subject]`, never `by [Artist]`.
 * Naming the artist's real discipline is what stops generic output.
 */
export function personify(artist, artistMedium, subject) {
  if (!artist) return '';
  const who = String(artist).trim().replace(/'s$/i, '');
  const med = String(artistMedium || 'work').trim();
  const what = String(subject || '').trim();
  return what ? `${who}'s ${med} depicting ${what}` : `${who}'s ${med}`;
}

function capOk(value) {
  return value === 'verified' || value === true;
}

/** Deterministic-ish seed from a string, used only when no seed is supplied. */
function seedFrom(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 2_147_483_647;
}

/** Resolve the 12 slots from a brief. Pure; no I/O. */
export function resolveSlots(brief = {}) {
  const facets = Array.isArray(brief.facets) ? brief.facets : [];
  const slots = {
    intent: '', subject: brief.text || '', medium: 'photograph', styleAnchor: '',
    composition: '', optics: '', light: '', palette: '', material: '',
    abstraction: '', negative: '', output: '',
  };

  Object.assign(slots, INTENT_DEFAULTS[brief.intent] || INTENT_DEFAULTS.hero);
  Object.assign(slots, SURFACE_RULES[brief.surfaceClass] || SURFACE_RULES['in-app']);

  for (const f of facets) {
    const patch = FACETS[f];
    if (patch) {
      for (const [k, v] of Object.entries(patch)) {
        if (v === '') { slots[k] = ''; continue; }
        slots[k] = slots[k] ? `${slots[k]}, ${v}` : v;
      }
    }
  }

  if (brief.artist) {
    slots.styleAnchor = personify(brief.artist, brief.artistMedium, brief.text);
  }

  // Negative slot always carries the kill-list, even when a provider cannot use it.
  slots.negative = 'iridescent gradient, lens flare, causeless particles, glassmorphism, '
    + 'literal creature form, fantasy wallpaper, watermark, text artifacts';

  slots.output = [brief.aspect || '16:9', slots.output].filter(Boolean).join(', ');

  Object.assign(slots, brief.slotOverrides || {});
  return slots;
}

/**
 * Compile a brief into a provider-ready prompt.
 * Throws E_LAW_VIOLATION (from the law filter) or E_CAPABILITY_UNVERIFIED.
 */
export function compileImage(brief = {}, caps = {}) {
  const slots = resolveSlots(brief);
  const facets = Array.isArray(brief.facets) ? brief.facets : [];

  const lawResult = assertLawful(slots, facets);

  if (brief.aspect && Array.isArray(caps.supportedAspectRatios)
      && caps.supportedAspectRatios.length && !caps.supportedAspectRatios.includes(brief.aspect)) {
    const err = new Error(`E_CAPABILITY_UNVERIFIED: provider "${caps.provider}" does not support aspect ${brief.aspect}`);
    err.code = 'E_CAPABILITY_UNVERIFIED';
    throw err;
  }

  const ordered = ['intent', 'subject', 'styleAnchor', 'medium', 'composition',
    'optics', 'light', 'palette', 'material', 'abstraction'];
  const promptText = ordered.map((k) => slots[k]).filter((v) => v && v.trim()).join('. ') + '.';

  const seed = Number.isInteger(brief.seed) ? brief.seed : seedFrom(promptText);

  const params = {};
  if (capOk(caps.seedIsDeterministic)) params.seed = seed;
  const negativeText = capOk(caps.honorsNegativePrompt) ? slots.negative : undefined;

  return {
    briefId: brief.briefId || null,
    brainVersion: BRAIN_VERSION,
    provider: caps.provider || 'unconfigured',
    modelVersion: caps.modelVersion || 'unspecified',
    promptText,
    negativeText,
    seed,
    params,
    slots,
    facetsApplied: facets.filter((f) => FACETS[f]),
    lawChecks: lawResult.checks,
  };
}

/** Video compile. Image-first is enforced HERE, in core — never only in a UI. */
export function compileVideo(brief = {}, caps = {}, initImageAssetId) {
  if (!initImageAssetId) {
    const err = new Error('E_IMAGE_FIRST_REQUIRED: video must be initialised from an approved still. '
      + 'Stills cost cents; video costs dollars, and image-to-video conforms far better than text-to-video.');
    err.code = 'E_IMAGE_FIRST_REQUIRED';
    throw err;
  }
  const compiled = compileImage(brief, caps);
  return { ...compiled, initImageAssetId, params: { ...compiled.params, init_image: initImageAssetId } };
}
