/**
 * swanVocabulary.mjs — the words the compiler composes from.
 *
 * Split out of `swanPromptCompiler.mjs` at the 300-line cap (rule 4). The seam
 * matches the one already proven with the model catalogue: this is DATA — which
 * facets exist, what each intent defaults to, how a surface class behaves —
 * while the compiler is BEHAVIOUR. Adding a facet should never mean opening
 * slot-assembly code.
 */

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

export const INTENT_DEFAULTS = {
  hero:      { intent: 'full-bleed hero plate carrying the page', composition: 'single dominant gesture, generous negative space' },
  substrate: { intent: 'background substrate beneath content', composition: 'low-contrast, nothing competing with text' },
  texture:   { intent: 'tileable surface texture', output: 'seamless, edge-matched' },
  icon:      { intent: 'small-scale mark, legible at 24px', composition: 'centred, high contrast' },
  editorial: { intent: 'editorial illustration supporting a story', composition: 'asymmetric, one focal point' },
  demo:      { intent: 'instructional demonstration frame', composition: 'clear, unobstructed, side view' },
};

/** Public surfaces get the full enchantment budget; in-app stays calm (LAW 6). */
export const SURFACE_RULES = {
  'public':  { abstraction: 'high variety, one impossible phenomenon, cinematic' },
  'in-app':  { abstraction: 'low variety, calm, nothing competing with data' },
};
