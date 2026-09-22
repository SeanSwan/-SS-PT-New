/**
 * catalogueHosted.mjs — the HOSTED (remote, per-second-billed) provider rows.
 *
 * ── WHY THIS IS A SIBLING FILE, NOT MORE ROWS IN catalogue.mjs ──────────────
 * `catalogue.mjs` is already 188 lines and rule 4's cap is 300. Twelve hosted rows
 * at the verbosity the local rows use would blow through it, and the fix for that
 * is not to write terser comments — the local rows' comments are the reason the
 * licence rules survived contact with three reviewers.
 *
 * So the split is by PROVENANCE OF EVIDENCE, which is the real seam:
 *
 *   catalogue.mjs        providers whose behaviour was measured on hardware we own
 *   catalogueHosted.mjs  providers whose behaviour is a vendor's published claim
 *
 * That distinction is not cosmetic here. Figures below were `published` — taken
 * from Higgsfield's own documentation and rate card — and NOTHING in this file has
 * been executed against the real endpoint. The one thing that has been verified is
 * the CONTRACT (auth header shape, submit/poll/cancel paths, status vocabulary),
 * because that is quoted verbatim from the vendor's docs.
 *
 * ── ONE FIGURE IS NOW DISPUTED, AND IT IS NOT THE ONE YOU WOULD GUESS (D1) ──
 * "Published" was written as though it meant "reproduced". It does not. On
 * 2026-09-20 an Astra consult went looking for `seedance-2.5` at the rate below and
 * **could not reproduce it**: *"The cause cannot be determined from the packet."*
 * Staleness, a different configuration, an API-specific price, a promotion and a
 * plain error all remain live hypotheses, and nothing here distinguishes them.
 *
 * So that row's `costPerSecondUsd.value` is **null** and its `pricingStatus` is
 * `disputed`. The old figure is kept, not deleted — as an UNRECONCILED HISTORICAL
 * OBSERVATION with the provenance it has. `null` is the fail-closed reading and it
 * is already wired: `registry.trusted()` -> `costEstimate.estimateRunCostMicros()`
 * -> `null` -> `spendGuard` refuses the run. An unpriced row cannot be quoted.
 *
 * What is FORBIDDEN here, and is the reason this is a paragraph rather than a
 * one-line change: do NOT average the observations, do NOT pick the cheapest, and
 * do NOT treat the highest as a proven maximum. A conservative-looking number still
 * fails if an omitted billing dimension can exceed it. The rate is unknown, not
 * merely uncertain.
 *
 * ── THE RATE TABLE IS A PROVIDER-FEE CLAIM, NOT A COST CLAIM (D4) ───────────
 * Higgsfield hosts MiniMax H3 at **$0.13/sec**. The 5090 already runs that same
 * model locally, and this lane records its provider fee as **$0**. A 6-second clip
 * is therefore $0.78 in PROVIDER FEES hosted against $0 in PROVIDER FEES local.
 *
 * Read that literally, because the earlier wording did not. `$0` is a claim about
 * what the provider charges. It is NOT a claim that local generation is free: it
 * excludes electricity, depreciation, maintenance and the operator's own time, none
 * of which this lane has measured. Astra's ruling: *"Do not turn `$0` provider fees
 * into a claim of zero electricity, depreciation, maintenance, or opportunity
 * cost."* The comparison above is also not a claim that hosted ever becomes cheaper
 * — under a zero local provider fee, **positive hosted charges never become cheaper
 * on provider fees alone**. Hosted value is capability, capacity, or time saved, and
 * those are separate quantities that this file does not price.
 *
 * The four quantities are deliberately NOT collapsed into one number: the provider
 * charge estimate (published rate x duration, see `costEstimate.mjs`), the maximum
 * liability the guard admits, the ACTUAL billed charge (unknown — the vendor's
 * status response carries no cost field), and the local operating cost (unmeasured).
 * Only the first two are computed anywhere today.
 *
 * ── WHAT IS DELIBERATELY ABSENT ─────────────────────────────────────────────
 * `modelPath` is `null` on every row. The vendor's per-model endpoint paths live
 * behind a generated OpenAPI reference that was not fully retrieved, and INVENTING
 * a path is worse than leaving it null: a wrong path fails at the vendor with an
 * opaque 404 after the request has already been authorised and costed. A null path
 * fails at `verify()` with an instruction. See `higgsfield.mjs`.
 */

