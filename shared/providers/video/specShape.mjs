/**
 * specShape.mjs — the SHAPE CONTRACT for a catalogue row, and the validator that
 * enforces it. Split out of `catalogue.mjs` for rule 4, and because the seam is real:
 * that file is DATA (which providers exist, what each claims), this one is the RULES
 * a row must satisfy to be a row at all.
 *
 * `catalogue.mjs` re-exports `assertSpecShape` and `ProviderSpecError`, so every
 * existing import path is unchanged.
 *
 * ── WHY A VALIDATOR IS WORTH THIS MUCH COMMENT ──────────────────────────────
 * Every defect this validator closes arrived the same way: a data mistake became a
 * MONEY mistake, silently, several modules away from the typo.
 *
 *   - A row declaring `maxDurationSec: 6` instead of `{value: 6, provenance}` made
 *     `registry.trusted()` return `undefined`, `toMicros` return `null` for it, and
 *     `null * duration` is ZERO in JavaScript — so a billing provider authored in the
 *     wrong shape was priced at nothing.
 *   - A row declaring `{value: '', provenance: 'published'}` passed an envelope check
 *     and was read by `costEstimate` as "explicitly free" — $0.00 for a billed run.
 *   - A row declaring `{value: '6'}` for `maxDurationSec` made `duration > maxDurationSec`
 *     FALSE for every request, so a 6-second cap silently accepted 30.
 *   - A row declaring its licence as a bare STRING passed, because `licence` was required
 *     only to be present and only `undefined` was rejected. `licenceGate` then read
 *     `.commercialUse` off that string, got `undefined`, recognised nothing, and permitted
 *     commercial use — a data mistake becoming a LEGAL one, which is the most expensive
 *     version of this class there is. Round 14 added the licence block below.
 *
 * Each of those is invisible in review and obvious in arithmetic. So the shape is
 * checked here, once, at import.
 */

import {
  COMMERCIAL_USE, COMMERCIAL_USE_VALUES, isKnownCommercialUse,
  isLicenceObject, evidenceUnretrieved,
} from './licenceTerms.mjs';

class ProviderSpecError extends Error {
  constructor(code, message) { super(message); this.name = 'ProviderSpecError'; this.code = code; }
}

/**
 * Fields every catalogue entry must carry. Enforced by `assertSpecShape`, which
 * `catalogue.mjs` runs over every row AT IMPORT, so a malformed row fails loudly
 * when the module loads rather than producing `undefined` somewhere far away at
 * render time.
 */
const REQUIRED_FIELDS = Object.freeze([
  'label', 'modelVersion', 'transport', 'kind', 'enabled',
  'maxDurationSec', 'maxResolution', 'attribution', 'licence',
]);

/** Fields that MUST carry a `{value, provenance}` envelope. See `assertSpecShape`. */
const WRAPPED_FIELDS = Object.freeze(['maxDurationSec', 'maxResolution', 'costPerSecondUsd']);

/** Wrapped fields whose VALUE is money, and therefore must parse as a plain decimal. */
const MONEY_FIELDS = Object.freeze(['costPerSecondUsd']);

/** Wrapped fields whose VALUE must be a positive number or null. */
const NUMERIC_FIELDS = Object.freeze(['maxDurationSec']);

