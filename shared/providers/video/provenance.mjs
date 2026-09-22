/**
 * provenance.mjs — the durable record of how an asset came to exist.
 *
 * ── WHY THIS IS AN OBLIGATION, NOT A FEATURE ────────────────────────────────
 * On 2026-08-16 a licensing request went to MiniMax stating that every generated
 * asset carries "a durable record of provider, model version, and the license in
 * force at generation time." That sentence is now a commitment with Sean's name
 * on it. This file is what makes it true.
 *
 * ── WHY A SNAPSHOT RATHER THAN A REFERENCE ──────────────────────────────────
 * The licence in force AT GENERATION TIME is the thing that matters, and it is
 * not the licence in force when someone later asks. Terms change; grants are
 * issued, expire, and are revoked; territories get added to a carve-out. A
 * record that points AT the current licence answers the wrong question — it tells
 * you today's terms, not the terms the asset was made under.
 *
 * So the record embeds a frozen copy. It is deliberately redundant with the
 * catalogue, and that redundancy is the entire value: the catalogue is mutable
 * and this is not.
 *
 * ── WHAT IT DOES NOT DO ─────────────────────────────────────────────────────
 * It does not persist anything. It builds a plain object that travels in the
 * job's `output`, which is what the queue already stores. Adding a table would
 * be a second source of truth for a record whose whole job is to be immutable.
 */

import { createHash } from 'node:crypto';

/**
 * Bump when the RECORD SHAPE changes, so a reader can tell how to parse it.
 *
 * ── WHY THIS MOVED TO 2, AND WHY ROUND 16 WAS WRONG TO LEAVE IT AT 1 ────────
 * Round 16 widened four fields' VALUE DOMAINS — `usedCommercially`, `grantRecorded` and
 * `requiresAttribution` from `boolean` to `boolean | null`, and `excludedTerritories` from `Array`
 * to `Array | null` — and asserted that the schema was unchanged because "the record's shape did
 * not move, only what its fields are allowed to claim".
 *
 * That is not what a version number is for. A reader written against v1 parses
 * `licence.excludedTerritories` as an array and calls `.includes()` on it; it now throws on a record
 * this code happily produces. **A widened value domain IS a parse change**, and the version is the
 * ONLY mechanism that tells a reader so — so the claim was false, and correcting the claim means
 * moving the number.
 *
 * The widening is reachable, not theoretical: `snapshotLicence({ licence: { name: 'x' } }, {})`
 * yields four nulls, and both `snapshotLicence` and `buildProvenance` are exported.
 *
 * `auditProvenance` accepts THIS version only, so a v1 record now audits as `missing: ['schema']`.
 * That is the fail-closed direction and it is deliberate: "we cannot tell you this is complete"
 * beats a green tick produced by a parser that read the field as the wrong type.
 */
export const PROVENANCE_SCHEMA = 2;

/**
 * How much of the prompt to keep verbatim.
 *
 * The prompt is Sean's own creative input stored in his own queue, so there is no
 * privacy reason to omit it — but an unbounded string in every job row is a
 * storage problem, and the hash is what makes two assets comparable anyway.
 */
const PROMPT_KEEP_CHARS = 500;

function sha256(s) {
  return createHash('sha256').update(String(s), 'utf8').digest('hex');
}

/**
 * A boolean in an EVIDENCE record has three states, not two.
 *
 * `commercial === true` — the shape this file used for every flag — records `false` for two
 * different facts: "the caller said this was not commercial" and "nobody said anything". The
 * auditor's question is "was this run authorised?", and those two answer it differently. A
 * record that answers both with a confident `false` has stated something it was never told.
 *
 * Astra's standing ruling for this lane is *"zero is never the fallback for an unknown cost"*;
 * this is the same mistake in the fields that decide whether a licence was needed at all. So a
 * value that is not a genuine boolean is recorded as `null` — "not told" — and `null` is
 * deliberately falsy everywhere the old `false` was, so nothing downstream reads it as a grant.
 */
const triState = (v) => (typeof v === 'boolean' ? v : null);

