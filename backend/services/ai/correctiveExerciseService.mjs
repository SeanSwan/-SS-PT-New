/**
 * correctiveExerciseService.mjs (V3c Slice 1)
 * ============================================
 *
 * Bridges the existing OHSA infrastructure (`clientIntelligenceService`'s
 * compensation taxonomy) to the V3b.3 NASM CES corrective registry.
 *
 * Inputs:
 *   - A compensation list in the shape produced by
 *     `clientIntelligenceService.analyzeCompensationTrend(...)`:
 *       [{ type, frequency, avgSeverity, trend, lastDetected, cesStrategy }, …]
 *   - Or a flat string array of compensation type names.
 *
 * Output:
 *   - Exercise rows from the V3b.3 registry (`exercise_key LIKE 'ces-%'`)
 *     whose `nasmCorrectiveCategory` JSON array intersects the mapped
 *     compensation tags. Grouped by `cesProtocolStep`
 *     (inhibit | lengthen | activate | integrate). De-duplicated.
 *
 * Why this exists:
 *   - `clientIntelligenceService.CES_MAP` returns hardcoded string lists
 *     (e.g., `['single_leg_squat', 'lateral_band_walk', 'step_up']`) —
 *     never connected to real registry rows. With V3b.3 shipped, we
 *     have 32 ces-* exercises tagged with their compensation patterns
 *     and CES protocol step. This service converts the heuristic into
 *     a registry-backed selector.
 *   - V3 spec L8-L10 (workout-planner-V3-cross-surface-spec) explicitly
 *     wants OHSA-derived corrective exercises auto-prescribed in the
 *     warmup of every session for the client's compensation patterns.
 *
 * V3c scope notes:
 *   - This slice 1 is the data-layer bridge only. No route, no UI,
 *     no AI prompt. Pure-function-by-name + one DB query.
 *   - The slice is bounded so it can ship + be reviewed independently
 *     before the workout-builder integration (V3c Slice 2) and the
 *     AI orchestration loop (V3c Slice 3+).
 *
 * Compensation-type mapping rationale:
 *   - `clientIntelligenceService.CES_MAP` uses NASM-textbook compensation
 *     names (e.g., `knee_valgus`, `head_protrusion`). The V3b.3 registry
 *     tags use OHSA-checklist names (e.g., `knees_cave`, `forward_head`).
 *     These describe the same thing in different vocabularies. The
 *     mapping table below keeps both sources of truth in sync.
 *   - Some compensations also map to broader postural-distortion patterns
 *     (UCS, LCS, PDS) so a single compensation can pull integration-
 *     phase exercises tagged with multi-pattern syndromes.
 */

import { buildCompensationTagBridge } from '../training-cortex/policy/nasmCesPolicy.mjs';

// Mapping: clientIntelligenceService compensation type → V3b.3 nasmCorrectiveCategory tag(s)
//
// Multiple V3b.3 tags per compensation is intentional — a row tagged with
// any one of the listed tags is a relevant corrective option. E.g. a
// client showing `head_protrusion` benefits from exercises tagged
// `forward_head` AND from exercises tagged `upper_crossed_syndrome`
// (which is the broader pattern that head_protrusion belongs to).
// Cortex Phase 2B: derived from THE single CES catalog
// (training-cortex/policy/nasmCesPolicy.mjs) — byte-identical to the
// table this replaced. Do not edit compensation->tag data here.
const COMPENSATION_TO_V3B3_TAGS = buildCompensationTagBridge();

const VALID_PROTOCOL_STEPS = ['inhibit', 'lengthen', 'activate', 'integrate'];

/**
 * Map a single compensation type to its V3b.3 corrective tag set.
 * Returns an empty array for unknown types (no throw — unknown
 * compensations should be silently dropped, not crash the workout
 * planner).
 *
 * @param {string} compensationType
 * @returns {string[]} V3b.3 nasmCorrectiveCategory tag candidates
 */
export function mapCompensationToCesTags(compensationType) {
  if (typeof compensationType !== 'string') return [];
  return COMPENSATION_TO_V3B3_TAGS[compensationType] || [];
}

/**
 * Normalize a compensation list into a flat tag set, deduplicated.
 * Accepts:
 *   - string[]:           ['knee_valgus', 'low_back_arch']
 *   - object[] (CIS shape): [{ type: 'knee_valgus', avgSeverity: 7 }, …]
 *
 * Returns the union of all V3b.3 tags reachable from those compensations.
 *
 * @param {Array<string | { type: string }>} compensations
 * @returns {string[]} unique V3b.3 nasmCorrectiveCategory tags
 */
