/**
 * registry.mjs — video provider selection, licence enforcement, and request
 * validation. BEHAVIOUR; the catalogue next door is DATA.
 *
 * ── WHAT THIS REPLACES, AND WHAT IT DELIBERATELY DOES NOT ───────────────────
 * `contentStudioVideoGenerationService.mjs` was deleted on 2026-08-15 as "a path
 * that could never return a video" — true, it was fail-closed without keys, and
 * grep confirms it left no orphaned caller. But the deletion was lossy. Of its
 * three parts:
 *
 *   resolveVideoGenerationConfig  SUPERSEDED — env-sniffing across two vendors
 *                                 cannot express capability or licence. Dead.
 *   validateVideoGenerationInput  RESTORED below, improved: duration is now
 *                                 checked against the PROVIDER's declared
 *                                 maximum instead of a fixed [5,10,15,30] set
 *                                 that contradicted every real model's 6s cap.
 *   normalizeProviderResponse     RESTORED below, near-verbatim. Every hosted
 *                                 video API returns a differently-shaped
 *                                 envelope; that mapping is empirical knowledge
 *                                 gathered from real responses, and re-deriving
 *                                 it would mean re-making the same mistakes.
 *
 * The lesson recorded at the time: a component can be non-functional AND
 * load-bearing. Judging it on runtime behaviour alone missed what it was FOR.
 */

import { VIDEO_PROVIDERS, assertSpecShape, PROVENANCE } from './catalogue.mjs';

class ProviderError extends Error {
  constructor(code, message) { super(message); this.name = 'ProviderError'; this.code = code; }
}

const MAX_PROMPT_LENGTH = 500;
const VALID_CATEGORIES = new Set(['exercise-demo', 'social-clip', 'marketing']);
const VALID_STYLES = new Set(['cinematic', 'dynamic', 'minimal', 'editorial']);

/** Every known provider id, enabled or not. */
export function listProviders() {
  return Object.keys(VIDEO_PROVIDERS);
}

/**
 * Declared capabilities, in the shape a caller consumes.
 *
 * Provenance-tagged fields are UNWRAPPED here, and anything merely 'claimed' is
 * reported as `null` rather than its claimed value — the same rule the image
 * lane applies, for the same reason: a consumer that can see a claimed value
 * will eventually treat it as a fact.
 */
export function capabilities(id) {
  const spec = VIDEO_PROVIDERS[id];
  if (!spec) {
    throw new ProviderError('E_UNKNOWN_PROVIDER',
      `Unknown video provider "${id}". Known: ${listProviders().join(', ')}`);
  }
  assertSpecShape(id, spec);

  const trusted = (field) =>
    field && field.provenance !== PROVENANCE.CLAIMED ? field.value : null;

  return {
    provider: id,
    label: spec.label,
    transport: spec.transport,
    kind: [...spec.kind],
    enabled: spec.enabled === true,
    costPerRunUsd: spec.costPerRunUsd,
    maxDurationSec: trusted(spec.maxDurationSec),
    maxResolution: trusted(spec.maxResolution),
    // Raw provenance travels too, so a caller that genuinely wants to reason
    // about an unproven claim can — explicitly, never by accident.
    provenance: {
      maxDurationSec: spec.maxDurationSec?.provenance ?? PROVENANCE.CLAIMED,
      maxResolution: spec.maxResolution?.provenance ?? PROVENANCE.CLAIMED,
    },
    attribution: spec.attribution,
    licence: spec.licence,
  };
}

/**
 * Which providers hold a commercial-use grant.
 *
 * Read from the environment as a comma-separated allowlist. FAIL-CLOSED: an
 * unset variable grants nothing. Recording a grant is a deliberate act by
 * whoever received the licence email, not something inferred from the presence
 * of an API key.
 */
export function readGrants(env = process.env) {
  return new Set(
    String(env.SWAN_VIDEO_LICENCE_GRANTS || '')
      .split(',').map(s => s.trim()).filter(Boolean),
  );
}

/**
 * Which providers the operator has switched on.
 *
 * The catalogue ships every entry `enabled: false` and is frozen, so without
 * this the gate would be a lock with no key — fail-closed in the literal sense
 * that nothing could ever pass. Enablement and licence grant are deliberately
 * SEPARATE acts: a provider can be switched on for non-commercial use while its
 * commercial grant is still pending, which is exactly the current H3 position.
 */
export function readEnabled(env = process.env) {
  return new Set(
    String(env.SWAN_VIDEO_PROVIDERS_ENABLED || '')
      .split(',').map(s => s.trim()).filter(Boolean),
  );
}

/**
 * Resolve a provider for an intended use, or refuse with a reason a human can act on.
 *
 * The refusal is the point. A licence that is only enforced by someone
 * remembering it is not enforced, and this project has already proved that the
 * memory in question decays into "commercial use is blocked" — a sentence that
 * misled its own author about which thing was restricted.
 */