// Imported from its own module rather than re-exported through `catalogue.mjs`.
// `catalogue.mjs` imports THIS file's rows, so taking PROVENANCE from there would be
// a cycle that happens to resolve today because `export ... from` yields a live
// binding. A cycle that works by accident is a cycle that breaks on a reorder.
import { PROVENANCE } from './provenanceTags.mjs';

/**
 * The vendor's licence position.
 *
 * ── THIS WAS WRONG ON FIRST WRITE, AND ASTRA CAUGHT IT ──────────────────────
 * The first version asserted `commercialUse: 'permitted'`, reasoning by analogy with
 * `minimax/hailuo-hosted`: paying for hosted inference buys the right to run it. The
 * analogy is plausible and it is not evidence. Astra's ruling:
 *
 *   "The packet's description of hosted H3 as 'permitted' is NOT sufficient hosted
 *    licence evidence. Retrieve hosted commercial-use and territory terms before
 *    enabling that row. Local restrictions neither automatically transfer to hosted
 *    execution nor disappear merely because a provider is renamed."
 *
 * So the field is `evidence: 'unretrieved'`, and `registry.resolve()` REFUSES any
 * commercial request against a row in that state. This is the fail-closed reading:
 * an unknown licence position is not a permissive one, and the previous value would
 * have let a hosted call proceed on the strength of an assumption I made up.
 *
 * To clear it: retrieve the vendor's commercial-use and territory terms, then set
 * `commercialUse` to what they actually say and drop `evidence`.
 *
 * ── D2: TWO FIELDS HERE WERE MIS-READABLE AS FACTS, AND ONE STILL IS ────────
 * Astra's second finding was not about a missing retrieval. It was that two fields
 * in this object **look like answers while their questions are open**:
 *
 *   `excludedTerritories: []`   reads as "worldwide" — but the territory facts have
 *                               never been read. `exclusionList()` maps an absent or
 *                               empty list to `[]`, so "no exclusion recorded" and
 *                               "no exclusion exists" are the same bytes.
 *   `requiresAttribution: false` reads as "attribution not required" — but the terms
 *                               that were retrieved **condition attribution on other
 *                               documentation**. `false` understates a live condition.
 *
 * Astra, verbatim: *"Empty exclusions and `requiresAttribution: false` must not mean
 * 'worldwide' and 'no attribution required' while those facts are unknown."*
 *
 * So both facts now carry an explicit **evidence status** beside them, and neither
 * the empty array nor the boolean is permitted to stand alone as an answer:
 *
 *   - `territoryEvidence` / `attributionEvidence` are the status fields. `specShape`
 *     enforces the coupling (see `assertSpecShape`), so a row cannot mark a fact
 *     unretrieved AND claim the permissive reading of it. That is the same rule this
 *     file already applies to `commercialUse` via the evidence flag, applied once per
 *     field rather than once per object.
 *   - `requiresAttribution` is now **`true`**, which is the fail-closed reading of a
 *     condition we have not adjudicated: showing attribution when none was owed costs
 *     nothing, and omitting it when one was owed is a compliance breach. `specShape`
 *     requires a boolean, so "unknown" is not expressible here — the safe boolean is.
 *
 * ── WHAT WAS ACTUALLY RETRIEVED, AND BY WHOM (dated, not asserted) ──────────
 * These terms were retrieved **by an Astra consult on 2026-09-20**, not first-hand by
 * this lane, and they are recorded as an OBSERVATION rather than as an adjudicated
 * position. That distinction is the whole point of `termsRefs` below: provenance for
 * evidence is what stops a summary of a document becoming the document.
 *
 * Astra's summary of what the retrieved terms say: commercial use of outputs is
 * permitted, BUT standalone redistribution / pass-through developer access is
 * restricted, some training use of submitted content is allowed, and attribution is
 * conditioned on other documentation (§§4.4, 11.5, 11.8).
 *
 * **"Pass-through developer access" is close to what a hosted route IS.** Astra:
 * *"These are material facts to adjudicate against Swan's intended use; they do not
 * justify changing every hosted row to `permitted`."* That adjudication has not
 * happened. It is an operator decision, and until it is made `evidence` stays set and
 * enablement stays BLOCKED.
 */
