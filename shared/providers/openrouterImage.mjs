/**
 * openrouterImage.mjs — the first REAL provider adapter.
 *
 * Kimi K3's ruling, and the reason this exists: "You have 80 green tests
 * asserting the behavior of a machine that has never produced its actual
 * output. You are currently sequencing blind." Everything else queued is
 * polish on an unexercised system. This converts speculation into evidence.
 *
 * Implements exactly the three functions it specified:
 *   capabilities()  — with promptStyle DECLARED, never name-inferred
 *   generate()      — compiled prompt -> image bytes
 *   verify()        — is this provider actually reachable and configured
 *
 * DESIGN NOTES
 * - Capabilities are DATA. The compiler reads them; nothing here imports the
 *   compiler. Same contract creator Claude adopted for the video lane.
 * - Tri-state honesty: seedIsDeterministic / honorsNegativePrompt are
 *   'claimed' until a probe proves otherwise. Claiming 'verified' without a
 *   probe is exactly the lie the tri-state exists to prevent.
 * - FAIL-CLOSED: missing key or unknown model throws. Never fabricates media,
 *   never silently substitutes a model.
 * - The API key is read from the environment inside this module and never
 *   logged, echoed, or included in an error message.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * THE IMAGE API — not chat/completions.
 *
 * The first implementation posted to `/api/v1/chat/completions`, which has no
 * dimension control at all. That single wrong endpoint caused every problem
 * measured on 2026-08-11:
 *
 *   endpoint              model               cost      wall     output
 *   chat/completions      gpt-5.4-image-2     $0.2274   148.8s   1024x1024 SQUARE
 *   images                gpt-5.4-image-2     $0.0039    19.4s   1536x864  = 16:9 exactly
 *
 * 58x cheaper, 7.7x faster, and correct. chat/completions bills the image as
 * completion tokens (7,024 of them) and cannot honour an aspect ratio, so the
 * "aspect ratio in the prompt text" workaround was compensating for calling
 * the wrong door rather than for a model limitation.
 *
 * Every cost and latency figure gathered before this discovery is void.
 */
const ENDPOINT = 'https://openrouter.ai/api/v1/images';

/**
 * Declared model capabilities. `promptStyle` is DECLARED here rather than
 * guessed from the provider name — a name-regex would read
 * "stable-diffusion-3-api" as tag-conditioned when SD3 is caption-trained.
 *
 * All of these are caption-trained multimodal models, so all declare 'sentence'.
 * When a genuinely CLIP-conditioned model is added, it declares 'tag' and the
 * compiler adapts with no code change.
 */
/**
 * DEFAULT MODEL — Sean's standing instruction (2026-08-11): the ChatGPT image
 * generator is the default for all Forge work.
 *
 * Verified against the live OpenRouter catalogue on the same day: this is the
 * NEWEST OpenAI image model that exists. GPT-5.5 and GPT-5.6 shipped (twelve
 * 5.6 variants — luna/terra/sol, each with a batch mode) and every one of them
 * is TEXT-ONLY. OpenAI's image line has not followed its text line, so
 * "upgrade to 5.6" is not available for image output. Re-check this when a
 * newer `openai/*-image*` id appears in the catalogue.
 */
export const DEFAULT_MODEL = 'openai/gpt-5.4-image-2';

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
 * Extract the aspect ratio the brief asked for. The compiler stores it in the
 * output slot; falls back to 16:9 rather than letting the provider pick.
 */
function aspectOf(compiled) {
  const raw = String(compiled?.slots?.output || '');
  const m = raw.match(/(\d{1,2}:\d{1,2})/);
  return m ? m[1] : '16:9';
}

class ProviderError extends Error {
  constructor(code, message) { super(message); this.name = 'ProviderError'; this.code = code; }
}

/** Read the key from env or .env. Never returned to a caller, never logged. */
function apiKey(root = process.cwd()) {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  for (const p of [join(root, '.env'), join(root, '..', '.env')]) {
    if (!existsSync(p)) continue;
    for (const raw of readFileSync(p, 'utf8').split('\n')) {
      // Strip CR before matching. A `$`-anchored regex silently fails on a
      // CRLF file because `.` does not match `\r`, so the key appears absent
      // on Windows even though it is present — which reads as "unconfigured"
      // and fails closed for the wrong reason.
      const line = raw.replace(/\r$/, '');
      const m = line.match(/^OPENROUTER_API_KEY=(.*)$/);
      if (m) return m[1].trim();
    }
  }
  return null;
}

/**
 * Declared capabilities for a model, in the shape the compiler consumes.
 * Everything unproven is 'claimed', which the compiler treats as absent.
 */
