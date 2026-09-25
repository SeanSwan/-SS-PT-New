/**
 * gateIdentity — whether an artifact belongs to the gate whose path supplied it.
 * @module scripts/swan-brain-console/gateIdentity
 *
 * WHY THIS EXISTS (Astra round 13, H02)
 * `readGateHealth` reads a JSON file because a table in `gateHealth.mjs` says that path
 * belongs to a named gate. Until this module existed, that was the ONLY connection between
 * the two: the reader never asked the artifact whether it agreed. Astra executed the shipped
 * reader against a fresh document containing
 *
 *     gate: 'different-gate',
 *     summary:  { passed: 1, failed: 0, total: 1 },
 *     variants: [{ status: 'fail' }],
 *     population: { ok: false, scope: 'subset' },
 *
 * and got `status: "pass"` — rendered as `1 passed, 0 failed, 0d old`, a green gate. Three
 * separate false certifications in one document: it was not this gate's artifact, its own
 * rows said a variant FAILED while its summary said nothing did, and it declared that it had
 * not covered its population. The reader could see all three fields and consulted none.
 *
 * The reason this matters more than a wrong number: the console's entire purpose is to be
 * the surface an operator trusts about whether a gate is green. A reader that accepts any
 * JSON at a path will certify the wrong gate from a copied file, a stale CI upload, or a
 * producer that was repointed at the wrong output. "Trustworthy observability" is not
 * achieved by reading more carefully — it is achieved by refusing to certify what does not
 * identify itself.
 *
 * WHAT IT CHECKS, AND WHY ONLY THESE FOUR
 *   0. PRODUCER. A contract may declare that NO writer exists. Such a gate has no admissible
 *      evidence, and saying so is the only honest answer — see `engine-contract` and round 14's
 *      Astra J04, where the permissive shape let the real planning artifact certify this gate.
 *   1. IDENTITY. If the artifact stamps a `gate`, it must be this gate's. A gate whose
 *      producer always stamps one must not be certifiable from an unstamped file.
 *   2. ROWS vs SUMMARY. A row carrying a failure status while `summary.failed` is zero is a
 *      document contradicting itself. Both numbers come from one producer expression
 *      (`countFailures`, `renderResult.mjs`), so they cannot legitimately disagree.
 *   3. POPULATION vs SUMMARY. `population.ok === false` with `summary.failed === 0` is the
 *      same contradiction one level up: the producer turns a population mismatch into a
 *      synthetic failed row, so a mismatch CANNOT coexist with a zero failure count. Round 14
 *      added the mirror image — `ok: true` alongside a named shortfall.
 *
 * Checks 2 and 3 are claimed ONLY for gates whose contract declares the corresponding
 * field. That restraint is deliberate: `population`'s meaning is defined by
 * `reconcilePopulation` in `renderResult.mjs`, and `docs/qa/AI-PLANNING-VALIDATION-LATEST.json`
 * carries a `results` array whose schema this module has never been given. Inventing a
 * reconciliation for it would be a guard built on a rule the project does not have — which is
 * itself a defect, and the one this repository keeps producing. So the planning contract says
 * `rows: null` and NAMES that limitation, rather than silently trusting it.
 *
 * WHY A MISSING CONTRACT REFUSES RATHER THAN PASSES
 * `artifactContract` returns an explicitly refusing contract for a gate id it does not know.
 * Adding a sixth gate to `gateHealth.mjs` without declaring its artifact shape therefore
 * reports `not_evidence` — loudly, with the reason — instead of passing on whatever happens
 * to be at the path. The two mistakes are asymmetric (see `evidenceMode.mjs`): a too-strict
 * contract refuses a real gate visibly, a too-permissive one certifies a false one silently.
 *
 * BOUNDS: pure. One already-parsed value in, a refusal or null out. No I/O, no clock, no
 * knowledge of any path — `gateHealth.mjs` owns the registry and supplies the gate id.
 *
 * ROUND 14 — the internal-coherence half moved to `gateReconcile.mjs`, and it was the fourth time
 * Rule 4's 300 lines forced a split in this subsystem. The two are genuinely different questions:
 * this module asks whether the artifact is about THIS gate (provenance, needing a contract and a
 * stamp); `gateReconcile.mjs` asks whether the document hangs together (coherence, needing only the
 * fields the contract declares). Re-exported below so an importer does not have to know it moved.
 */
import { reconciliationDefect } from './gateReconcile.mjs';