const HOSTED_LICENCE = Object.freeze({
  name: 'Higgsfield API Terms of Service (retrieved 2026-09-20; NOT adjudicated)',
  restricts: 'unverified',
  // NOT 'permitted'. See above. `resolve()` refuses commercial use while this is set.
  // CLEARING THIS IS A TWO-PART ACT: set `commercialUse` to what the terms say, set the
  // two evidence statuses below, and only then drop the flag. Dropping it alone would
  // publish an unadjudicated reading as a settled one.
  evidence: 'unretrieved',
  commercialUse: 'unverified',
  // NOT evidence of "worldwide". See D2 above — read this with `territoryEvidence`.
  excludedTerritories: Object.freeze([]),
  territoryEvidence: 'unretrieved',
  grantRequestDoc: null,
  // NOT evidence of "attribution optional". See D2 above — read with `attributionEvidence`.
  requiresAttribution: true,
  attributionEvidence: 'unretrieved',
  // The dated terms evidence, so the observation above survives into the record instead of
  // living only in this comment. Provenance for evidence, not a substitute for it.
  termsObservedOn: '2026-09-20',
  termsRefs: Object.freeze([
    Object.freeze({
      ref: 'Higgsfield API Terms of Service',
      sections: '§§4.4, 11.5, 11.8',
      observedOn: '2026-09-20',
      observedBy: 'astra-consult (not first-hand — see D2)',
      findings: Object.freeze([
        'commercial use of OUTPUTS permitted',
        'standalone redistribution / pass-through developer access RESTRICTED',
        'some training use of submitted content permitted',
        'attribution conditioned on other documentation',
      ]),
      adjudicated: false,
    }),
  ]),
});

/**
 * Video rows. `rate` is USD per SECOND of output — the vendor's published unit.
 *
 * The rate lives in `costPerSecondUsd`, NOT `costPerRunUsd`. That is a deliberate
 * type distinction rather than a formatting choice: a per-run scalar cannot express
 * "6 seconds of Kling 3.0", and forcing one into the other is how a budget gate
 * silently trusts a number that was never true. `costPerRunUsd` stays `null` on
 * every hosted row — which the existing spend guard already reads as "unknown cost,
 * therefore a billing provider, therefore refuse" — and `costEstimate.mjs` is what
 * turns a rate plus a requested duration into a per-run figure the guard can use.
 *
 * ── D1: ONE ROW IS PRICED AT `null` ON PURPOSE, AND MUST STAY THAT WAY ──────
 * `seedance-2.5` carries `null` where it used to carry `0.0738`. This is not an
 * omission waiting to be filled in with a better guess. The consult could not
 * reproduce the figure and could not determine why, so the honest state is
 * **unknown**, and unknown is the one reading that cannot spend money: `null`
 * resolves through `capabilities()` to a `null` cost estimate, and `spendGuard`
 * refuses a run whose cost cannot be bounded. See `DISPUTED_SEEDANCE_PRICING` for
 * the observations that were kept instead of the number.
 *
 * A reader tempted to "restore" the rate should note what restoring it would mean:
 * it would make the row quotable again on the strength of a figure nobody has
 * reproduced, which is the exact defect this quarantine exists to prevent.
 */
