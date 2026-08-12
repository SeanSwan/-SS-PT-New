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
// Rendering lives next door (rule-4 split). Imported for LOCAL use AND
// re-exported — `export ... from` alone creates no local binding (bitten 3×).
import { strategyFor, serializeFor, fitToBudget, SERIALIZERS } from './swanPromptSerializers.mjs';

export { strategyFor, serializeFor, fitToBudget, SERIALIZERS };

/**
 * 0.2.0 — the compiled object gained `aspect` (typed) and `aspectDivergence`.
 * Bumped because run records persist `brainVersion`: comparing a 0.1.0 run to a
 * 0.2.0 run compares outputs from two different compilers, and the ledger has to
 * be able to say so. A shape change with a frozen version number is how a
 * dataset quietly becomes uninterpretable.
 */
export const BRAIN_VERSION = '0.2.0';

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

// OPTICS (lens/stock/light picklists) removed at the rule-4 split: exported and
// read by nothing. Recover from git if a facet ever needs it.

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

  const promptStyle = strategyFor(caps);
  const rendered = serializeFor(promptStyle, slots);

  /**
   * THE KILL-LIST, INLINED INTO THE PROMPT — because the parameter channel is
   * dead twice over.
   *
   * `negativeText` is only populated when `honorsNegativePrompt` is 'verified'
   * (it is 'claimed' on every provider), AND the request body has no negative
   * field at all — so even flipping the capability would transmit nothing. Two
   * independent reasons the constraints could never reach a model. Every image
   * this system has produced was generated with ZERO anti-generic constraints:
   * no ban on iridescent gradients, glassmorphism, fantasy wallpaper, or
   * literal creature form. Those bans are most of what separates Swan output
   * from stock AI art.
   *
   * So it goes through the channel that IS honoured: the prompt.
   *
   * KNOWN RISK, stated rather than buried — caption-trained models can FIXATE on
   * nouns they are told to avoid ("no swans" is a known way to get swans). The
   * clause is therefore terse, placed last, and phrased as a rendering
   * instruction rather than a list of subjects. It is a candidate for A/B once
   * the bracket exists, which is exactly what a bracket is for.
   */
  const withAvoid = slots.negative
    ? `${rendered} Rendering constraints — avoid: ${slots.negative}.`
    : rendered;

  const fitted = fitToBudget(withAvoid, caps.maxPromptChars);
  const promptText = fitted.text;

  // OVERRIDE-VALIDATION GUARD — named honestly.
  //
  // This cannot fire on a normal brief: resolveSlots always applies intent and
  // surface defaults, so the only way to reach an empty render is by blanking
  // every slot through slotOverrides. So it is an input-validation check on
  // OVERRIDES, not a general prompt-emptiness guarantee. The error code keeps
  // its name for callers, but do not read it as broader protection than it is.
  //
  // Threshold is deliberately tiny (absence of content, not brevity). A first
  // version used 12 characters and refused "a frozen lake" (11 stripped) — a
  // legitimate terse brief, and the same false-positive class the must-pass
  // corpus exists to prevent.
  // Measure CONTENT slots, not the rendered string. Once the output contract
  // ("16:9") started being serialized, a fully-blanked brief still rendered
  // "Composed for a 16:9 frame." — substantive-looking, but it says nothing
  // about what to draw, and the guard silently became unreachable.
  const CONTENT_SLOTS = ['intent', 'subject', 'styleAnchor', 'medium', 'composition',
    'optics', 'light', 'palette', 'material', 'abstraction'];
  const contentChars = CONTENT_SLOTS
    .map((k) => String(slots[k] || ''))
    .join('')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .length;
  if (contentChars < 3) {
    const err = new Error('E_EMPTY_PROMPT: the brief resolved to no substantive content '
      + `(rendered: ${JSON.stringify(promptText)}). Refusing to submit a paid request.`);
    err.code = 'E_EMPTY_PROMPT';
    throw err;
  }

  const seed = Number.isInteger(brief.seed) ? brief.seed : seedFrom(promptText);

  const params = {};
  if (capOk(caps.seedIsDeterministic)) params.seed = seed;
  const negativeText = capOk(caps.honorsNegativePrompt) ? slots.negative : undefined;

  /**
   * ASPECT IS STRUCTURE, AND PROSE IS ITS PROJECTION — never the reverse.
   *
   * The provider used to recover the aspect ratio by running a regex over
   * `slots.output`, a string this compiler also serializes into the prompt text.
   * One field, two consumers, one structured and one prose. That breaks the
   * moment a brief carries an incidental ratio: an output slot reading
   * "10:30 golden hour light, 16:9" sends `aspect_ratio: "10:30"` to the
   * provider, because the first regex match wins — and nothing notices.
   *
   * So the ratio is now a typed field, and the provider reads THIS.
   */
  const aspect = brief.aspect || '16:9';

  /**
   * Divergence detector. This still parses the prose — but only to RAISE A FLAG,
   * never to decide anything. `aspect` above is the single source of truth for
   * the request. If a `slotOverrides.output` injects a conflicting ratio, the
   * prompt text and the API parameter would silently disagree about the frame;
   * previously that disagreement was undetectable, and the prose quietly won.
   */
  const proseRatio = /(\d{1,3}:\d{1,3})/.exec(String(slots.output || ''));
  const aspectDivergence = (proseRatio && proseRatio[1] !== aspect)
    ? { declared: aspect, inProse: proseRatio[1] }
    : null;

  return {
    briefId: brief.briefId || null,
    brainVersion: BRAIN_VERSION,
    provider: caps.provider || 'unconfigured',
    modelVersion: caps.modelVersion || 'unspecified',
    aspect,
    aspectDivergence,
    promptStyle,
    promptText,
    truncated: fitted.truncated,
    droppedSegments: fitted.droppedSegments,
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
