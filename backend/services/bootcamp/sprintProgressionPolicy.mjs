/**
 * ============================================================================
 * FILE: backend/services/bootcamp/sprintProgressionPolicy.mjs — R-H20 (contract §6 line 258).
 *
 * PURPOSE: the CREATE half of `Sprint.metadata.progressionPolicyV1`.
 *
 * §6 line 258: "Add Sprint.metadata.progressionPolicyV1 with version, overrideByWeek and
 * resolved modifier provenance. **New create resolves strategy defaults**".
 *
 * Before this module only `updateWeek` ever wrote the policy, and only when a trainer touched
 * a week — so a brand-new Sprint carried NO record of what its weeks were supposed to be, and
 * "resolved" first happened at generation time. Two consequences, both real:
 *   - nothing could tell a strategy-derived week from a trainer's choice, because the only
 *     trace was the persisted `intensityModifier` column the contract says cannot express it;
 *   - a later strategy edit silently re-decided weeks the trainer had never touched, with no
 *     record of what had been resolved before.
 *
 * THE RESOLUTION USES THE SAME FUNCTION THE GENERATORS USE
 *   `resolveWeekPolicy` is called here with the same `sprintId`, `policyVersion`, `strategy`
 *   and `totalWeeks` the generation paths pass, so a create-time resolution and a
 *   generation-time resolution of the same untouched week AGREE — including for `random`,
 *   whose stable seed is derived from exactly those inputs (§6 line 256).
 *
 *   That agreement is now enforced on BOTH sides: this module records `policyVersion` into the
 *   metadata, and `resolveSprintWeekPolicy` READS IT BACK as the seed input (external review,
 *   round 103, HIGH-1). Before that second half existed, the recorded version was write-only
 *   and bumping the constant re-rolled every existing Sprint's random weeks while
 *   `resolvedByWeek` still claimed the old value.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *   `resolvedByWeek` is recorded PROVENANCE, not a precedence level. `resolveWeekPolicy`'s
 *   order stays deload → explicit override → legacy inference → strategy, so a recorded
 *   resolution never silently outranks a trainer's newer explicit override. The record exists
 *   so the inference is DISPLAYABLE (line 258) and auditable, not so it becomes law.
 * ============================================================================
 */

import { PROGRESSION_POLICY_VERSION, resolveWeekPolicy } from './sprintProgression.mjs';

/** The metadata key line 258 names. Exported so no caller re-types the string. */
export const PROGRESSION_POLICY_KEY = 'progressionPolicyV1';

/** Metadata schema version. Distinct from the SEED policy version below. */
const POLICY_SCHEMA_VERSION = 1;

/**
 * Build the initial policy metadata for a newly created Sprint.
 *
 * @param {object} args
 * @param {number} args.sprintId the CREATED Sprint's id — it is part of the `random` seed.
 * @param {string} args.strategy the validated `progressionStrategy`.
 * @param {Array<{weekNumber:number,isDeloadWeek:boolean,intensityModifier:number}>} args.schedule
 *   the same pure schedule `createSprintScaffold` writes, so no extra read is needed and the
 *   resolution cannot drift from the rows that were created.
 * @returns {{version:number, policyVersion:string, overrideByWeek:object, resolvedByWeek:object}}
 */
export function buildInitialProgressionPolicy({
  sprintId,
  strategy,
  schedule,
  policyVersion = PROGRESSION_POLICY_VERSION,
}) {
  const weeks = Array.isArray(schedule) ? schedule : [];
  const resolvedByWeek = {};

  for (const week of weeks) {
    // `totalWeeks` MUST be the same value generation passes (`sprint.durationWeeks`), or a
    // `random` week would resolve differently at create than at generation. Both are the
    // number of weeks in the Sprint; the create path's schedule IS that set of weeks.
    const policy = resolveWeekPolicy({
      week,
      strategy,
      totalWeeks: weeks.length,
      sprintId,
      policyVersion,
    });
    resolvedByWeek[String(policy.weekNumber)] = {
      modifier: policy.modifier,
      source: policy.source,
      requiresCorrection: policy.requiresCorrection === true,
    };
  }

  return {
    version: POLICY_SCHEMA_VERSION,
    policyVersion,
    overrideByWeek: {},
    resolvedByWeek,
  };
}

export default buildInitialProgressionPolicy;