const DISPUTED_SEEDANCE_PRICING = Object.freeze({
  /**
   * The one status word a consumer should branch on. `disputed` is deliberately not
   * `unknown`: `unknown` invites someone to go and find out, while `disputed` says a
   * figure exists, was published, and does not reconcile. They license different actions.
   */
  pricingStatus: 'disputed',
  /** Astra's required reading: *"active usable rate: unknown; pricing status: disputed; executable quote: refused."* */
  activeUsableRate: null,
  /** *"observed billed cost: null"* — until supported by actual billing evidence. Nothing here is an invoice. */
  observedBilledCost: null,
  /**
   * Competing observations, stored SEPARATELY and never combined.
   *
   * Astra, verbatim: *"Do not average rates, choose the cheapest, or treat the highest
   * observed rate as a proven maximum. A conservative-looking number still fails if an
   * omitted billing dimension can exceed it."* So each row below carries its own channel,
   * configuration, date and conditions, and none of them is reduced to a single figure.
   */
  observedRates: Object.freeze([
    Object.freeze({
      // F7 (round 27). The unit is now the field, not an assumption about the field. Both
      // observations used to be stored as `usdPerSecond`, which was a TRUE statement of the
      // unit for this one and a FALSE one for the clip below — and the false one was not
      // merely cosmetic, because the probe's own A4b test asserted that field was a number
      // and so locked the wrong unit in. Astra: *"do not encode a rate that was never
      // observed."* `amountUsd` + `unit` cannot make that mistake: each observation states
      // what it measured.
      amountUsd: 0.0738,
      unit: 'second',
      channel: 'Higgsfield published rate card (as originally recorded)',
      configuration: 'UNSPECIFIED — duration, resolution and reference-video mode were not recorded',
      observedOn: '2026-09-19',
      conditions: 'published list rate, NOT an invoice; no billed run supports it',
      provenance: PROVENANCE.PUBLISHED,
      status: 'unreconciled-historical-observation',
      comparable: true,
    }),
    Object.freeze({
      // PER CLIP, and the field now says so. Dividing this by a guessed duration to produce a
      // per-second figure would manufacture a rate nobody observed — the forbidden
      // "choose the cheapest" move in reverse.
      amountUsd: 3.23,
      unit: 'clip',
      channel: 'Operator-supplied YouTube walkthrough (auto-captioned transcript)',
      configuration: 'ONE UGC clip, duration not stated — the unit is a clip, not a second',
      observedOn: '2026-09-20',
      conditions: 'a CONSUMER SUBSCRIPTION-CREDIT cost, not a usage-billed rate',
      provenance: PROVENANCE.CLAIMED,
      status: 'different-billing-model',
      // Astra D4: the transcript *"compares consumer subscription plans with usage
      // billing—not local execution with hosted execution"*. Recording this as a
      // competing RATE would import that category error into the price table, so it is
      // kept as evidence of what the operator saw and marked non-comparable. Dividing it
      // by a guessed duration to manufacture a per-second figure is exactly the forbidden
      // "choose the cheapest" move in reverse.
      comparable: false,
    }),
  ]),
  /** What the consult could and could not establish, so the next reader does not re-run it. */
  reconciliation: Object.freeze({
    attemptedOn: '2026-09-20',
    attemptedBy: 'astra-consult',
    outcome: 'not-reproduced',
    // Astra: "The cause cannot be determined from the packet." Every hypothesis is still live.
    liveHypotheses: Object.freeze([
      'the recorded figure is stale',
      'it describes a different configuration',
      'it is an API-specific price distinct from the published card',
      'it was a promotion',
      'it was an error',
    ]),
  }),
});

