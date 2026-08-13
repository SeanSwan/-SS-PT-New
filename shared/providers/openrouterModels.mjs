/**
 * openrouterModels.mjs — the model catalogue and its declared capabilities.
 *
 * Split out of `openrouterImage.mjs` when that file crossed the 300-line cap
 * (rule 4). The division is real, not cosmetic: this file is DATA — which models
 * exist, what each one claims about itself — while the adapter next to it is
 * BEHAVIOUR. Adding a model should never mean editing transport code.
 *
 * Re-exported by `openrouterImage.mjs`, so every existing import keeps working.
 */

class ModelError extends Error {
  constructor(code, message) { super(message); this.name = 'ModelError'; this.code = code; }
}

/**
 * DEFAULT MODEL — Sean's standing instruction (2026-08-11): the ChatGPT image
 * generator is the default for all Forge work.
 *
 * Verified against the live OpenRouter catalogue the same day: this is the
 * NEWEST OpenAI image model that exists. GPT-5.5 and GPT-5.6 shipped (twelve 5.6
 * variants — luna/terra/sol, each with a batch mode) and every one of them is
 * TEXT-ONLY. OpenAI's image line has not followed its text line, so "upgrade to
 * 5.6" is not an available action. Re-check when a newer `openai/*-image*` id
 * appears in the catalogue.
 */
export const DEFAULT_MODEL = 'openai/gpt-5.4-image-2';

/**
 * `promptStyle` is DECLARED here rather than guessed from the provider name — a
 * name-regex would read "stable-diffusion-3-api" as tag-conditioned when SD3 is
 * caption-trained. All of these are caption-trained multimodal models, so all
 * declare 'sentence'. When a genuinely CLIP-conditioned model is added it
 * declares 'tag' and the compiler adapts with no code change.
 */
export const MODELS = Object.freeze({
  'google/gemini-3.1-flash-lite-image': {
    label: 'Gemini 3.1 Flash Lite Image', promptStyle: 'sentence',
    maxPromptChars: 4000, tier: 'cheapest',
  },
  'google/gemini-3.1-flash-image': {
    label: 'Gemini 3.1 Flash Image', promptStyle: 'sentence',
    maxPromptChars: 4000, tier: 'cheap',
  },
  'google/gemini-3-pro-image': {
    label: 'Gemini 3 Pro Image', promptStyle: 'sentence',
    maxPromptChars: 4000, tier: 'quality',
  },
  'openai/gpt-5.4-image-2': {
    label: 'GPT-5.4 Image 2', promptStyle: 'sentence',
    maxPromptChars: 4000, tier: 'quality',
  },
  'openai/gpt-5-image-mini': {
    label: 'GPT-5 Image Mini', promptStyle: 'sentence',
    maxPromptChars: 4000, tier: 'cheap',
  },
});

/**
 * Declared capabilities for a model, in the shape the compiler consumes.
 *
 * TRI-STATE HONESTY: anything unproven is 'claimed', and the compiler treats
 * 'claimed' as absent. Claiming 'verified' without a probe is exactly the lie
 * the tri-state exists to prevent — and the lie that cost this subsystem a full
 * session when a declared aspect ratio was never checked against the response.
 */
/**
 * QUARANTINE — capabilities that are NOT offered to the compiler.
 *
 * The tri-state did its job: it caught two capabilities that are accepted,
 * billed, and inert. Now that they are settled, keeping `false` in the hot path
 * is a loaded footgun with documentation — the compiler can still *see* a key
 * for something proven to be a lie, and a future edit could read it as an option.
 *
 * So the resolved-dead capabilities live here, out of reach of `capabilities()`,
 * where the compiler cannot import them. `caps.supportsSeed` is now `undefined`
 * rather than `false`: unrepresentable, not merely falsy.
 *
 * The evidence stays with them, because "why is this quarantined" must survive
 * longer than my memory of probing it.
 */
export const QUARANTINED_CAPABILITIES = Object.freeze({
  supportsSeed: {
    verdict: false, probedOn: '2026-08-12', probe: 'scripts/forge-seed-probe.mjs',
    evidence: 'identical prompt + identical seed produced different bytes (3 arms + control); '
      + 'parameter accepted, no 400, no effect',
  },
  seedIsDeterministic: {
    verdict: false, probedOn: '2026-08-12', probe: 'scripts/forge-seed-probe.mjs',
    // Stated, not cross-referenced. A pointer to a sibling entry is not evidence
    // — the test that enforces this table caught exactly that shortcut.
    evidence: 'arms A and B sent the identical prompt with seed 424242 and returned '
      + 'sha a58a6b8d5a9e4792 vs 3ccf25fff1d0a726 — different images from identical inputs',
  },
  supportsImageInit: {
    verdict: false, probedOn: '2026-08-12', probe: 'scripts/forge-i2i-influence.mjs',
    evidence: 'blue input #002882 -> #fbde5e (yellow), identical to the no-input control '
      + '#fcd158; accepted AND billed more ($0.006136 vs $0.003736) yet inert',
  },
  supportsInpainting: {
    verdict: false, probedOn: null, probe: null,
    evidence: 'never offered by this endpoint',
  },
});

export function capabilities(model = DEFAULT_MODEL) {
  const spec = MODELS[model];
  if (!spec) {
    throw new ModelError('E_UNKNOWN_MODEL',
      `Unknown model "${model}". Known: ${Object.keys(MODELS).join(', ')}`);
  }
  return {
    provider: model,
    modelVersion: model,
    label: spec.label,
    promptStyle: spec.promptStyle,     // DECLARED, not inferred
    maxPromptChars: spec.maxPromptChars,
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:5'],
    // supportsSeed / seedIsDeterministic / supportsImageInit / supportsInpainting
    // are NOT here. They are probed-false and live in QUARANTINED_CAPABILITIES
    // above, unreachable from the compiler. See that table for the evidence.
    honorsNegativePrompt: 'claimed',
  };
}

export { ModelError };
