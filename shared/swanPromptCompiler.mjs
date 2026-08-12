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

/**
 * SERIALIZATION STRATEGIES.
 *
 * The 12-slot map is the intermediate representation — it is the audit trail
 * (lawChecks can name WHICH slot failed), the diff surface (a facet change is
 * visible), and the capability-gating boundary (negative is separable). That
 * part is substance.
 *
 * How the IR becomes a STRING is a separate, provider-dependent question, and
 * the first implementation joined slots with '. ' — a telegraphic keyword stack.
 * Two independent hostile reviews said the same thing: natural-language image
 * models are trained on captions, and a 12-fragment staccato string carries no
 * syntactic signal about which modifier binds to which subject. Worse, 18 tests
 * asserted that one arbitrary serializer's output, locking the choice in.
 *
 * So: strategies. The IR is unchanged; only the rendering differs.
 */
export const SERIALIZERS = Object.freeze({
  /**
   * Flowing caption for natural-language models (Gemini, GPT-image, MiniMax).
   * Subject and style lead, modifiers attach as clauses. This is the DEFAULT
   * because it matches every provider currently on the roadmap.
   */
  sentence(slots) {
    const lead = [slots.styleAnchor, slots.subject].filter(Boolean)[0] || slots.intent;
    const setting = [slots.composition, slots.optics].filter(Boolean).join(', ');
    const look = [slots.light, slots.palette, slots.material].filter(Boolean).join(', ');
    const parts = [];
    if (slots.medium && lead) parts.push(`A ${slots.medium}: ${lead}`);
    else if (lead) parts.push(lead);
    // A medium with no lead used to vanish entirely, yielding a bare ".".
    else if (slots.medium) parts.push(`A ${slots.medium}`);
    if (setting) parts.push(`Framed ${setting}`);
    if (look) parts.push(`Lit and surfaced with ${look}`);
    if (slots.abstraction) parts.push(slots.abstraction);
    return `${parts.join('. ')}.`;
  },

  /**
   * Comma-delimited tag stack for CLIP-conditioned models (SDXL-class), which
   * genuinely do better with tags than prose.
   */
  tag(slots) {
    // The personification formula embeds the subject inside styleAnchor, so
    // emitting both duplicates it verbatim. Drop the bare subject when the
    // style anchor already contains it.
    const anchorHasSubject = Boolean(slots.styleAnchor && slots.subject
      && slots.styleAnchor.toLowerCase().includes(slots.subject.toLowerCase().trim()));
    const order = [anchorHasSubject ? null : 'subject', 'styleAnchor', 'medium',
      'composition', 'optics', 'light', 'palette', 'material', 'abstraction'].filter(Boolean);
    return order.map((k) => slots[k]).filter((v) => v && v.trim()).join(', ');
  },

  /**
   * The original '. '-join. Retained so the behaviour is available and testable
   * rather than deleted — but it is no longer the silent default.
   */
  fragment(slots) {
    const order = ['intent', 'subject', 'styleAnchor', 'medium', 'composition',
      'optics', 'light', 'palette', 'material', 'abstraction'];
    return `${order.map((k) => slots[k]).filter((v) => v && v.trim()).join('. ')}.`;
  },
});

/** Providers whose conditioning genuinely prefers tags over prose. */
const TAG_PROVIDERS = /sdxl|stable-?diffusion|comfy/i;

/**
 * Pick a strategy. Explicit `caps.promptStyle` wins; otherwise infer from the
 * provider; otherwise sentence. Never silently guesses a non-default for an
 * unknown provider — an unknown model is far likelier to be caption-trained.
 */
export function strategyFor(caps = {}) {
  if (caps.promptStyle && SERIALIZERS[caps.promptStyle]) return caps.promptStyle;
  if (caps.provider && TAG_PROVIDERS.test(caps.provider)) return 'tag';
  return 'sentence';
}

/** Render the IR to a string under a named strategy. */
export function serializeFor(strategy, slots) {
  const fn = SERIALIZERS[strategy];
  if (!fn) {
    const err = new Error(`E_UNKNOWN_SERIALIZER: "${strategy}". Known: ${Object.keys(SERIALIZERS).join(', ')}`);
    err.code = 'E_UNKNOWN_SERIALIZER';
    throw err;
  }
  return fn(slots);
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
  const promptText = serializeFor(promptStyle, slots);

  // Fail closed on a SUBSTANCELESS prompt. An empty slot map serializes to a
  // bare "." — which would be submitted to a paid provider and billed for.
  //
  // The threshold is deliberately tiny. A first version used 12 characters and
  // refused "a frozen lake" (11 stripped chars) — a legitimate terse brief.
  // That is the same false-positive failure the LAW filter's must-pass corpus
  // exists to prevent: a guard that blocks real work gets disabled. This checks
  // for the ABSENCE OF CONTENT, not for brevity.
  if (promptText.replace(/[^\p{L}\p{N}]/gu, '').length < 3) {
    const err = new Error('E_EMPTY_PROMPT: the brief resolved to no substantive content '
      + `(rendered: ${JSON.stringify(promptText)}). Refusing to submit a paid request.`);
    err.code = 'E_EMPTY_PROMPT';
    throw err;
  }

  const seed = Number.isInteger(brief.seed) ? brief.seed : seedFrom(promptText);

  const params = {};
  if (capOk(caps.seedIsDeterministic)) params.seed = seed;
  const negativeText = capOk(caps.honorsNegativePrompt) ? slots.negative : undefined;

  return {
    briefId: brief.briefId || null,
    brainVersion: BRAIN_VERSION,
    provider: caps.provider || 'unconfigured',
    modelVersion: caps.modelVersion || 'unspecified',
    promptStyle,
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