const VIDEO_ROWS = Object.freeze([
  // [slug, label, attributionName, usdPerSecond | null, pricing?]
  // `null` is a PRICE, not a gap — see DISPUTED_SEEDANCE_PRICING above.
  ['seedance-2.5', 'Seedance 2.5 (hosted)', 'Seedance 2.5', null, DISPUTED_SEEDANCE_PRICING],
  ['kling-3.0', 'Kling 3.0 (hosted)', 'Kling 3.0', 0.112],
  ['pixverse-6', 'PixVerse 6 (hosted)', 'PixVerse 6', 0.115],
  // THE ONE THAT MATTERS. Same model the 5090 runs locally at $0 PROVIDER FEES — not at
  // $0 total cost; see the header, and D4.
  ['minimax-h3', 'MiniMax H3 (hosted)', 'MiniMax H3', 0.13],
  ['ltx-2.5-pro', 'LTX 2.5 Pro (hosted)', 'LTX 2.5 Pro', 0.17],
  ['wan-3.0', 'Wan 3.0 (hosted)', 'Wan 3.0', 0.20],
]);

function videoRow([slug, label, attributionName, usdPerSecond, pricing]) {
  return Object.freeze({
    label,
    // THE WEIGHTS. `attributionName` is reused rather than a fifth column: it is already the
    // vendor's name for the model, taken from the same rate card as the price beside it, and a
    // second spelling of it is a second thing to get wrong. What matters is that it is the
    // MODEL — `seedance-2.5` is the id, `Seedance 2.5` is the model, and the provenance record
    // needs the latter.
    modelVersion: attributionName,
    transport: 'https',
    kind: Object.freeze(['text2video', 'image2video']),
    // A per-run scalar is NOT knowable without a duration. Left null rather than
    // guessed — the same rule the local hosted peer already follows, and the reason
    // the image-first law binds here: an unknown price is treated as a real one.
    costPerRunUsd: null,
    // `null` here is a PRICE (D1), not a gap. `provenance` records where the observation
    // came from; `pricingStatus` records whether it is usable. Those are different facts,
    // which is why a quarantined row keeps PUBLISHED provenance and a `disputed` status
    // rather than having its history erased.
    costPerSecondUsd: Object.freeze({ value: usdPerSecond, provenance: PROVENANCE.PUBLISHED }),
    // D1. `published` means the figure is usable as a quote basis; `disputed` means it is
    // not, and `activeUsableRate` is null. A consumer must branch on THIS, not on whether
    // `costPerSecondUsd.value` happens to be populated.
    pricingStatus: pricing?.pricingStatus ?? 'published',
    observedRates: pricing?.observedRates ?? Object.freeze([]),
    reconciliation: pricing?.reconciliation ?? null,
    /**
     * D4. THE ACTUAL BILLED CHARGE, as a quantity SEPARATE from the estimate above.
     *
     * Always `null` today, and that is the honest value: no invoice has ever been observed,
     * and the vendor's status response carries no cost field. The field exists so that the
     * published-rate ESTIMATE is never mistaken for what was CHARGED — `costEstimate.mjs`
     * computes a ceiling comparison, not a bill, and its own header says so.
     *
     * Kept beside `costPerSecondUsd` rather than derived from it because the two answer
     * different questions: "what should this cost" and "what did it cost". A later
     * reconciliation writes here without touching the rate.
     */
    observedBilledCost: pricing?.observedBilledCost ?? null,
    /** The rate a consumer may actually quote against — `null` whenever `pricingStatus` is not `published`. */
    activeUsableRate: pricing?.activeUsableRate ?? usdPerSecond,
    // D3. THE MECHANISM BEHIND "non-default, paid". Until this field existed, the only
    // thing stopping an accidental hosted spend was an unrelated `costPerRunUsd: null`,
    // which stops being true the moment the estimator can price a row. A policy that
    // exists only as a side effect of another field's absence is not a policy.
    // `registry.resolve()` refuses a row carrying this unless the caller says the
    // selection was explicit.
    selectionPolicy: 'explicit-paid-only',
    enabled: false,
    // Duration and resolution are per-model and were NOT published in the sources
    // retrieved. `claimed` is honest, and the registry turns a claimed value into
    // null, so no unverified bound is enforced and none is invented.
    maxDurationSec: Object.freeze({ value: null, provenance: PROVENANCE.CLAIMED }),
    maxResolution: Object.freeze({ value: null, provenance: PROVENANCE.CLAIMED }),
    honorsNegativePrompt: PROVENANCE.CLAIMED,
    seedIsDeterministic: PROVENANCE.CLAIMED,
    attribution: `Video generated with ${attributionName} via Higgsfield`,
    // Unverified endpoint path. `higgsfield.mjs` refuses to submit until this is
    // filled from the vendor's OpenAPI reference; it is never guessed.
    modelPath: null,
    rateUnit: 'second',
    licence: HOSTED_LICENCE,
  });
}

