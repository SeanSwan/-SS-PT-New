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
import { imageDimensions } from '../imageDimensions.mjs';
import { aspectDeviation, ASPECT_TOLERANCE } from '../variantRun.mjs';

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
 * The model catalogue and its declared capabilities live next door in
 * `openrouterModels.mjs` — data, not behaviour — and are re-exported here so
 * every existing import of this module keeps working unchanged. Split when this
 * file crossed the 300-line cap (rule 4).
 */
// NOTE: imported AND re-exported. `export ... from` alone is a pure re-export
// and does NOT create local bindings, so `verify()` below would have thrown
// ReferenceError on MODELS at runtime while every static check stayed silent.
import { DEFAULT_MODEL, MODELS, capabilities, ModelError } from './openrouterModels.mjs';

export { DEFAULT_MODEL, MODELS, capabilities, ModelError };

/**
 * The aspect ratio the brief asked for — read from the compiler's TYPED field.
 *
 * This used to regex `/(\d{1,2}:\d{1,2})/` out of `compiled.slots.output`, a
 * string the compiler also serializes into the prompt. Parsing your own prose
 * back into a parameter means an output slot reading "10:30 golden hour, 16:9"
 * ships `aspect_ratio: "10:30"` — first match wins, silently. The compiler now
 * carries `aspect` as structure and renders prose FROM it.
 *
 * The fallback is a constant, deliberately: an older compiled object without the
 * field gets the documented default rather than a re-parse of its prose.
 */
function aspectOf(compiled) {
  return compiled?.aspect || '16:9';
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

  /**
   * SEED — sent only when someone has grounds to send it.
   *
   * The compiler withholds `params.seed` while `seedIsDeterministic` is
   * 'claimed', which is correct: an unverified capability is treated as absent.
   * But that left the Forge permanently unable to reproduce any output, and a
   * tournament whose winner cannot be re-rendered is a casino, not a workflow.
   *
   * `opts.seed` is the explicit override the capability PROBE uses to find out
   * whether the parameter is honoured at all. It is not a default, and it does
   * not upgrade the capability — only a probe's evidence may do that.
   */
  const seedSent = Number.isInteger(opts.seed) ? opts.seed
    : (Number.isInteger(compiled?.params?.seed) ? compiled.params.seed : null);

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
      ...(seedSent === null ? {} : { seed: seedSent }),
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

  /**
   * MEASURE WHAT CAME BACK. The provider is ground truth; `aspect_ratio` is a
   * request, not a guarantee — providers clamp to their own supported tiers
   * (Gemini answers a 1.778 request with 1376x768 = 1.792). A clamped image is
   * usable; a SILENTLY clamped image is the same 'claimed'-read-as-'verified'
   * failure that caused every other defect here.
   *
   * Flagged, never fatal (the reviewer's call, and the right one): a 1376x768
   * hero is fine, being lied to about it is not. URL-delivered images are not
   * fetched just to measure them, so they honestly report null.
   */
  const dims = imageDimensions(images[0]);
  const requested = aspectOf(compiled);
  const deviation = dims ? aspectDeviation(requested, dims.width, dims.height) : null;

  /**
   * COST, NORMALISED HERE so no caller has to know a provider's response shape.
   *
   * The field is `usage.cost` — verified against a live response, not assumed.
   * An earlier version read `usage.total_cost`, which does not exist on this
   * endpoint, so every run wrote `costUsd: null` into the ledger while the
   * ledger advertised that it recorded spend. Same disease as the aspect ratio:
   * a field that is declared, plumbed, and never checked against reality.
   *
   * `total_cost` is kept as a fallback because the chat/completions shape (still
   * read above for providers that only answer there) uses it. There is no `id`
   * on this response, so cost cannot be resolved by a later lookup — if it is
   * not captured here it is lost.
   */
  const costUsd = data.usage?.cost ?? data.usage?.total_cost ?? null;

  return {
    model,
    images,                       // base64 payloads or URLs, provider-dependent
    usage: data.usage ?? null,    // raw, for anything that wants the token detail
    costUsd,                      // normalised — this is what the ledger records
    aspectRequested: requested,
    actualWidth: dims?.width ?? null,
    actualHeight: dims?.height ?? null,
    actualFormat: dims?.format ?? null,
    aspectDeviation: deviation === null ? null : Number(deviation.toFixed(4)),
    aspectOutOfTolerance: deviation === null ? null : deviation > ASPECT_TOLERANCE,
    promptStyle: compiled.promptStyle,
    seed: compiled.seed,
    seedSent,
    brainVersion: compiled.brainVersion,
  };
}

export { ProviderError };
