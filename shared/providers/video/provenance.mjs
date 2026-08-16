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

/** Bump when the RECORD SHAPE changes, so a reader can tell how to parse it. */
export const PROVENANCE_SCHEMA = 1;

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
 * Freeze the licence terms as they stand right now.
 *
 * `grantRecorded` is part of the snapshot because "was this run authorised at the
 * time" is exactly the question an auditor asks, and it cannot be reconstructed
 * later from an env var that has since changed.
 */
export function snapshotLicence(caps, { commercial, territory, grantRecorded }) {
  const lic = caps.licence || {};
  return Object.freeze({
    name: lic.name || null,
    // WHAT is restricted — the field whose ambiguity cost this project days.
    // 'model-execution' means running the weights, NOT the output.
    restricts: lic.restricts || null,
    commercialUse: lic.commercialUse || null,
    excludedTerritories: Object.freeze([...(lic.excludedTerritories || [])]),
    requiresAttribution: lic.requiresAttribution === true,
    // The position AT GENERATION TIME, not the position now.
    usedCommercially: commercial === true,
    territoryAtGeneration: territory || null,
    grantRecorded: grantRecorded === true,
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
    modelVersion: result?.modelVersion || caps.modelVersion || caps.provider,
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
  if (!record.generatedAt) missing.push('generatedAt');
  if (record.licence?.requiresAttribution && !record.attribution) missing.push('attribution');
  if (!record.licence?.name) missing.push('licence.name');
  if (!record.request?.promptSha256) missing.push('request.promptSha256');
  if (!record.artifact?.sha256) missing.push('artifact.sha256');
  return { ok: missing.length === 0, missing };
}

export { sha256 as hashForProvenance, PROMPT_KEEP_CHARS };
