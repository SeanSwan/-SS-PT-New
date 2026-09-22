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

import { PROVENANCE } from './provenanceTags.mjs';
import { HOSTED_VIDEO_PROVIDERS } from './catalogueHosted.mjs';

// Re-exported so every existing `import { PROVENANCE } from './catalogue.mjs'`
// keeps working. The definition moved to `provenanceTags.mjs` when the hosted rows
// needed the same tags without creating an import cycle; the public name did not move.
export { PROVENANCE };

/**
 * PROVENANCE TAGS — see `provenanceTags.mjs`.
 *
 * Moved there when the hosted rows arrived and needed the same tags: importing them
 * from this file while this file imported the hosted rows back is an import cycle
 * whose failure mode is a temporal-dead-zone crash at load.
 */

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
    // THE WEIGHTS. Deliberately NOT 'v0.34.2' — that is the COMFYUI build in
    // `C:\ComfyUI-H3-v0.34.2-cu130`, and conflating the runtime's version with the model's is
    // the same class of mistake as repeating the provider id here. The licensor's sentence asks
    // which MODEL produced the asset; the runtime version is a different fact and is not
    // published by this row.
    modelVersion: 'MiniMax H3',
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

  /**
   * Wan 2.2 TI2V-5B — the model that actually rendered first.
   *
   * Added after a real 26.73-second generation on an RTX 5090, not from a spec sheet:
   * every figure below was observed. It is listed second only because H3 was the stated
   * target, but it is the one with no licence between Sean and a commercial video.
   *
   * Apache 2.0: no territorial carve-out, no application, no grant. That is the whole
   * reason it exists in this catalogue — when the H3 request was still pending, this
   * turned "waiting on a licensor" into "rendering tonight".
   */
  'comfyui/wan-2.2': Object.freeze({
    label: 'Wan 2.2 TI2V-5B (local, via ComfyUI)',
    // The exact checkpoint, not the family. "Wan 2.2" alone would not distinguish this from the
    // A14B tiers, and the row's measured figures below are the 5B TI2V build's, not theirs.
    modelVersion: 'Wan 2.2 TI2V-5B',
    transport: 'comfyui',
    kind: ['text2video', 'image2video'],
    costPerRunUsd: 0,
    enabled: false,
    // PROBED, not published: measured on this machine at 832x480x49f, 20 steps, 26.73s
    // wall, 25,385 MiB peak VRAM. The duration figure is frames/fps from that run.
    maxDurationSec: { value: 5, provenance: PROVENANCE.PROBED },
    maxResolution: { value: '1280x704', provenance: PROVENANCE.PUBLISHED },
    honorsNegativePrompt: PROVENANCE.PROBED,
    seedIsDeterministic: PROVENANCE.CLAIMED,
    attribution: 'Video generated with Wan 2.2',
    licence: Object.freeze({
      name: 'Apache License 2.0',
      // Apache 2.0 restricts nothing about running the weights anywhere, for any purpose.
      restricts: 'none',
      commercialUse: 'permitted',
      excludedTerritories: [],
      grantRequestDoc: null,
      // Apache 2.0 requires the NOTICE/attribution be PRESERVED, not prominently
      // displayed in a product UI the way H3's licence demands. Marking this false is a
      // statement about the licence, not a decision to hide the credit — the attribution
      // string above still travels with every asset's provenance either way.
      requiresAttribution: false,
    }),
  }),

  'minimax/hailuo-hosted': Object.freeze({
    label: 'MiniMax Hailuo (hosted API)',
    // The hosted family. No build number is published in the terms that were retrieved, and
    // inventing one would be worse than the family name: a fabricated version string is a fact
    // no one can later disprove, in the one record that is supposed to be evidence.
    modelVersion: 'MiniMax Hailuo',
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

  /**
   * HOSTED ROWS — Higgsfield's catalogue, whose behaviour is a vendor's published
   * claim rather than something measured on hardware we own.
   *
   * Split into `catalogueHosted.mjs` by provenance of evidence, and by rule 4: this
   * file was already 188 lines. Adding them here must not change how anything above
   * selects or transports, and it does not — they are rows, and the registry treats
   * a row as a row.
   *
   * Every one ships `enabled: false` like the rest, so this changes what the system
   * KNOWS without changing what it will DO.
   */
  ...HOSTED_VIDEO_PROVIDERS,

});

/**
 * THE SHAPE CONTRACT, and the validator that enforces it, now live in
 * `specShape.mjs` — split out for rule 4, and because the seam is real: this file is
 * DATA (which providers exist, what each claims), that one is the RULES a row must
 * satisfy to be a row at all. Re-exported so every existing import path is unchanged.
 */
import { assertSpecShape, ProviderSpecError } from './specShape.mjs';
export { assertSpecShape, ProviderSpecError };

/**
 * VALIDATE THE WHOLE CATALOGUE AT IMPORT — which this file has always claimed and
 * which the code did not do.
 *
 * `assertSpecShape` was reachable only from `registry.capabilities()`, so a malformed
 * row was not rejected when this module loaded. It was rejected when a CALLER asked for
 * that provider. The row shipped, the process booted, and the first person to learn the
 * catalogue was broken was whoever requested it — as a 500 for their request, or as a 500
 * for the WHOLE of `/v1/models` if the row happened to be served, because `listModels`
 * maps over the served ids and calls `capabilities()` uncaught.
 *
 * Running it here makes the promise true and moves the failure to boot, where the
 * operator is looking. It is the same reasoning `store.mjs` already applies to a corrupt
 * ledger: refuse to start rather than serve something wrong.
 */
for (const [id, spec] of Object.entries(VIDEO_PROVIDERS)) {
  assertSpecShape(id, spec);
}