export { FAILURE_STATUSES, reconciliationDefect } from './gateReconcile.mjs';

/**
 * What each gate's producer is declared to write.
 *
 * `identity`   the value the producer stamps in `gate`, or `null` when it declares none.
 *              `null` is an explicit compatibility contract, not an omission — see
 *              `planning-validation` below, whose real committed artifact has no `gate` field
 *              and is a genuine green gate.
 * `rows`       the field holding per-item results, or `null` when this module has no declared
 *              contract for the row array. A declared field is ENFORCED both ways: it must be
 *              present, and its rows must agree with the summary. See `gateReconcile.mjs`.
 * `population` whether the producer emits a fleet reconciliation with an `ok` flag. Unlike
 *              `rows`, its ABSENCE is legitimate — the producer includes it only for runs that
 *              reached the manifest.
 * `producerless` `true` when no writer exists for this gate at all. Such a contract REFUSES
 *              evidence rather than admitting it: with nothing declared, nothing at the path can
 *              be shown to be this gate's evidence. See `engine-contract` below and round 14's
 *              Astra J04.
 * `why`        the provenance of the contract, for the operator reading a refusal.
 *
 * A gate's OWN NAME is always an acceptable stamp, so a producer that starts self-identifying
 * is never refused; anything else is foreign.
 */
export const ARTIFACT_CONTRACTS = Object.freeze({
  'planning-validation': Object.freeze({
    identity: null,
    rows: null,
    population: false,
    why: 'docs/qa/AI-PLANNING-VALIDATION-RESULTS.md declares {passed, failed, total, gated, '
      + 'knownGaps} and no "gate" field. The committed artifact at this path is a genuine '
      + 'green gate, so requiring a stamp here would refuse a real gate — the defect this '
      + 'module exists to prevent. Its "results" array has no declared row contract, so it is '
      + 'NOT reconciled: that is a named limitation, not a silent trust.',
  }),
  'provider-ab': Object.freeze({
    identity: null,
    rows: null,
    population: false,
    why: 'docs/qa/PROVIDER-AB-RESULTS.md declares a ranking report. The committed artifact '
      + 'carries no "gate" field and no passed/failed summary; it declares mode "mock", so it '
      + 'is refused upstream as not_evidence and never reaches the summary rules.',
  }),
  'three-worlds-render': Object.freeze({
    identity: 'three-worlds-render',
    rows: 'variants',
    population: true,
    why: 'renderResult.mjs:buildRenderResult always stamps gate "three-worlds-render", '
      + 'always writes "variants", and carries "population" when a run reconciled one.',
  }),
  'engine-contract': Object.freeze({
    identity: null,
    rows: null,
    population: false,
    /*
     * ROUND 14 (Astra J04) — "NO PRODUCER EXISTS" IS NOT A LICENCE TO ACCEPT ANYTHING.
     *
     * This contract used to be indistinguishable from `planning-validation`'s: `identity: null`
     * and no declared rows, which together mean "admit any well-formed summary". The `why` below
     * has always said no writer exists — and yet the shape it declared said "whatever is at this
     * path is fine". Astra executed the shipped reader with the REAL planning artifact at this
     * path and got `pass`, `49 passed, 0 failed, 49/53 evaluated`.
     *
     * The two mistakes are asymmetric, which is this module's own argument: refusing a gate whose
     * producer is undefined is VISIBLE and costs nothing today (no artifact exists to refuse),
     * while admitting a foreign artifact is SILENT and certifies a gate that never ran. So the
     * permissive shape is withdrawn until a producer is defined, and the refusal says why.
     *
     * The planning exception stays scoped to planning, where a real committed artifact makes the
     * permissiveness load-bearing.
     */
    producerless: true,
    why: 'No writer exists. The Contracts job runs the suite and persists nothing, so there is '
      + 'no producer shape to bind to — from the artifact side, "did it run?" has no answer. '
      + 'Because nothing is declared, nothing at this path can be shown to be this gate\'s '
      + 'evidence, so this contract refuses rather than admits (round 14, Astra J04).',
  }),
});

/**
 * Resolve a gate id to its declared artifact contract.
 *
 * Returns a contract carrying its own `gateId`, plus `unknown: true` when the id has no
 * declaration. The unknown case is a REFUSAL (see `admissibilityDefect`), not a permissive
 * default: a gate added to the registry without an artifact contract must be visible, not
 * silently certifiable.
 */