export function assertSpecShape(id, spec) {
  if (!spec || typeof spec !== 'object') {
    throw new ProviderSpecError('E_BAD_SPEC', `Provider "${id}" has no spec.`);
  }
  for (const field of REQUIRED_FIELDS) {
    if (spec[field] === undefined) {
      throw new ProviderSpecError('E_BAD_SPEC', `Provider "${id}" is missing required field "${field}".`);
    }
  }
  // THE ENVELOPE IS CHECKED, NOT ASSUMED. `registry.trusted()` reads `.value` off these
  // fields, so a row that declares a BARE number here resolves to `undefined` — and that
  // undefined travelled all the way into `estimateRunCostMicros`, where `null * duration`
  // is ZERO. A billing provider authored in the wrong shape would have been priced at
  // nothing, silently. The catalogue's whole promise is that a malformed row fails LOUDLY
  // rather than producing `undefined` somewhere far away, so it is checked here.
  //
  // The trap is easy to walk into: `costPerRunUsd` is deliberately a BARE number and
  // `costPerSecondUsd` is deliberately WRAPPED, so the two cost fields in the same row
  // use different shapes.
  for (const field of WRAPPED_FIELDS) {
    const v = spec[field];
    if (v === undefined) continue;
    const wrapped = v && typeof v === 'object' && 'value' in v && 'provenance' in v;
    if (!wrapped) {
      throw new ProviderSpecError('E_BAD_SPEC',
        `Provider "${id}" declares ${field} as a bare value; it must be {value, provenance}.`);
    }
  }
  // THE ENVELOPE IS NOT ENOUGH — THE PAYLOAD IS CHECKED TOO.
  // Checking only the shape of the wrapper still let `{value: '', provenance: 'published'}`
  // through, and an empty-string rate is read by `costEstimate` as "explicitly free":
  // a billing provider priced at $0.00 that the daily ceiling is never charged for. The
  // envelope check closed the `undefined` door and left this one open beside it.
  //
  // Stated locally rather than imported from `costEstimate`/`spendGuard` on purpose: a
  // validator that depends on the module it is protecting cannot reject a row when that
  // module is the thing that is broken. The predicate is three tokens wide; the coupling
  // would be worse.
  const PLAIN_DECIMAL = /^\d+(\.\d+)?$/;
  for (const field of MONEY_FIELDS) {
    const v = spec[field];
    if (!v || typeof v !== 'object') continue;
    if (v.value === null) continue;   // null is a legitimate "not published"
    const asText = typeof v.value === 'number' ? String(v.value) : v.value;
    if (typeof asText !== 'string' || !PLAIN_DECIMAL.test(asText.trim())) {
      throw new ProviderSpecError('E_BAD_SPEC',
        `Provider "${id}" declares ${field}.value=${JSON.stringify(v.value)}; expected null or a `
        + 'plain non-negative decimal. An unreadable rate must fail here, at import, and not '
        + 'reach the pricing arithmetic where it would be read as free.');
    }
  }
  // A NUMERIC BOUND WITH A NON-NUMERIC VALUE IS A BOUND THAT IS NOT ENFORCED.
  // `validateVideoRequest` tests `duration > caps.maxDurationSec`, and a string there
  // makes that comparison FALSE for every request — so a provider capped at 6 seconds
  // silently accepts 30. The guard reports itself as enforced (`maxDurationSec !== null`)
  // while refusing nothing, which is the worst of both readings.
  for (const field of NUMERIC_FIELDS) {
    const v = spec[field];
    if (!v || typeof v !== 'object' || v.value === null) continue;
    if (typeof v.value !== 'number' || !Number.isFinite(v.value) || v.value <= 0) {
      throw new ProviderSpecError('E_BAD_SPEC',
        `Provider "${id}" declares ${field}.value=${JSON.stringify(v.value)}; expected null or a `
        + 'positive finite number of seconds.');
    }
  }
  // `costPerRunUsd` is passed straight through unwrapped, so it is checked as a number.
  const perRun = spec.costPerRunUsd;
  if (perRun !== undefined && perRun !== null
    && (typeof perRun !== 'number' || !Number.isFinite(perRun) || perRun < 0)) {
    throw new ProviderSpecError('E_BAD_SPEC',
      `Provider "${id}" declares costPerRunUsd=${JSON.stringify(perRun)}; expected a finite `
      + 'non-negative number or null.');
  }
  // ── A DISPUTED PRICE IS NOT A PRICE, AND THE STATUS MUST SAY SO ────────────
  // Astra's round-2 F1, and it is the SAME defect the round-1 adjudication named for D3:
  // a policy that exists only as a side effect of another field's absence is not a policy.
  // The quarantine was enforced ENTIRELY by `costPerSecondUsd.value === null`, and
  // `pricingStatus: 'disputed'` was consulted nowhere on the pricing path. Restoring only
  // the raw rate — keeping the status — priced a six-second run at 442,800 micros and the
  // spend guard ALLOWED it.
  //
  // This rule makes that state unrepresentable at import. It is the CATALOGUE half. The
  // MONEY half is in `costEstimate.estimateRunCostMicros`, which refuses any row whose
  // status is not `published` whatever its rate field says. Both are needed and neither is
  // sufficient: this one cannot protect a caps object the registry never built, and that
  // one cannot protect a catalogue that never loads.
  //
  // `undefined` is deliberately allowed through — the local rows carry no status at all and
  // the registry defaults them to `published`. What is rejected is a row that DECLARES a
  // non-published status while still carrying something a pricer could read.
  const PUBLISHED_PRICING = 'published';
  const pricingStatus = spec.pricingStatus;
  if (pricingStatus !== undefined && pricingStatus !== null && pricingStatus !== PUBLISHED_PRICING) {
    const perSecond = spec.costPerSecondUsd;
    const hasPerSecond = Boolean(perSecond) && typeof perSecond === 'object'
      && perSecond.value !== null && perSecond.value !== undefined;
    const hasPerRun = typeof spec.costPerRunUsd === 'number';
    if (hasPerSecond || hasPerRun) {
      throw new ProviderSpecError('E_BAD_SPEC',
        `Provider "${id}" declares pricingStatus="${pricingStatus}" AND a usable price `
        + `(costPerSecondUsd.value=${JSON.stringify((perSecond && perSecond.value) ?? null)}, `
        + `costPerRunUsd=${JSON.stringify(spec.costPerRunUsd ?? null)}). A price that is not `
        + 'published is not a price: the status would be documentation while the rate field did '
        + 'the work, and the next edit to the rate would silently re-enable pricing.');
    }
    if (spec.activeUsableRate !== null && spec.activeUsableRate !== undefined) {
      throw new ProviderSpecError('E_BAD_SPEC',
        `Provider "${id}" declares pricingStatus="${pricingStatus}" but activeUsableRate=`
        + `${JSON.stringify(spec.activeUsableRate)}. Nothing may be quoted against a rate that is `
        + 'not published — set it to null, or publish the price and say so in the status.');
    }
  }
  // ── THE MODEL VERSION IS EVIDENCE, SO IT IS CHECKED LIKE A FACT, NOT A LABEL ──
  //
  // `provenance.mjs` builds the durable record that answers the licensor's sentence — *"a
  // durable record of provider, model version, and the license in force at generation time."*
  // `provider` and `modelVersion` are named separately there because they are different facts.
  // The record used to fill the second with the first, so every asset ever generated asserted
  // that the provider name answers "which weights produced this", and `auditProvenance` — the
  // check whose whole job is to name what is missing — reported the record complete.
  //
  // A fallback is a reasonable way to fill a display field. It is not a reasonable way to fill
  // an EVIDENCE field, because a completeness check downstream reads the fallback as an answer.
  // So the field the record depends on is required HERE, at import, where a new row cannot omit
  // it and cannot set it to the provider id by accident.
  //
  // The `=== id` test is the whole defect stated as a rule: when a row's model version equals its
  // provider id, the record's two fields are one fact wearing two names, which is exactly the
  // reading the commitment forbids.
  if (typeof spec.modelVersion !== 'string' || spec.modelVersion.trim() === '') {
    throw new ProviderSpecError('E_BAD_SPEC',
      `Provider "${id}" declares modelVersion=${JSON.stringify(spec.modelVersion ?? null)}; expected `
      + 'a non-blank string naming the WEIGHTS. The provenance record exists to answer "which model '
      + 'produced this asset" separately from "which provider served it", so an absent or unreadable '
      + 'model version must fail here rather than be filled in downstream with something that is not '
      + 'an answer.');
  }
  // ── AN EXACT TEST ONLY CATCHES THE EXACT SPELLING ───────────────────────────
  //
  // This rule began as `spec.modelVersion === id`, which compares bytes — so `' comfyui/minimax-h3 '`
  // and `'COMFYUI/MINIMAX-H3'` both passed, and the record then repeated the provider id in the
  // field that exists to distinguish it, which is the very defect the rule was added for. The
  // plausible authoring mistake is a copy-paste of the id with a stray space; the byte-identical
  // spelling is the ONE near-miss a human does not produce. So the comparison is normalised — one
  // check, not a strict one plus a general one, because a rule that holds for one spelling and not
  // another is not a rule. Same reasoning that makes `licence.excludedTerritories` a validated
  // array rather than an `.includes()` on whatever happens to be there.
  const normalise = (v) => String(v).trim().toLowerCase();
  if (normalise(spec.modelVersion) === normalise(id)) {
    throw new ProviderSpecError('E_BAD_SPEC',
      `Provider "${id}" declares modelVersion=${JSON.stringify(spec.modelVersion)}, which is its own `
      + 'provider id once whitespace and case are ignored. Those are different facts: one provider id '
      + 'can front several model builds, so a record that repeats the id in the model-version field '
      + 'asserts that the provider name identifies the weights — the one thing that field exists to '
      + 'distinguish. Name the model.');
  }
  // ── THE LICENCE BLOCK IS CHECKED LIKE THE COST FIELDS, FOR THE SAME REASON ──
  //
  // `licence` was the one required field whose CONTENTS were never validated: `undefined` was
  // rejected and a bare string was not. `licenceGate` then read `.evidence` and
  // `.commercialUse` off whatever was there, every guard fell through, and the row was
  // commercially PERMITTED. This is the same class as the three defects above — a data mistake
  // becoming a wrong answer several modules away from the typo — except that the wrong answer
  // here is a legal one, and no amount of arithmetic reveals it.
  //
  // The vocabulary is imported from `licenceTerms.mjs` rather than restated. A validator that
  // hard-codes its own copy of the gate's vocabulary is two vocabularies that agree until
  // someone edits one; then the gate reads a value the validator never saw. Sharing the DATA
  // (not the judgement) is what makes "rejected at import" and "refused at request time" the
  // same statement.
  if (!isLicenceObject(spec.licence)) {
    throw new ProviderSpecError('E_BAD_SPEC',
      `Provider "${id}" declares licence as ${spec.licence === null ? 'null' : typeof spec.licence}; `
      + 'expected an object carrying commercialUse and excludedTerritories. A licence that cannot '
      + 'be read is an UNKNOWN position, and unknown is not permissive — so it must fail here, at '
      + 'import, rather than be read as a permission at request time.');
  }
  if (!isKnownCommercialUse(spec.licence.commercialUse)) {
    throw new ProviderSpecError('E_BAD_SPEC',
      `Provider "${id}" declares licence.commercialUse=${JSON.stringify(spec.licence.commercialUse ?? null)}; `
      + `expected one of ${COMMERCIAL_USE_VALUES.join(', ')}. An unrecognised position is an unknown `
      + 'one, and a gate that reads an open string as a closed vocabulary treats whatever it does '
      + 'not recognise as permission — so the vocabulary is enforced here and in the gate from one '
      + 'shared list.');
  }
  if (!Array.isArray(spec.licence.excludedTerritories)) {
    throw new ProviderSpecError('E_BAD_SPEC',
      `Provider "${id}" declares licence.excludedTerritories=${JSON.stringify(spec.licence.excludedTerritories)}; `
      + 'expected an array (use [] for none). A bare string is substring-matched by '
      + '`Array.prototype.includes` — "CANADA" would exclude "CA", and "US" would exclude '
      + 'nothing at all, which is the fail-open direction.');
  }
  // `requiresAttribution` is COPIED INTO THE RECORD and read by `auditProvenance` to decide
  // whether a missing attribution string makes the record incomplete. So a row that omits it
  // does not merely leave a field blank — it silently downgrades "this licence demands prominent
  // display" to "attribution optional", which is the same class as the licence defects above: a
  // data omission becoming a compliance answer, several modules from the typo. Required as a
  // boolean, because `provenance.snapshotLicence` now records a non-boolean as `null` and `null`
  // is falsy at the audit — an honest "unknown", but a shipped row should never be unknown.
  if (typeof spec.licence.requiresAttribution !== 'boolean') {
    throw new ProviderSpecError('E_BAD_SPEC',
      `Provider "${id}" declares licence.requiresAttribution=`
      + `${JSON.stringify(spec.licence.requiresAttribution ?? null)}; expected true or false. `
      + 'Omission is not "no": the value is copied into the asset\'s provenance record and read '
      + 'there to decide whether a missing attribution makes the record incomplete, so leaving it '
      + 'out would silently relax a licence condition.');
  }
  // A ROW MAY SHIP WITH UNRETRIEVED TERMS — that is the honest state of the hosted rows, and
  // refusing to load them would delete the record rather than gate it. What it may NOT do is
  // claim a commercial position while admitting the terms are unread. That combination is the
  // ORIGINAL hosted defect ("asserted `commercialUse: 'permitted'` by analogy with another
  // vendor"), and it is now impossible to reintroduce: the row fails at boot.
  if (evidenceUnretrieved(spec.licence)
    && (spec.licence.commercialUse === COMMERCIAL_USE.PERMITTED
      || spec.licence.commercialUse === COMMERCIAL_USE.REQUIRES_GRANT)) {
    throw new ProviderSpecError('E_BAD_SPEC',
      `Provider "${id}" carries an evidence flag AND claims commercialUse=`
      + `"${spec.licence.commercialUse}". Those contradict each other: the flag says the terms `
      + 'have not been read, and the position says they have. Set commercialUse to what the terms '
      + 'actually say and drop the flag, or keep the flag and set commercialUse to '
      + `"${COMMERCIAL_USE.UNVERIFIED}".`);
  }
  // ── AN UNSUPPORTED BILLING UNIT IS A PRICING DECISION NOBODY MADE ─────────
  //
  // R3-1's import half, and the second of the two places this can be violated. The money half is
  // in `costEstimate.estimateRunCostMicros`, where `default:` now returns null; this is the gate
  // that stops such a row reaching there at all.
  //
  // WHY THE SET IS CLOSED RATHER THAN A PROPERTY: `rateUnit` selects WHICH arithmetic applies —
  // a flat multiple, a duration multiply, or nothing — so there is no predicate to test. Either
  // the value is one of the three units this module prices, or it is not a unit. A row declaring
  // `'per-minute'` is not slightly wrong; it is a row whose cost nobody has decided how to
  // compute, and the previous code resolved it to the FLAT per-run figure and said so in a
  // comment that denied it.
  //
  // `undefined` IS ALLOWED THROUGH, and that is deliberate rather than an omission.
  // `registry.mjs` defaults it to `'run'` (`spec.rateUnit ?? 'run'`), and that default is the
  // documented shape for every local row — the ones that carry no rate at all. Rejecting
  // `undefined` here would fail every local provider at import to no purpose, since a row with
  // no unit and no rate cannot price anything. What is rejected is a row that DECLARES a unit
  // outside the set: a positive claim that is wrong.
  //
  // Note `'none'` is NOT in the set, though `media-api/routes.mjs` uses that string for the
  // "no basis" answer. That is an API-level reading of a resolved row, not a unit a catalogue
  // may declare; admitting it here would let a row assert a basis that prices nothing.
  const RATE_UNITS = Object.freeze(['run', 'second', 'generation']);
  if (spec.rateUnit !== undefined && !RATE_UNITS.includes(spec.rateUnit)) {
    throw new ProviderSpecError('E_BAD_SPEC',
      `Provider "${id}" declares rateUnit=${JSON.stringify(spec.rateUnit)}; expected one of `
      + `${RATE_UNITS.map((u) => `"${u}"`).join(', ')} (or omitted, which resolves to "run"). The `
      + 'unit selects which arithmetic computes the cost, so a value outside the set is a row '
      + 'whose price nobody has decided how to calculate. An unrecognised unit must fail here, at '
      + 'import, and not reach the pricing switch where the unknown-unit arm would answer it with '
      + 'the cheapest reading.');
  }
  // ── D2: AN EVIDENCE STATUS THAT SAYS "UNKNOWN" CANNOT COEXIST WITH A CLAIM ──
  //
  // The rule above ties the evidence flag to `commercialUse`. Astra's second finding was
  // that the SAME defect survives in two other fields, because the flag only covers one
  // question: `excludedTerritories: []` reads as "worldwide" and `requiresAttribution:
  // false` reads as "attribution not required", and neither reading is available while the
  // fact behind it has never been read.
  //
  // Astra, verbatim: *"Empty exclusions and `requiresAttribution: false` must not mean
  // 'worldwide' and 'no attribution required' while those facts are unknown."*
  //
  // Both rules below are CONDITIONAL on the status field being present, so no existing row
  // changes behaviour. What they forbid is the specific sequence an operator reaches by
  // following the catalogue's own instruction — "retrieve the terms, set `commercialUse`,
  // drop `evidence`" — while leaving a territory or attribution question open. Without
  // these, dropping the flag publishes an unread fact as a settled one, which is the
  // ORIGINAL hosted defect arriving through the second door.
  //
  // A status is "unretrieved" by the same presence rule `evidenceUnretrieved` uses: any
  // non-empty marker means the fact has not been established. Testing presence rather than
  // one spelling is deliberate — see `licenceTerms.evidenceUnretrieved` for why a literal
  // match on a field nothing validates is a guarantee that holds by luck.
  const statusUnretrieved = (v) => v !== undefined && v !== null && String(v).trim() !== '';

  if (statusUnretrieved(spec.licence.territoryEvidence) && !evidenceUnretrieved(spec.licence)) {
    throw new ProviderSpecError('E_BAD_SPEC',
      `Provider "${id}" declares licence.territoryEvidence="${spec.licence.territoryEvidence}" but `
      + 'carries no evidence flag. Those contradict each other: the status says the territory facts '
      + 'have not been read, and dropping the flag is what makes `excludedTerritories: []` readable '
      + 'as "no territory is excluded" — i.e. as worldwide. Keep the flag, or set '
      + '`excludedTerritories` to what the terms actually say and clear the status.');
  }
  if (statusUnretrieved(spec.licence.attributionEvidence) && spec.licence.requiresAttribution === false) {
    throw new ProviderSpecError('E_BAD_SPEC',
      `Provider "${id}" declares licence.attributionEvidence="${spec.licence.attributionEvidence}" `
      + 'AND requiresAttribution=false. `false` is an answer to a question the status says nobody has '
      + 'asked: it records "attribution is not required" for terms that have not been read. Show '
      + 'attribution until the condition is adjudicated — the field is copied into every asset\'s '
      + 'provenance record and read there to decide whether a missing attribution makes the record '
      + 'incomplete, so understating it relaxes a licence condition silently.');
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
