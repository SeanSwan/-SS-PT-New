/**
 * Equipment Gap Report Service
 * ============================
 * Slice S6 (Equipment Overhaul blueprint §3.3): deterministic movement-pattern
 * coverage analysis for one equipment profile. Powers the Equipment IQ panel
 * (GET /api/equipment-insights/profile/:profileId/gap-report) and the Swan
 * Coach `equipment_gap_report` command.
 *
 * DESIGN:
 *   - Pure logic + exactly ONE DB read path (buildEquipmentGapReport).
 *   - NO LLM calls. Suggestions are ranked by a deterministic score.
 *   - Names-only output (item names/categories) — zero PII (Rule 8), matching
 *     the names-only equipment context in services/ai/contextBuilder.mjs.
 *
 * COVERAGE MODEL:
 *   - An item's movement patterns come from aiScanData.movementPatterns when
 *     present (normalized to the canonical 8), else from the category
 *     heuristic map below.
 *   - Per-pattern coverage = min(1, itemsCoveringPattern / FULL_COVERAGE_ITEM_COUNT).
 *   - Counted items: isActive + approvalStatus in COUNTED_APPROVAL_STATUSES.
 *     'approved' (human-approved AI scan) and 'manual' (trainer-entered — the
 *     default for manual adds AND what Coach `equipment_add_item` creates) are
 *     both human-vouched; 'pending'/'rejected' never count.
 */
import { Op } from 'sequelize';
import { getEquipmentItem } from '../models/index.mjs';

/** Canonical movement patterns, in deterministic tie-break order. */
export const MOVEMENT_PATTERNS = [
  'push', 'pull', 'hinge', 'squat', 'lunge', 'carry', 'core', 'rotation',
];

/** Approval statuses that count toward coverage (human-vouched only). */
export const COUNTED_APPROVAL_STATUSES = ['approved', 'manual'];

/** Items covering a pattern needed for full (1.0) coverage. */
export const FULL_COVERAGE_ITEM_COUNT = 2;

/**
 * Category → movement-pattern heuristic (fallback when an item has no
 * aiScanData.movementPatterns). Keys mirror the EquipmentItem model's
 * category validate list (backend/models/EquipmentItem.mjs).
 */
export const CATEGORY_PATTERN_MAP = {
  barbell:         ['push', 'pull', 'hinge', 'squat', 'lunge', 'carry'],
  dumbbell:        ['push', 'pull', 'hinge', 'squat', 'lunge', 'carry'],
  kettlebell:      ['push', 'pull', 'hinge', 'squat', 'lunge', 'carry', 'core'],
  cable_machine:   ['push', 'pull', 'core', 'rotation'],
  resistance_band: ['push', 'pull', 'core'],
  bodyweight:      ['push', 'squat', 'lunge', 'core'],
  machine:         ['push', 'pull', 'squat'],
  bench:           ['push'],
  rack:            ['squat'],
  cardio:          [],
  foam_roller:     [],
  lacrosse_ball:   [],
  stability_ball:  ['core'],
  medicine_ball:   ['push', 'core', 'rotation'],
  pull_up_bar:     ['pull', 'core'],
  trx:             ['push', 'pull', 'lunge', 'core'],
  other:           [],
};

/**
 * Cheap-addition catalog for gap suggestions, in deterministic catalog order
 * (JS stable sort preserves this order on score ties). A suggestion is
 * skipped when the profile already owns an item of the same category.
 */
export const SUGGESTION_CATALOG = [
  { addition: 'Loop resistance band', category: 'resistance_band', patterns: ['push', 'pull', 'core'] },
  { addition: 'Adjustable dumbbells', category: 'dumbbell', patterns: ['push', 'pull', 'hinge', 'squat', 'lunge', 'carry'] },
  { addition: 'Kettlebell', category: 'kettlebell', patterns: ['push', 'pull', 'hinge', 'squat', 'lunge', 'carry', 'core'] },
  { addition: 'Doorway pull-up bar', category: 'pull_up_bar', patterns: ['pull', 'core'] },
];

const MAX_SUGGESTIONS = 3;
const MAX_EXAMPLE_ITEMS = 3;

const round2 = (value) => Math.round(value * 100) / 100;

/**
 * Resolve the movement patterns one item contributes.
 * aiScanData.movementPatterns wins when it yields at least one canonical
 * pattern; otherwise the category heuristic applies.
 *
 * @param {{ category?: string, aiScanData?: { movementPatterns?: string[] } | null }} item
 * @returns {string[]} canonical patterns (deduped, canonical order)
 */