export function artifactContract(gateId) {
  const declared = ARTIFACT_CONTRACTS[gateId];
  if (!declared) return { gateId, unknown: true };
  return { gateId, ...declared };
}

/** Read the `gate` property as a property, not as text. See `evidenceMode.mjs` for why. */
function declaredStamp(doc) {
  if (doc === null || typeof doc !== 'object') return { present: false };
  if (!Object.prototype.hasOwnProperty.call(doc, 'gate')) return { present: false };
  const raw = doc.gate;
  if (typeof raw !== 'string') return { present: true, malformed: true, raw };
  const value = raw.trim();
  if (value === '') return { present: true, malformed: true, raw };
  return { present: true, value };
}

/**
 * Does this artifact claim to be a different gate than the path says it is?
 *
 * Returns a message when it does, or null. Absence is handled by the contract: a gate whose
 * producer always stamps an identity cannot be certified from an unstamped file, while a gate
 * whose producer declares none (planning-validation) accepts absence and rejects a foreign
 * stamp.
 */
function identityDefect(contract, doc) {
  const stamp = declaredStamp(doc);
  if (!stamp.present) {
    if (contract.identity === null) return null;
    return `this artifact declares no "gate" identity, but the "${contract.gateId}" gate is `
      + `produced by a writer that always stamps gate: "${contract.identity}" (${contract.why}) `
      + '— an unidentified artifact cannot certify a named gate';
  }
  if (stamp.malformed) {
    return `"gate" is declared but is not a nonempty string (${JSON.stringify(stamp.raw)}) — `
      + 'a malformed identity is not the absence of one';
  }
  if (stamp.value === contract.identity || stamp.value === contract.gateId) return null;
  const expected = contract.identity === null
    ? `no identity, or "${contract.gateId}"`
    : `"${contract.identity}"`;
  return `this artifact declares gate "${stamp.value}" but this path is the `
    + `"${contract.gateId}" gate, which expects ${expected} — an artifact stamped for another `
    + 'gate cannot certify this one';
}

/**
 * Is this artifact admissible as evidence about the gate whose path supplied it?
 *
 * Returns `{ status, detail }` when it is NOT, or `null` when it is. The caller assigns the
 * status it reports — this module returns the one that fits the refusal, because the two
 * refusals mean different things to an operator:
 *
 *   not_evidence  the document is not this gate's evidence at all (foreign or absent
 *                 identity, or no contract to judge it against). Fresh and green and still
 *                 proving nothing about THIS gate — the same state a mock run lands in.
 *   unreadable    the document is this gate's, but its own claims contradict each other, so
 *                 no reading of it is available.
 *
 * A missing contract returns `unreadable`: a caller that classifies a gate result without
 * saying which gate it claims to be has not supplied a usable input, and must not be handed
 * a green.
 */
export function admissibilityDefect(contract, doc) {
  if (!contract || typeof contract !== 'object') {
    return {
      status: 'unreadable',
      detail: 'no artifact contract was supplied — classifying a gate result without saying '
        + 'which gate it claims to be is exactly the defect this check exists to prevent',
    };
  }
  if (contract.unknown) {
    return {
      status: 'not_evidence',
      detail: `no declared artifact contract for gate "${contract.gateId}" — without one this `
        + 'module cannot tell what an artifact at that path is supposed to be, so it cannot '
        + 'certify it (declare the shape in ARTIFACT_CONTRACTS)',
    };
  }
  /*
   * ROUND 14 (Astra J04) — A GATE WITH NO PRODUCER HAS NO ADMISSIBLE EVIDENCE.
   *
   * Checked before identity, because there is no identity to check: a producerless contract
   * declares no stamp, no rows and no population, so every one of the checks below would pass
   * vacuously and the document would be certified on the strength of being well-formed JSON.
   * That is how the real planning artifact came to certify `engine-contract`.
   */
  if (contract.producerless) {
    return {
      status: 'not_evidence',
      detail: `no producer is declared for the "${contract.gateId}" gate, so nothing at its path `
        + 'can be shown to be its evidence — this contract refuses rather than admits '
        + `(${contract.why})`,
    };
  }
  const identity = identityDefect(contract, doc);
  if (identity) return { status: 'not_evidence', detail: identity };
  const contradiction = reconciliationDefect(contract, doc);
  if (contradiction) return { status: 'unreadable', detail: contradiction };
  return null;
}