/**
 * DoP is billed per GENERATION, not per second — the one video row whose unit
 * differs, which is exactly why it is declared separately rather than forced into
 * the per-second shape and multiplied by a duration it does not use.
 */
const PER_GENERATION_ROW = Object.freeze({
  'higgsfield/dop': Object.freeze({
    label: 'Higgsfield DoP (hosted)',
    // The model the row's own attribution string names, for the same reason as `videoRow`.
    modelVersion: 'Higgsfield DoP',
    transport: 'https',
    kind: Object.freeze(['image2video']),
    costPerRunUsd: 0.125,
    // D3, same as the per-second rows: a flat price is no more safe to select by accident
    // than a metered one. See `videoRow`.
    selectionPolicy: 'explicit-paid-only',
    enabled: false,
    maxDurationSec: Object.freeze({ value: null, provenance: PROVENANCE.CLAIMED }),
    maxResolution: Object.freeze({ value: null, provenance: PROVENANCE.CLAIMED }),
    honorsNegativePrompt: PROVENANCE.CLAIMED,
    seedIsDeterministic: PROVENANCE.CLAIMED,
    attribution: 'Video generated with Higgsfield DoP',
    modelPath: null,
    rateUnit: 'generation',
    licence: HOSTED_LICENCE,
  }),
});

export const HOSTED_VIDEO_PROVIDERS = Object.freeze({
  ...Object.fromEntries(VIDEO_ROWS.map(r => [`higgsfield/${r[0]}`, videoRow(r)])),
  ...PER_GENERATION_ROW,
});

/** Every hosted video model id, for a caller that wants to enumerate them. */
export function listHostedVideoProviders() {
  return Object.keys(HOSTED_VIDEO_PROVIDERS);
}

/**
 * The image models are registered here as REFERENCE ONLY and deliberately not as
 * selectable providers.
 *
 * `validateVideoRequest` is a video validator — it requires a duration and a video
 * kind. Registering an image row in `VIDEO_PROVIDERS` would hand it to a validator
 * that would refuse it for the wrong reason, which is the same class of defect as
 * enforcing the image-first law against a free provider. The image lane needs its
 * own validator before it needs its own catalogue rows; until then these rates are
 * recorded so the still-then-animate ladder can be costed, and nothing can select
 * them by accident.
 */
export const HOSTED_IMAGE_RATES = Object.freeze({
  'soul-2': Object.freeze({ usdPerImage: 0.0032, provenance: PROVENANCE.PUBLISHED }),
  'soul-cinema': Object.freeze({ usdPerImage: 0.0032, provenance: PROVENANCE.PUBLISHED }),
  'marketing-studio-image': Object.freeze({ usdPerImage: 0.0059, provenance: PROVENANCE.PUBLISHED }),
  'qwen-image-3': Object.freeze({ usdPerImage: 0.03, provenance: PROVENANCE.PUBLISHED }),
  'recraft-4.1': Object.freeze({ usdPerImage: 0.035, provenance: PROVENANCE.PUBLISHED }),
  'ideogram-4.0': Object.freeze({ usdPerImage: 0.06, provenance: PROVENANCE.PUBLISHED }),
  'grok-imagine-2.0': Object.freeze({ usdPerImage: 0.06, provenance: PROVENANCE.PUBLISHED }),
});