export function compensationsToTagSet(compensations) {
  if (!Array.isArray(compensations)) return [];
  const tags = new Set();
  for (const comp of compensations) {
    const type = typeof comp === 'string' ? comp : comp?.type;
    for (const tag of mapCompensationToCesTags(type)) {
      tags.add(tag);
    }
  }
  return Array.from(tags);
}

/**
 * Decide whether an Exercise row's `nasmCorrectiveCategory` (which may be
 * a JSON string from raw queries or a parsed array from Sequelize JSON
 * column) intersects the requested tag set.
 *
 * @param {string | string[] | null} rowTags
 * @param {string[]} requestedTags
 * @returns {boolean}
 */
function rowMatchesAnyTag(rowTags, requestedTags) {
  if (!rowTags || !Array.isArray(requestedTags) || requestedTags.length === 0) {
    return false;
  }
  let parsed = rowTags;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return false; }
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return false;
  return parsed.some((t) => requestedTags.includes(t));
}

/**
 * Group a flat array of Exercise rows by `cesProtocolStep`.
 * Ignores rows whose step is missing or not in the canonical four-step
 * list (defensive — V3b.3.3 seeder writes only valid values, but
 * unrelated ces-* rows in future seeders could deviate).
 *
 * @param {Array<object>} exerciseRows
 * @returns {{ inhibit: object[], lengthen: object[], activate: object[], integrate: object[] }}
 */
function groupByProtocolStep(exerciseRows) {
  const grouped = { inhibit: [], lengthen: [], activate: [], integrate: [] };
  for (const row of exerciseRows) {
    const step = row.cesProtocolStep;
    if (VALID_PROTOCOL_STEPS.includes(step)) {
      grouped[step].push(row);
    }
  }
  return grouped;
}

/**
 * Fetch all CES corrective exercises (`exercise_key LIKE 'ces-%'`) that
 * match ANY of the input compensations, grouped by cesProtocolStep.
 *
 * Why fetch-all-and-filter rather than a JSON-containment SQL query:
 *   - V3b.3 ships exactly 32 ces-* rows. Even at 5x growth, the
 *     payload is ~160 rows / a few KB. App-side filtering is faster
 *     than JSON containment queries on a JSON (not JSONB) column,
 *     and is portable across SQL dialects.
 *   - If the registry ever grows past low thousands, swap to a
 *     `nasmCorrectiveCategory @> :tags` JSONB query — but only after
 *     converting the column to JSONB and indexing with GIN.
 *
 * @param {object} params
 * @param {Array<string | { type: string }>} params.compensations
 * @param {object} params.Exercise — Sequelize Exercise model
 * @param {string[]} [params.includeSteps] — limit to a subset of {inhibit,lengthen,activate,integrate}
 * @returns {Promise<{
 *   tags: string[],
 *   matchedCount: number,
 *   inhibit: object[],
 *   lengthen: object[],
 *   activate: object[],
 *   integrate: object[],
 * }>}
 */
export async function getCorrectiveExercisesForCompensations({
  compensations,
  Exercise,
  includeSteps,
}) {
  if (!Exercise) {
    throw new Error('correctiveExerciseService: Exercise model is required');
  }
  const tags = compensationsToTagSet(compensations);
  if (tags.length === 0) {
    return { tags: [], matchedCount: 0, inhibit: [], lengthen: [], activate: [], integrate: [] };
  }

  // Fetch all ces-* rows. The Sequelize iLike operator on exercise_key
  // is portable; the JSON-containment filter happens in JS.
  const { Op } = await import('sequelize');
  const rows = await Exercise.findAll({
    where: { exercise_key: { [Op.like]: 'ces-%' } },
    attributes: [
      'id', 'name', 'exercise_key', 'exerciseType', 'bodyPartCategory',
      'primaryMuscles', 'secondaryMuscles',
      'nasmCorrectiveCategory', 'cesProtocolStep', 'sourceCitation',
      'difficulty',
    ],
    raw: true,
  });

  const matched = rows.filter((r) => rowMatchesAnyTag(r.nasmCorrectiveCategory, tags));
  const grouped = groupByProtocolStep(matched);

  if (Array.isArray(includeSteps) && includeSteps.length > 0) {
    const requested = new Set(includeSteps);
    for (const step of VALID_PROTOCOL_STEPS) {
      if (!requested.has(step)) grouped[step] = [];
    }
  }

  return {
    tags,
    matchedCount: matched.length,
    ...grouped,
  };
}

// Test-only export for unit testing without a DB.
export const __testing__ = {
  COMPENSATION_TO_V3B3_TAGS,
  VALID_PROTOCOL_STEPS,
  rowMatchesAnyTag,
  groupByProtocolStep,
};
