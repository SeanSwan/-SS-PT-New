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
 *   normalizeProviderResponse     RESTORED, near-verbatim — now in
 *                                 `normalizeResponse.mjs` and re-exported from here
 *                                 so every existing import path is unchanged. It moved
 *                                 because flattening a vendor's response envelope is a
 *                                 TRANSPORT concern, not a selection one, and this file
 *                                 was over rule 4's cap with it inlined. Every hosted
 *                                 video API returns a differently-shaped envelope; that
 *                                 mapping is empirical knowledge gathered from real
 *                                 responses, and re-deriving it would mean re-making the
 *                                 same mistakes.
 *
 * The lesson recorded at the time: a component can be non-functional AND
 * load-bearing. Judging it on runtime behaviour alone missed what it was FOR.
 */

import { VIDEO_PROVIDERS, assertSpecShape, PROVENANCE } from './catalogue.mjs';
import { normalizeProviderResponse } from './normalizeResponse.mjs';
import { licenceRefusal } from './licenceGate.mjs';

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
  // OWN property, not an inherited one. `VIDEO_PROVIDERS['constructor']` resolves through
  // the prototype chain to the `Object` constructor, so a truthiness test alone read a
  // prototype member as if it were a provider spec. It did fail closed — `assertSpecShape`
  // rejects a function — but it failed as E_BAD_SPEC, which says "our catalogue is broken"
  // for what is plainly an unknown provider, and it reported 400/404 to a caller who had
  // only named a provider that does not exist. `Object.hasOwn` is the honest test, and it
  // makes the refusal code match the actual reason.
  const spec = Object.hasOwn(VIDEO_PROVIDERS, id) ? VIDEO_PROVIDERS[id] : undefined;
  if (!spec) {
    throw new ProviderError('E_UNKNOWN_PROVIDER',
      `Unknown video provider "${id}". Known: ${listProviders().join(', ')}`);
  }
  assertSpecShape(id, spec);

  /**
   * A field is trusted only when it is WRAPPED as `{value, provenance}` and that
   * provenance is not `claimed`.
   *
   * The unwrapped case used to fall through to `field.value`, which for a bare number is
   * `undefined` — a SILENT failure that travelled a long way before doing damage:
   * `capabilities().costPerSecondUsd` became `undefined`, `toMicros` returned `null` for
   * it, and `null * duration` is ZERO in JavaScript, so a billing provider authored in
   * the wrong shape was priced at nothing. `assertSpecShape` now rejects the bare shape
   * at import; this returns an explicit `null` so the reading is never accidental.
   */
  const trusted = (field) =>
    field && typeof field === 'object' && field.provenance !== PROVENANCE.CLAIMED
      ? (field.value ?? null)
      : null;

  return {
    provider: id,
    label: spec.label,
    /**
     * THE WEIGHTS, not the provider. Exposed because `provenance.buildProvenance` reads it to
     * fill the record's `modelVersion`, and it used to fall back to `caps.provider` — so this
     * field's ABSENCE was the reason every generated asset recorded its provider name as its
     * model version. It is a plain string rather than a `{value, provenance}` envelope for the
     * same reason `label` and `attribution` are: it is a name the row declares, and the validator
     * refuses a row that does not declare one.
     */
    modelVersion: spec.modelVersion,
    transport: spec.transport,
    kind: [...spec.kind],
    enabled: spec.enabled === true,
    costPerRunUsd: spec.costPerRunUsd,
    /**
     * PER-SECOND BILLING, exposed as a NUMBER only when the vendor published it.
     *
     * A `claimed` rate resolves to null for exactly the reason a claimed duration
     * does: a consumer that can see a claimed rate will eventually multiply by it and
     * call the product a cost. A hosted vendor bills per second, so a per-run scalar
     * cannot express a price — `costEstimate.mjs` is what combines this rate with a
     * requested duration, and `costPerRunUsd` stays null on those rows on purpose.
     */
    costPerSecondUsd: trusted(spec.costPerSecondUsd),
    /**
     * D1. Whether the rate above is USABLE as a quote basis, and why.
     *
     * `costPerSecondUsd === null` says "no usable rate" and cannot say which of two very
     * different situations produced it: the vendor never published one, or one was published
     * and does not reconcile. Those license different actions — the first means go and find
     * out, the second means do not trust what you find — so the reason travels beside the
     * null rather than being inferred from it.
     *
     * A consumer deciding whether it may QUOTE must read this, not the rate's presence.
     */
    pricingStatus: spec.pricingStatus ?? 'published',
    // The competing observations, preserved separately and never combined. Exposed so a
    // caller can show WHY a rate is disputed instead of only that it is. See D1.
    observedRates: spec.observedRates ?? Object.freeze([]),
    reconciliation: spec.reconciliation ?? null,
    /**
     * D4. The ACTUAL billed charge, kept separate from the estimate on purpose.
     *
     * `costPerSecondUsd` answers "what should this cost"; this answers "what did it cost".
     * Always `null` today because no invoice has been observed, and it is exposed rather than
     * left internal so a consumer cannot mistake the published-rate estimate for a bill.
     */
    observedBilledCost: spec.observedBilledCost ?? null,
    /** The rate a consumer may actually QUOTE against — `null` whenever `pricingStatus` is not `published`. */
    activeUsableRate: spec.activeUsableRate ?? null,
    /**
     * D3. 'explicit-paid-only' | 'default-allowed'.
     *
     * THE MECHANISM BEHIND "non-default, paid". Before this field, the only thing stopping
     * an accidental hosted spend was an unrelated `costPerRunUsd: null`, and that stops being
     * true the moment the estimator can price the row — so the protection would have
     * evaporated at exactly the moment it started to matter. A policy that exists only as a
     * side effect of another field's absence is not a policy, and this is what replaces it.
     */
    selectionPolicy: spec.selectionPolicy ?? 'default-allowed',
    // 'run' | 'second' | 'generation'. Named so a caller never has to infer the unit
    // from which cost field happens to be populated.
    rateUnit: spec.rateUnit ?? 'run',
    // The vendor endpoint path. Null until an operator pastes the real one from the
    // vendor's OpenAPI reference — never guessed, because a wrong path fails at the
    // vendor with an opaque 404 AFTER the request has been authorised and costed.
    modelPath: typeof spec.modelPath === 'string' ? spec.modelPath : null,
    maxDurationSec: trusted(spec.maxDurationSec),
    maxResolution: trusted(spec.maxResolution),
    // Raw provenance travels too, so a caller that genuinely wants to reason
    // about an unproven claim can — explicitly, never by accident.
    provenance: {
      maxDurationSec: spec.maxDurationSec?.provenance ?? PROVENANCE.CLAIMED,
      maxResolution: spec.maxResolution?.provenance ?? PROVENANCE.CLAIMED,
      costPerSecondUsd: spec.costPerSecondUsd?.provenance ?? null,
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
    // The territories actually in play. `licenceGate.territories()` builds this from the
    // OPERATOR's declaration plus, optionally, one the request named — and a request may only
    // ever ADD a refusal. A caller that passes the singular `territory` still works.
    territories: territoryList = null,
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

  // The licence JUDGEMENT lives in `licenceGate.mjs` — extracted for rule 4, and because
  // deciding what a licence permits is a different act from looking a provider up. It
  // returns a refusal rather than throwing, so the error vocabulary stays in this file.
  //
  // EVERY territory in play is tested and the FIRST refusal wins. That matters because the
  // territory used to be read straight off the request, which let a caller declare its own
  // jurisdiction and switch the exclusion off. See `licenceGate.territories`.
  const toTest = Array.isArray(territoryList) && territoryList.length ? territoryList : [territory];
  for (const t of toTest) {
    const refusal = licenceRefusal({ id, licence: lic, commercial, territory: t, grants });
    if (refusal) throw new ProviderError(refusal.code, refusal.message);
  }

  // ── D3: "NON-DEFAULT" AS A MECHANISM, NOT A HOPE ────────────────────────────
  //
  // Astra, verbatim: *"The current `costPerRunUsd: null` refusal is a useful block, but
  // ceases to protect against accidental selection once the estimator supplies a valid
  // amount."* That is the whole finding. The property the operator asked for —
  // "secondary, NON-DEFAULT, paid" — had no mechanism; it was an accident of an unrelated
  // null, and it would have evaporated the first time `costEstimate.mjs` could price a
  // hosted row.
  //
  // PLACED AFTER THE LICENCE JUDGEMENT, deliberately. A licence refusal is a legal fact
  // about the provider and should be the first thing an operator sees; putting a policy
  // check in front of it would let someone satisfy the policy and then discover the legal
  // wall behind it, which reads as the gate moving. It also means every existing hosted
  // refusal keeps its current code and message, so no caller's contract changes.
  //
  // `explicitSelection` is the caller ASSERTING that a human or a stored policy chose this
  // provider by name, rather than a default, a fallback, a retry or a saturation path
  // arriving at it. It is a required affirmative: absent, undefined, falsy and a truthy
  // non-`true` value all refuse, because "the caller supplied a value" is not the same as
  // "the caller said yes" — the same rule `licenceRefusal` applies to `commercial`, and the
  // same trap that made `commercial: 0` skip the entire licence judgement.
  const explicitSelection = opts.explicitSelection === true;
  if (caps.selectionPolicy === 'explicit-paid-only' && !explicitSelection) {
    throw new ProviderError('E_HOSTED_REQUIRES_EXPLICIT_SELECTION',
      `"${id}" is a paid hosted provider and may only be chosen EXPLICITLY. This call did not `
      + 'assert an explicit selection, so it is treated as a default, a fallback, a retry or a '
      + 'saturation path — none of which may add a billable provider. Pass '
      + '`explicitSelection: true` only where the provider was named by a human or by a stored '
      + 'policy. Local generation is unaffected.');
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

export { ProviderError, MAX_PROMPT_LENGTH, VALID_CATEGORIES, VALID_STYLES, normalizeProviderResponse };