/**
 * A model version is a LABEL, so only a non-blank string is one — and the label is returned
 * TRIMMED.
 *
 * `result?.modelVersion || caps.modelVersion || caps.provider` read like a harmless display
 * fallback and was not one: `capabilities()` never exposed `modelVersion` and no adapter returned
 * one, so this field ALWAYS held the provider id — in the one field whose own comment says "which
 * weights produced this is not answerable from the provider name alone". Worse, `auditProvenance`
 * then read the fallback as an answer and reported the record COMPLETE.
 *
 * The provider name is not a weaker answer to "which weights produced this"; it is an answer to a
 * different question. An unknown model version is `null`, and the audit names it.
 *
 * Trimming is not a reshape of the value — padding is not part of a model's name. Storing
 * `'  MiniMax H3  '` beside `'MiniMax H3'` would make two records of the SAME model compare unequal,
 * which defeats the only thing this field is for. The validator normalises the same way, so a row
 * and its record agree.
 */
const modelLabel = (v) => {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * Is this the same label, ignoring the spelling a human varies?
 *
 * Stated HERE rather than imported from `specShape.mjs`, deliberately. The audit must be able to
 * refuse a record whose model version repeats its provider even if the validator is later relaxed
 * or the record was built from `caps` that never went through the catalogue — an audit that depends
 * on the module it audits cannot report on that module being broken. Two tokens, restated, is the
 * cheaper coupling.
 */
const sameLabel = (a, b) =>
  String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

/**
 * Freeze the licence terms as they stand right now.
 *
 * `grantRecorded` is part of the snapshot because "was this run authorised at the
 * time" is exactly the question an auditor asks, and it cannot be reconstructed
 * later from an env var that has since changed.
 */
export function snapshotLicence(caps, { commercial, territory, grantRecorded }) {
  const lic = caps.licence || {};
  // A NON-ARRAY IS NOT A LIST.
  //
  // `[...(lic.excludedTerritories || [])]` on a STRING spreads its CHARACTERS, so a row whose
  // exclusion list was authored as `'US'` recorded `['U','S']` — a territory list nobody wrote,
  // inside the artifact whose entire purpose is to be immutable evidence. Round 14 made the
  // validator reject that row and the gate refuse it, so it is unreachable FROM the catalogue;
  // the record must still not be the one place where an unreadable value is silently reshaped
  // into a plausible one. `null` says "not read", which is the answer `licenceTerms.exclusionList`
  // already gives for the same input, and "unreadable" and "excludes two one-letter territories"
  // are different facts of which only one is true.
  const excluded = Array.isArray(lic.excludedTerritories)
    ? Object.freeze([...lic.excludedTerritories])
    : null;
  return Object.freeze({
    name: lic.name || null,
    // WHAT is restricted — the field whose ambiguity cost this project days.
    // 'model-execution' means running the weights, NOT the output.
    restricts: lic.restricts || null,
    commercialUse: lic.commercialUse || null,
    excludedTerritories: excluded,
    requiresAttribution: triState(lic.requiresAttribution),
    // The position AT GENERATION TIME, not the position now.
    usedCommercially: triState(commercial),
    territoryAtGeneration: territory || null,
    grantRecorded: triState(grantRecorded),
  });
}

/**
 * Build the provenance record for one generated asset.
 *
 * `now` is injected rather than read from the clock so the record is testable and
 * so a caller replaying a job cannot accidentally stamp it with today's date.
 */
export function buildProvenance({
  caps,
  request,
  result,
  commercial,
  territory,
  grantRecorded,
  now = new Date(),
  agentVersion = null,
  policyFlags = [],
} = {}) {
  if (!caps || !caps.provider) {
    throw new Error('buildProvenance requires resolved capabilities');
  }

  const prompt = String(request?.prompt ?? '');

  return Object.freeze({
    schema: PROVENANCE_SCHEMA,
    provider: caps.provider,
    // Distinct from `provider`: one provider id can front several model builds, and
    // "which weights produced this" is not answerable from the provider name alone.
    //
    // So there is deliberately NO fallback to the provider here. A vendor or graph that names
    // its own build is the most specific source; the catalogue row is the next; and if neither
    // says, the record says NULL and `auditProvenance` names the gap. Filling it in with the
    // provider id satisfied the completeness check with a fabrication, which is worse than an
    // incomplete record, because an incomplete record can still be repaired by re-running and
    // a confident wrong one cannot.
    modelVersion: modelLabel(result?.modelVersion) || modelLabel(caps.modelVersion) || null,
    label: caps.label || null,
    generatedAt: now.toISOString(),

    // Travels WITH the asset because the licence requires it displayed wherever the
    // output appears. A record that omitted it would leave the display requirement
    // depending on someone remembering to look the provider up.
    attribution: caps.attribution || null,

    licence: snapshotLicence(caps, { commercial, territory, grantRecorded }),

    request: Object.freeze({
      prompt: prompt.slice(0, PROMPT_KEEP_CHARS),
      promptTruncated: prompt.length > PROMPT_KEEP_CHARS,
      promptSha256: sha256(prompt),
      category: request?.category ?? null,
      style: request?.style ?? null,
      durationSec: request?.duration ?? null,
      hadInitImage: Boolean(request?.initImage),
    }),

    artifact: Object.freeze({
      filename: result?.filename ?? null,
      bytes: result?.bytes ?? null,
      // The hash is what proves THIS record belongs to THAT file. Without it the
      // record is an assertion about an artifact it cannot identify.
      sha256: result?.sha256 ?? null,
      providerJobId: result?.promptId ?? null,
    }),

    // Policy flags travel INSIDE the frozen record, not beside it.
    //
    // Three reviewers converged on this independently: a flag emitted as a log line or a
    // transient response field is analytics, not a control. "No depiction of identifiable
    // real people without consent" is a condition that has to be answerable at PUBLISH
    // time, months later, by someone who never saw the job — and it only is if the
    // unresolved question is welded to the asset.
    //
    // `consentConfirmed: false` is the honest starting state. Nothing here decides
    // consent; it records that consent was never established, so a publish gate has
    // something real to refuse on.
    policyFlags: Object.freeze(
      (policyFlags || []).map(f => Object.freeze({
        rule: f.rule ?? null,
        detail: f.detail ?? null,
        consentConfirmed: false,
      })),
    ),

    agentVersion,
  });
}

/**
 * Is this record complete enough to satisfy the commitment made to the licensor?
 *
 * Returns reasons rather than a bare boolean, because "provenance is incomplete" is
 * useless to whoever has to fix it. Used by tests and available to any future audit
 * surface; deliberately does NOT throw — an asset with thin provenance is still a
 * real asset, and refusing to record it would leave less evidence, not more.
 */
export function auditProvenance(record) {
  const missing = [];
  if (!record || record.schema !== PROVENANCE_SCHEMA) return { ok: false, missing: ['schema'] };
  if (!record.provider) missing.push('provider');
  if (!record.modelVersion) missing.push('modelVersion');
  // ...AND A POPULATED FIELD IS NOT NECESSARILY AN ANSWER.
  //
  // Round 16 stopped the RECORD filling this field with the provider id, and left the AUDIT reading
  // truthiness — so a record built from any `caps` that never went through the catalogue (this
  // function is exported and takes whatever it is handed) could still repeat the provider id and be
  // reported COMPLETE. The validator covers catalogue rows; this is the last check before a reader,
  // so the property is asserted here as well. It is the same move round 13 made for the licence
  // gate: a guard whose safety rests on another file's validation needs an assertion of its own.
  //
  // A DISTINCT token, because "add a value" and "change this value" are different repairs and one
  // token for both would send a reader to do the wrong one.
  else if (sameLabel(record.modelVersion, record.provider)) missing.push('modelVersion.duplicatesProvider');
  if (!record.generatedAt) missing.push('generatedAt');
  if (record.licence?.requiresAttribution && !record.attribution) missing.push('attribution');
  if (!record.licence?.name) missing.push('licence.name');
  if (!record.request?.promptSha256) missing.push('request.promptSha256');
  if (!record.artifact?.sha256) missing.push('artifact.sha256');
  return { ok: missing.length === 0, missing };
}

export { sha256 as hashForProvenance, PROMPT_KEEP_CHARS };
