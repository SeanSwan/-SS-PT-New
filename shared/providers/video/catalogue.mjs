/**
 * catalogue.mjs — the video provider catalogue and its DECLARED capabilities.
 *
 * Mirrors the split the image lane already proved: this file is DATA (which
 * providers exist, what each one claims about itself, what its licence permits),
 * while `registry.mjs` next door is BEHAVIOUR. Adding a provider must never mean
 * editing selection or transport code.
 *
 * ── WHY A REGISTRY AT ALL ───────────────────────────────────────────────────
 * The service this supersedes picked its provider with
 * `env.DREAMINA_API_URL ? 'dreamina' : 'seedance'` — a two-provider if-statement
 * wearing a config function's clothes. It could not express "this model is free
 * locally but licence-restricted", which is the exact situation SwanStudios is
 * in, so the licence question had nowhere to live but a human's memory.
 *
 * ── TRI-STATE HONESTY (inherited from the image lane) ───────────────────────
 * Anything unproven is `'claimed'`, never `true`. The image lane learned this
 * expensively: a declared aspect ratio that was never checked against a real
 * response cost a full session. A spec here is a manufacturer's claim until a
 * probe promotes it, and `verify()` is what runs the probe.
 *
 * ── LICENCE IS A FIRST-CLASS FIELD, NOT A COMMENT ───────────────────────────
 * `licence.commercialUse` and `attribution` are structural. A provider whose
 * licence requires a grant cannot be selected for commercial output until that
 * grant is recorded — the registry refuses at SELECTION time, where the refusal
 * is cheap and legible, rather than at render time or, worse, never.
 *
 * This is what makes the MiniMax H3 outcome survivable either way: if the grant
 * is refused, the hosted entry registers as a peer and nothing above it changes.
 */

class ProviderSpecError extends Error {
  constructor(code, message) { super(message); this.name = 'ProviderSpecError'; this.code = code; }
}

/**
 * PROVENANCE TAGS — how a field's value came to be believed.
 *
 * 'probed'    a `verify()` run confirmed it against the real endpoint
 * 'published' taken from the vendor's own documentation, unprobed
 * 'claimed'   assumed or inferred; treat as ABSENT when making decisions
 *
 * The distinction is load-bearing: 'published' is what a vendor says, 'probed'
 * is what the machine did. Only the second is evidence.
 */
export const PROVENANCE = Object.freeze({ PROBED: 'probed', PUBLISHED: 'published', CLAIMED: 'claimed' });

/**
 * THE CATALOGUE.
 *
 * `enabled: false` on every entry is deliberate and fail-closed. Enabling a
 * provider is an explicit act with a licence consequence, so it is never the
 * default state of a freshly-added row.
 *
 * `costPerRunUsd: 0` for local entries is the whole reason Sean wants the local
 * path: a 5090 he already owns renders at electricity cost, not per-second
 * billing.
 */
export const VIDEO_PROVIDERS = Object.freeze({

  'comfyui/minimax-h3': Object.freeze({
    label: 'MiniMax H3 (local, via ComfyUI)',
    transport: 'comfyui',
    kind: ['text2video', 'image2video'],
    costPerRunUsd: 0,
    enabled: false,
    // Duration/resolution are the published model card figures. Nothing here has
    // been run on a 5090 yet, so none of it is 'probed'.
    maxDurationSec: { value: 6, provenance: PROVENANCE.PUBLISHED },
    maxResolution: { value: '1280x720', provenance: PROVENANCE.PUBLISHED },
    honorsNegativePrompt: PROVENANCE.CLAIMED,
    seedIsDeterministic: PROVENANCE.CLAIMED,
    attribution: 'Video generated with MiniMax H3',
    licence: Object.freeze({
      name: 'MiniMax H3 Model Licence',
      // The restriction is on RUNNING THE WEIGHTS in an excluded territory for
      // commercial purposes. It is NOT a restriction on the generated output —
      // conflating those two cost this project days of believing the footage
      // itself might be unusable.
      restricts: 'model-execution',
      commercialUse: 'requires-grant',
      excludedTerritories: ['US'],
      grantRequestDoc: 'docs/ai-workflow/AI-HANDOFF/MINIMAX-H3-LICENSING-REQUEST-2026-08-11.md',
      requiresAttribution: true,
    }),
  }),

  'minimax/hailuo-hosted': Object.freeze({
    label: 'MiniMax Hailuo (hosted API)',
    transport: 'https',
    kind: ['text2video', 'image2video'],
    // Non-zero and therefore image-first is enforced for this provider — see
    // `registry.mjs`. Left null rather than guessed: an invented price is worse
    // than an absent one, because a budget gate would silently trust it.
    costPerRunUsd: null,
    enabled: false,
    maxDurationSec: { value: 6, provenance: PROVENANCE.PUBLISHED },
    maxResolution: { value: '1280x720', provenance: PROVENANCE.PUBLISHED },
    honorsNegativePrompt: PROVENANCE.CLAIMED,
    seedIsDeterministic: PROVENANCE.CLAIMED,
    attribution: 'Video generated with MiniMax Hailuo',
    licence: Object.freeze({
      name: 'MiniMax API Terms of Service',
      // Paying for hosted inference buys the right to run it. This is precisely
      // why the hosted entry is the fallback if the local grant is refused.
      restricts: 'none-beyond-tos',
      commercialUse: 'permitted',
      excludedTerritories: [],
      grantRequestDoc: null,
      requiresAttribution: true,
    }),
  }),

});

/**
 * Fields every catalogue entry must carry. Enforced at read time by
 * `assertSpecShape` so a malformed row fails loudly at import rather than
 * producing `undefined` somewhere far away at render time.
 */
const REQUIRED_FIELDS = Object.freeze([
  'label', 'transport', 'kind', 'enabled',
  'maxDurationSec', 'maxResolution', 'attribution', 'licence',
]);

export function assertSpecShape(id, spec) {
  if (!spec || typeof spec !== 'object') {
    throw new ProviderSpecError('E_BAD_SPEC', `Provider "${id}" has no spec.`);
  }
  for (const field of REQUIRED_FIELDS) {
    if (spec[field] === undefined) {
      throw new ProviderSpecError('E_BAD_SPEC', `Provider "${id}" is missing required field "${field}".`);
    }
  }
  // Attribution is structural, not decorative: a licence that demands prominent
  // display is unsatisfiable if the string does not exist, so an empty one is a
  // spec error rather than a rendering-time surprise.
  if (spec.licence.requiresAttribution && !String(spec.attribution || '').trim()) {
    throw new ProviderSpecError('E_NO_ATTRIBUTION',
      `Provider "${id}" requires attribution but declares none.`);
  }
  if (!Array.isArray(spec.kind) || spec.kind.length === 0) {
    throw new ProviderSpecError('E_BAD_SPEC', `Provider "${id}" declares no generation kinds.`);
  }
  return spec;
}

export { ProviderSpecError };
