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
    supportsImageInit: true,
    supportsInpainting: false,

    /**
     * SEED — resolved from 'claimed' to false by PROBE, 2026-08-12.
     * Evidence: `scripts/forge-seed-probe.mjs`, 3 live generations on
     * `openai/gpt-5.4-image-2`, identical prompt.
     *
     *   A  seed=424242  sha=a58a6b8d5a9e4792  2321148 B
     *   B  seed=424242  sha=3ccf25fff1d0a726  2351454 B   <- same seed, DIFFERENT bytes
     *   C  seed=999001  sha=a9cb1935100f77fe  1965924 B
     *
     * The parameter is ACCEPTED (no 400) and has no observable effect, which is
     * the worst of the three possible answers: a rejection would at least be
     * loud. Recorded as false rather than true-but-useless, because the only
     * decision a caller makes from this flag is "is it worth sending", and it
     * is not.
     *
     * CONSEQUENCE FOR THE CONVERGENCE LOOP: reproduction cannot be bought with a
     * seed on this model. A winner is re-issued by keeping its exact PROMPT and
     * accepting a new roll, or by image-to-image from the winning image itself.
     * The run ledger stores prompt text for exactly this reason.
     */
    supportsSeed: false,
    seedIsDeterministic: false,

    honorsNegativePrompt: 'claimed',
  };
}

export { ModelError };
