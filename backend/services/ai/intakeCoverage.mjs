/**
 * ============================================================================
 * FILE: services/ai/intakeCoverage.mjs
 * PURPOSE: Tell Swan Coach what it does NOT know about a client.
 * CREATED: 2026-07-25 (Coach Hive-Mind C1)
 * ============================================================================
 *
 * WHAT THIS FILE DOES
 *   Turns the raw result sets of the client-data enrichment into an explicit
 *   statement of which intake sources are on file and which are absent.
 *
 * WHY IT EXISTS
 *   Every enrichment block in aiChatService is `if (rows.length > 0) push(...)`.
 *   An empty source emits NOTHING, so Coach could not distinguish
 *
 *       "screened, no compensations found"   from   "never screened"
 *
 *   and answered with identical confidence either way. That is the precise
 *   failure the Hive-Mind program exists to prevent: not a Coach that lacks
 *   data, but a Coach that cannot tell whether it has any.
 *
 *   The gap is structural, not incidental. Client-intake inputs are written by
 *   THREE separate surfaces — the onboarding wizard (questionnaire + baselines),
 *   the Movement Analysis wizard (MovementProfile), and the equipment surface
 *   (EquipmentProfile). Completing onboarding populates only the first, so a
 *   newly onboarded client legitimately has holes. Coach must say so.
 *
 * PURE + DEPENDENCY-FREE by design, so it is directly testable — the enrichment
 * it serves lives in a 2211-line module that cannot be exercised in isolation.
 */

/**
 * Core intake sources Coach reasons from, in the order a trainer would fill them.
 * Key = the destructured result set in enrichWithUserData.
 */
export const INTAKE_SOURCES = [
  { key: 'onboarding',      label: 'Onboarding questionnaire' },
  { key: 'movement',        label: 'NASM movement screen' },
  { key: 'movementProfile', label: 'Movement profile' },
  { key: 'baseline',        label: 'Baseline measurements' },
  { key: 'equipment',       label: 'Equipment availability' },
  { key: 'painEntries',     label: 'Pain/injury records' },
  { key: 'goals',           label: 'Goals' },
];

const hasRows = (value) => Array.isArray(value) && value.length > 0;

/**
 * Split the intake sources into present / missing.
 *
 * @param {Record<string, unknown>} resultSets keyed by INTAKE_SOURCES[].key
 * @returns {{ present: string[], missing: string[] }} human labels
 */
export function assessIntakeCoverage(resultSets = {}) {
  const present = [];
  const missing = [];
  for (const { key, label } of INTAKE_SOURCES) {
    (hasRows(resultSets[key]) ? present : missing).push(label);
  }
  return { present, missing };
}

/**
 * Render the coverage block appended to the client-data context.
 *
 * Absence is stated explicitly AND paired with an instruction, because naming a
 * gap without telling Coach what to do about it just yields a hedge on every
 * answer. The instruction is deliberately narrow: say it is not on file, name
 * the assessment that would fill it, do not infer a normal finding.
 *
 * @returns {string} block text, or '' when there is nothing to report
 */
export function buildIntakeCoverageBlock(resultSets = {}) {
  const { present, missing } = assessIntakeCoverage(resultSets);

  if (missing.length === 0) {
    return '\n--- INTAKE COVERAGE ---\nAll core intake sources are on file.';
  }

  // The instruction deliberately scopes to the NOT-on-file list rather than
  // naming example inferences ("no injuries", "no compensations"). Naming them
  // generically caused the opposite failure in review: the block warned against
  // inferring "no injuries" even when pain records WERE on file, which invites
  // Coach to hedge about data it actually has. False uncertainty is its own bug.
  return '\n--- INTAKE COVERAGE ---\n'
    + `On file: ${present.length > 0 ? present.join(', ') : 'nothing yet'}\n`
    + `NOT on file: ${missing.join(', ')}\n`
    + 'Sections listed as NOT on file are ABSENT, not empty-and-clear. Do not infer '
    + 'a normal, negative, or "nothing found" result from any of them. If a '
    + 'recommendation depends on one, say it is not on file and name the assessment '
    + 'that would fill it. Sections listed as on file may be used normally.';
}