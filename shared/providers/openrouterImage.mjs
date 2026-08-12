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

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Declared model capabilities. `promptStyle` is DECLARED here rather than
 * guessed from the provider name — a name-regex would read
 * "stable-diffusion-3-api" as tag-conditioned when SD3 is caption-trained.
 *
 * All of these are caption-trained multimodal models, so all declare 'sentence'.
 * When a genuinely CLIP-conditioned model is added, it declares 'tag' and the
 * compiler adapts with no code change.
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
export function capabilities(model) {
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
export function verify(model, root = process.cwd()) {
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
      messages: [{ role: 'user', content: compiled.promptText }],
      modalities: ['image', 'text'],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    // Redact the key defensively in case a provider echoes the request.
    throw new ProviderError('E_PROVIDER_HTTP',
      `OpenRouter ${res.status}: ${body.slice(0, 500).split(key).join('<REDACTED_KEY>')}`);
  }

  const data = await res.json();
  if (data.error) throw new ProviderError('E_PROVIDER_ERROR', data.error.message || 'unknown provider error');

  const message = data.choices?.[0]?.message ?? {};
  const images = (message.images || [])
    .map((i) => i?.image_url?.url || i?.url)
    .filter(Boolean);

  if (images.length === 0) {
    throw new ProviderError('E_NO_IMAGE',
      `Model returned no image. text="${String(message.content || '').slice(0, 200)}"`);
  }

  return {
    model,
    images,                       // data: URIs or URLs, provider-dependent
    usage: data.usage ?? null,    // log actual vs estimate from call one
    finishReason: data.choices?.[0]?.finish_reason ?? null,
    promptStyle: compiled.promptStyle,
    seed: compiled.seed,
    brainVersion: compiled.brainVersion,
  };
}

export { ProviderError };
