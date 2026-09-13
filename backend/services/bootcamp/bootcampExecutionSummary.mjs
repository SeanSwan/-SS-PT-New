/**
 * ============================================================================
 * FILE: backend/services/bootcamp/bootcampExecutionSummary.mjs
 *
 * PURPOSE: the vocabulary of `BootcampClassLog.executionSummary` (contract §5 line 222).
 *
 * WHY THIS IS ITS OWN MODULE: the field exists so a reader can tell a PRESCRIPTION ("the
 * trainer says this is what the class was") from a MEASUREMENT ("the runner observed this").
 * Two writers and one reader need that vocabulary — the class-log endpoint, the Sprint
 * confirmation's derivation, and whoever reads the column — and the shared vocabulary module
 * (`bootcampTemplateRules.mjs`) is already at the rule-4 line cap, so this cohesive unit got
 * its own file rather than pushing that one over.
 *
 * THE RULE: an unknown `kind` has no honest label, so a writer stores `null` instead of an
 * unlabelled claim. `runner_measured` asserts an observation, so a CLIENT write path may not
 * assert it — only `trainer_attested_prescription`, which a trainer genuinely supplies.
 * ============================================================================
 */

export const TRAINER_ATTESTED_PRESCRIPTION = 'trainer_attested_prescription';
export const RUNNER_MEASURED = 'runner_measured';

export const EXECUTION_SUMMARY_KINDS = Object.freeze([
  TRAINER_ATTESTED_PRESCRIPTION, RUNNER_MEASURED,
]);

/** Is this a client-supplied execution summary carrying one of the known labels? */
export const isKnownExecutionSummary = (value) => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
  && EXECUTION_SUMMARY_KINDS.includes(value.kind)
);

/** May a UI write path assert this? Only the trainer-attested kind (see the file header). */
export const isTrainerAttestedSummary = (value) => (
  isKnownExecutionSummary(value) && value.kind === TRAINER_ATTESTED_PRESCRIPTION
);

export default EXECUTION_SUMMARY_KINDS;