export function resolveItemPatterns(item) {
  const scanned = Array.isArray(item?.aiScanData?.movementPatterns)
    ? item.aiScanData.movementPatterns
        .map((p) => String(p).toLowerCase().trim())
        .filter((p) => MOVEMENT_PATTERNS.includes(p))
    : [];
  if (scanned.length > 0) {
    return MOVEMENT_PATTERNS.filter((p) => scanned.includes(p));
  }
  return CATEGORY_PATTERN_MAP[item?.category] ?? [];
}

/**
 * Pure gap-report computation over already-loaded items. No DB access.
 *
 * @param {number} profileId
 * @param {Array<{ name: string, trainerLabel?: string|null, category?: string,
 *                 aiScanData?: object|null }>} items - counted (approved/manual, active) items
 * @returns {{
 *   profileId: number,
 *   patterns: Array<{ pattern: string, coverage: number, itemCount: number, exampleItems: string[] }>,
 *   overallCoverage: number,
 *   weakestPattern: string,
 *   suggestions: Array<{ addition: string, unlocksPatterns: string[], reason: string }>,
 * }}
 */
export function computeGapReportFromItems(profileId, items) {
  const safeItems = Array.isArray(items) ? items : [];

  // ── Per-pattern tallies ────────────────────────────────────────────────────
  const tallies = new Map(MOVEMENT_PATTERNS.map((p) => [p, { itemCount: 0, exampleItems: [] }]));
  const ownedCategories = new Set();

  for (const item of safeItems) {
    if (item?.category) ownedCategories.add(item.category);
    const displayName = item?.trainerLabel || item?.name || 'Unnamed item';
    for (const pattern of resolveItemPatterns(item)) {
      const tally = tallies.get(pattern);
      tally.itemCount += 1;
      if (tally.exampleItems.length < MAX_EXAMPLE_ITEMS) {
        tally.exampleItems.push(displayName);
      }
    }
  }

  const patterns = MOVEMENT_PATTERNS.map((pattern) => {
    const { itemCount, exampleItems } = tallies.get(pattern);
    return {
      pattern,
      coverage: round2(Math.min(1, itemCount / FULL_COVERAGE_ITEM_COUNT)),
      itemCount,
      exampleItems,
    };
  });

  // ── Overall + weakest (canonical order breaks ties deterministically) ─────
  const overallCoverage = round2(
    patterns.reduce((sum, p) => sum + p.coverage, 0) / patterns.length,
  );
  let weakest = patterns[0];
  for (const p of patterns) {
    if (p.coverage < weakest.coverage) weakest = p;
  }

  // ── Suggestions: rank cheap additions by coverage lift, deterministic ─────
  const coverageByPattern = new Map(patterns.map((p) => [p.pattern, p.coverage]));
  const suggestions = SUGGESTION_CATALOG
    .filter((candidate) => !ownedCategories.has(candidate.category))
    .map((candidate) => {
      const unlocksPatterns = candidate.patterns.filter(
        (p) => coverageByPattern.get(p) < 1,
      );
      const score = candidate.patterns.reduce(
        (sum, p) => sum + (1 - coverageByPattern.get(p)),
        0,
      );
      return { candidate, unlocksPatterns, score: round2(score) };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score) // stable: catalog order breaks ties
    .slice(0, MAX_SUGGESTIONS)
    .map(({ candidate, unlocksPatterns }) => ({
      addition: candidate.addition,
      unlocksPatterns,
      reason: `Raises ${unlocksPatterns.join(', ')} coverage (current weakest: ${weakest.pattern})`,
    }));

  return {
    profileId,
    patterns,
    overallCoverage,
    weakestPattern: weakest.pattern,
    suggestions,
  };
}

/**
 * Build the gap report for one equipment profile — the single DB read path.
 * Caller is responsible for profile ownership checks (route/dispatcher layer).
 *
 * @param {number} profileId - EquipmentProfile id (positive integer)
 * @returns {Promise<ReturnType<typeof computeGapReportFromItems>>}
 */
export async function buildEquipmentGapReport(profileId) {
  const id = Number(profileId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error('buildEquipmentGapReport requires a positive integer profileId');
  }

  const EquipmentItem = getEquipmentItem();
  const items = await EquipmentItem.findAll({
    where: {
      profileId: id,
      isActive: true,
      approvalStatus: { [Op.in]: COUNTED_APPROVAL_STATUSES },
    },
    attributes: ['id', 'name', 'trainerLabel', 'category', 'aiScanData'],
    order: [['name', 'ASC']],
  });

  return computeGapReportFromItems(id, items);
}