export function capabilities(model = DEFAULT_MODEL) {
  const spec = MODELS[model];
  if (!spec) {
    throw new ProviderError('E_UNKNOWN_MODEL',
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
    // Unproven until a probe says otherwise. 'claimed' === absent to the compiler.
    supportsInpainting: false,
    supportsSeed: 'claimed',
    seedIsDeterministic: 'claimed',
    honorsNegativePrompt: 'claimed',
  };
}

/** Is the provider actually usable? Cheap, no spend, no generation. */
export function verify(model = DEFAULT_MODEL, root = process.cwd()) {
  const problems = [];
  if (!MODELS[model]) problems.push(`unknown model "${model}"`);
  if (!apiKey(root)) problems.push('OPENROUTER_API_KEY not found');
  return { ok: problems.length === 0, model, problems };
}

/**
 * Generate. Returns image bytes plus the usage the provider actually reported,
 * so estimated-vs-actual cost can be logged from the first call rather than
 * discovered on an invoice.
 *
 * @param {object} compiled  a CompiledPrompt from swanPromptCompiler
 * @param {object} [opts]    { root, timeoutMs, fetchImpl }
 */
export async function generate(compiled, opts = {}) {
  const { root = process.cwd(), timeoutMs = 180_000, fetchImpl = fetch } = opts;
  const model = compiled.provider;

  const check = verify(model, root);
  if (!check.ok) {
    throw new ProviderError('E_PROVIDER_UNCONFIGURED',
      `Refusing to generate: ${check.problems.join('; ')}`);
  }
  if (!compiled.promptText || compiled.promptText.trim().length < 3) {
    throw new ProviderError('E_EMPTY_PROMPT', 'Refusing to submit an empty prompt.');
  }

  const key = apiKey(root);
  const res = await fetchImpl(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://sswanstudios.com',
      'X-Title': 'SwanStudios Forge',
    },
    body: JSON.stringify({
      model,
      prompt: compiled.promptText,
      // Aspect ratio is a PARAMETER here, which is the entire point. Providers
      // clamp to their nearest supported tier (Gemini returns 1376x768 = 1.792
      // rather than exactly 1.778); GPT returns 1536x864 = 1.778 exactly.
      aspect_ratio: aspectOf(compiled),
      resolution: opts.resolution || '1K',
      n: 1,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    // Redact the key defensively in case a provider echoes the request.
    const safe = body.slice(0, 500).split(key).join('<REDACTED_KEY>');

    /**
     * A SAFETY REJECTION IS NOT A TRANSPORT ERROR, and must not be retried
     * blindly — a retry costs money and usually fails the same way.
     *
     * Measured 2026-08-12, 5 samples per serializer, same brief and content:
     *   sentence  5/5 accepted
     *   fragment  5/5 accepted
     *   tag       2/5 accepted   <- 60% rejection
     *
     * The CONTENT is identical; only the SHAPE differs. A bare comma-separated
     * keyword stack that names a living artist pattern-matches style-mimicry
     * and prompt-injection heuristics, while the same words in prose do not.
     * The personification formula puts an artist's name in the prompt by
     * design, which is safe as a sentence and hazardous as a tag.
     *
     * Surfaced as its own code so a caller can re-serialize as `sentence`
     * rather than treating a taste-shape problem as a network problem.
     */
    if (res.status === 400 && /safety system|content_policy|safety_violation/i.test(safe)) {
      throw new ProviderError('E_PROVIDER_SAFETY_REJECT',
        `Provider safety system rejected this prompt SHAPE (style=${compiled.promptStyle}). `
        + 'Identical content in "sentence" form is accepted; a bare tag stack naming an artist '
        + 'is not. Re-serialize as sentence rather than retrying. '
        + `Provider said: ${safe.slice(0, 200)}`);
    }

    throw new ProviderError('E_PROVIDER_HTTP', `OpenRouter ${res.status}: ${safe}`);
  }

  const data = await res.json();
  if (data.error) throw new ProviderError('E_PROVIDER_ERROR', data.error.message || 'unknown provider error');

  // Image API shape: data[].b64_json | data[].url. The old chat/completions
  // shape is still read as a fallback so a provider that only answers there
  // keeps working rather than silently returning nothing.
  const images = [
    ...(data.data || []).map((d) => d?.b64_json || d?.url),
    ...((data.choices?.[0]?.message?.images) || []).map((i) => i?.image_url?.url || i?.url),
  ].filter(Boolean);

  if (images.length === 0) {
    throw new ProviderError('E_NO_IMAGE',
      `Model returned no image. keys=${JSON.stringify(Object.keys(data)).slice(0, 120)}`);
  }

  return {
    model,
    images,                       // base64 payloads or URLs, provider-dependent
    usage: data.usage ?? null,    // log actual vs estimate from call one
    aspectRequested: aspectOf(compiled),
    promptStyle: compiled.promptStyle,
    seed: compiled.seed,
    brainVersion: compiled.brainVersion,
  };
}

export { ProviderError };