export function resolve(id, opts = {}) {
  const {
    commercial = true,
    territory = 'US',
    grants = readGrants(),
    enabled = readEnabled(),
    requireEnabled = true,
  } = opts;

  const caps = capabilities(id);
  const isEnabled = caps.enabled || enabled.has(id);

  if (requireEnabled && !isEnabled) {
    throw new ProviderError('E_PROVIDER_DISABLED',
      `Provider "${id}" is present but not enabled. Enabling is an explicit act — `
      + `add "${id}" to SWAN_VIDEO_PROVIDERS_ENABLED once you have read its licence.`);
  }

  const lic = caps.licence;
  const territoryExcluded = (lic.excludedTerritories || []).includes(territory);

  if (commercial && lic.commercialUse === 'requires-grant' && territoryExcluded) {
    if (!grants.has(id)) {
      throw new ProviderError('E_LICENCE_GRANT_REQUIRED',
        `"${id}" needs a written commercial grant to RUN in ${territory}. `
        + `Note this restricts running the model, NOT the ownership or use of video it produces. `
        + `Request template: ${lic.grantRequestDoc || 'none on file'}. `
        + `Once granted, add "${id}" to SWAN_VIDEO_LICENCE_GRANTS.`);
    }
  }

  // Report the RESOLVED enablement, not the catalogue's frozen default. Returning
  // `enabled: false` from a successful resolve would hand the caller an object
  // that contradicts the fact it was just granted — and a UI rendering that field
  // would tell Sean the provider is off while it is actively rendering.
  return { ...caps, enabled: isEnabled };
}

/**
 * Validate a generation request against a resolved provider.
 *
 * Duration is bounded by what the PROVIDER declares rather than a global set.
 * When the provider's maximum is merely 'claimed', it resolves to null and the
 * bound is not enforced — refusing on the strength of an unverified number
 * would be inventing a limit, so the check is skipped and the caller is told.
 */
export function validateVideoRequest(input = {}, caps) {
  if (!caps || !caps.provider) {
    throw new ProviderError('E_NO_PROVIDER', 'A resolved provider is required to validate a request.');
  }

  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  const category = typeof input.category === 'string' ? input.category : '';
  const style = typeof input.style === 'string' ? input.style : '';
  const duration = Number(input.duration);
  const initImage = input.initImage ?? null;

  if (!prompt) throw new ProviderError('E_BAD_INPUT', 'Prompt is required.');
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new ProviderError('E_BAD_INPUT', `Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer.`);
  }
  if (!VALID_CATEGORIES.has(category)) throw new ProviderError('E_BAD_INPUT', 'Video category is invalid.');
  if (!VALID_STYLES.has(style)) throw new ProviderError('E_BAD_INPUT', 'Video style is invalid.');
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new ProviderError('E_BAD_INPUT', 'Video duration is invalid.');
  }

  const durationBoundEnforced = caps.maxDurationSec !== null;
  if (durationBoundEnforced && duration > caps.maxDurationSec) {
    throw new ProviderError('E_BAD_INPUT',
      `"${caps.provider}" supports at most ${caps.maxDurationSec}s; ${duration}s was requested.`);
  }

  // IMAGE-FIRST LAW, tied to its actual cause.
  //
  // The blueprint states it absolutely, but its stated reason is cost: stills are
  // cents and video is dollars, so a text-only call gambles real money on an
  // uncomposed shot. That reasoning does not transfer to a local provider running
  // free on hardware Sean already owns — enforcing it there would block the exact
  // zero-cost path he asked for, in the name of saving money that is not spent.
  //
  // So the law binds where its cause is present: any provider that bills.
  // `costPerRunUsd: null` (unknown price) counts as billing — an unknown cost is
  // treated as a real one, which is the fail-closed direction.
  const billsPerRun = caps.costPerRunUsd === null || caps.costPerRunUsd > 0;
  if (billsPerRun && !initImage) {
    throw new ProviderError('E_IMAGE_FIRST_REQUIRED',
      `"${caps.provider}" bills per run, so it requires an approved still as its starting frame. `
      + `Generate and approve an image first, then animate it.`);
  }
  if (initImage && !caps.kind.includes('image2video')) {
    throw new ProviderError('E_UNSUPPORTED_KIND',
      `"${caps.provider}" does not support image-to-video.`);
  }
  if (!initImage && !caps.kind.includes('text2video')) {
    throw new ProviderError('E_UNSUPPORTED_KIND',
      `"${caps.provider}" requires an init image; it does not support text-to-video.`);
  }

  return { prompt, category, style, duration, initImage, durationBoundEnforced };
}

function firstString(...values) {
  return values.find(value => typeof value === 'string' && value.trim())?.trim() || null;
}

/**
 * Flatten a provider's response envelope into one shape.
 *
 * RESTORED from the deleted service, near-verbatim. The long alternation lists
 * are not defensive padding — each alternative is a shape some real API actually
 * returned. Trimming them to the "obvious" ones is how this breaks silently the
 * next time a vendor nests its payload one level deeper.
 */
export function normalizeProviderResponse(data = {}) {
  const nested = data.data && typeof data.data === 'object' ? data.data : {};
  const output = data.output && typeof data.output === 'object' ? data.output : {};

  const providerJobId = firstString(data.id, data.jobId, data.taskId, nested.id, nested.jobId, output.id);
  const videoUrl = firstString(
    data.videoUrl, data.video_url,
    nested.videoUrl, nested.video_url,
    output.videoUrl, output.url,
  );
  const rawStatus = firstString(data.status, nested.status, output.status);

  return {
    providerJobId,
    videoUrl,
    // A URL present means done regardless of what the status field says; several
    // APIs return 'processing' alongside a finished asset.
    status: videoUrl ? 'completed' : (rawStatus || 'queued'),
    rawStatus,
  };
}

export { ProviderError, MAX_PROMPT_LENGTH, VALID_CATEGORIES, VALID_STYLES };
