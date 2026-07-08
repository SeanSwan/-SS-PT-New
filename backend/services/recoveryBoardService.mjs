/**
 * recoveryBoardService.mjs — the Recovery & Mobility Board engine (4B.2/4B.3)
 * =============================================================================
 * Answers "what recovery work should I do TODAY?" from real data only.
 * DETERMINISTIC, ZERO-LLM, comfort-language (Rule 9: stretching/flexibility/
 * mobility/myofascial release — never yoga/meditation; never medical advice).
 *
 * Pipeline:
 *   MovementProfile.commonCompensations (OHSA truth)
 *     → correctiveExerciseService.getCorrectiveExercisesForCompensations
 *     → composeRecoveryBoard (PURE — exported for tests): caps the list at
 *       3 SMR + 3 stretches + 2 drills, threads pain-caution regions and
 *       days-since-last-recovery, honest 'no-assessment' starter state.
 *
 * Completions (4B.3): recordRecoveryCompletion — unique per user+exercise+date,
 * XP-light via the idempotent ledger (award failure never loses the check-in),
 * NEVER billable, NEVER advances the main-plan cursor (charter v3 P4 lane
 * separation).
 */
import { Op } from 'sequelize';
import { getMovementProfile, getExercise, getRecoveryCompletion } from '../models/index.mjs';
import { getCorrectiveExercisesForCompensations } from './ai/correctiveExerciseService.mjs';
import GamificationPointsService from './gamification/GamificationPointsService.mjs';
import logger from '../utils/logger.mjs';

export const RECOVERY_XP_POINTS = 10;

/** Mirrors the render-locked pain-panel + NBA disclosure pattern. */
export const RECOVERY_BOARD_DISCLAIMERS = [
  'These are comfort modifications for training only — not medical advice, diagnosis, or treatment. For persistent or severe pain, consult a healthcare professional.',
  'Rule-based guidance from your logged training data — not medical advice.',
];

const CAPS = { smrTargets: 3, stretches: 3, mobilityDrills: 2 };

const toBoardItem = (row, reasonTag) => ({
  key: row.exercise_key,
  name: row.name,
  step: row.cesProtocolStep,
  region: Array.isArray(row.primaryMuscles) ? row.primaryMuscles[0] ?? null : null,
  durationSec: Number(row.recommendedDuration) || null,
  reason: reasonTag,
});

const firstTag = (row) =>
  Array.isArray(row.nasmCorrectiveCategory) && row.nasmCorrectiveCategory.length > 0
    ? row.nasmCorrectiveCategory[0]
    : null;

/**
 * PURE composition — no I/O. Exported for tests.
 * @returns board payload with status 'ready' | 'no-assessment'
 */
export function composeRecoveryBoard({
  compensations,
  correctiveGroups,
  painSummary,
  daysSinceLastRecovery,
}) {
  const hasCompensations = Array.isArray(compensations) && compensations.length > 0;
  const groups = correctiveGroups ?? { inhibit: [], lengthen: [], activate: [], integrate: [] };
  const anyContent =
    (groups.inhibit?.length ?? 0) +
      (groups.lengthen?.length ?? 0) +
      (groups.activate?.length ?? 0) +
      (groups.integrate?.length ?? 0) >
    0;

  if (!hasCompensations || !anyContent) {
    return {
      status: 'no-assessment',
      smrTargets: [],
      stretches: [],
      mobilityDrills: [],
      syndromeFocus: [],
      cautionRegions: [],
      intensityNote: null,
      daysSinceLastRecovery: daysSinceLastRecovery ?? null,
      starterMessage:
        'Complete a movement assessment with your trainer (or log a few workouts) to unlock a personalized daily recovery plan.',
      disclaimers: RECOVERY_BOARD_DISCLAIMERS,
    };
  }

  const smrTargets = (groups.inhibit ?? [])
    .slice(0, CAPS.smrTargets)
    .map((row) => toBoardItem(row, firstTag(row)));
  const stretches = (groups.lengthen ?? [])
    .slice(0, CAPS.stretches)
    .map((row) => toBoardItem(row, firstTag(row)));
  // Drills: activation first, integration fills any remaining slot.
  const drillPool = [...(groups.activate ?? []), ...(groups.integrate ?? [])];
  const mobilityDrills = drillPool
    .slice(0, CAPS.mobilityDrills)
    .map((row) => toBoardItem(row, firstTag(row)));

  const maxPain = Number(painSummary?.maxLevel) || 0;
  const cautionRegions = maxPain >= 4 && Array.isArray(painSummary?.regions) ? painSummary.regions : [];
  const intensityNote =
    maxPain >= 7
      ? 'High discomfort reported — keep today gentle: myofascial release and easy stretching only, and stay out of painful ranges.'
      : maxPain >= 4
        ? 'Some discomfort reported — work for comfort, not intensity, and skip anything that aggravates the flagged regions.'
        : null;

  return {
    status: 'ready',
    smrTargets,
    stretches,
    mobilityDrills,
    syndromeFocus: [...new Set(compensations.map((c) => (typeof c === 'string' ? c : c?.type)).filter(Boolean))],
    cautionRegions,
    intensityNote,
    daysSinceLastRecovery: daysSinceLastRecovery ?? null,
    starterMessage: null,
    disclaimers: RECOVERY_BOARD_DISCLAIMERS,
  };
}

/** Days since the user's most recent recovery completion (null = never). */
export async function getDaysSinceLastRecovery(userId) {
  const latest = await getRecoveryCompletion().findOne({
    where: { userId },
    order: [['completedDate', 'DESC']],
    attributes: ['completedDate'],
    raw: true,
  });
  if (!latest?.completedDate) return null;
  const last = new Date(`${latest.completedDate}T12:00:00Z`);
  const diff = Math.floor((Date.now() - last.getTime()) / 86_400_000);
  return diff < 0 ? 0 : diff;
}

/** Full board for a user: profile → registry → pure compose. */
export async function getTodayRecoveryBoard(userId) {
  const MovementProfile = getMovementProfile();
  const Exercise = getExercise();

  const profile = await MovementProfile.findOne({
    where: { userId },
    attributes: ['commonCompensations'],
    raw: true,
  });
  const compensations = Array.isArray(profile?.commonCompensations)
    ? profile.commonCompensations
    : [];

  const correctiveGroups =
    compensations.length > 0
      ? await getCorrectiveExercisesForCompensations({ compensations, Exercise })
      : { inhibit: [], lengthen: [], activate: [], integrate: [] };

  const daysSinceLastRecovery = await getDaysSinceLastRecovery(userId);

  // Pain summary: reuse the NBA context's shape via ClientPainEntry directly
  // (single cheap read; ≥4 = modify, ≥7 = gentle-only per painChartInsights).
  let painSummary = null;
  try {
    const { default: ClientPainEntry } = await import('../models/ClientPainEntry.mjs');
    const entries = await ClientPainEntry.findAll({
      where: { userId, isActive: true },
      attributes: ['bodyRegion', 'painLevel'],
      raw: true,
    });
    if (entries.length > 0) {
      painSummary = {
        activeCount: entries.length,
        maxLevel: Math.max(...entries.map((e) => Number(e.painLevel) || 0)),
        regions: [...new Set(entries.map((e) => e.bodyRegion).filter(Boolean))],
      };
    }
  } catch (err) {
    logger.warn('[RecoveryBoard] pain summary unavailable (board proceeds)', {
      userId,
      error: err?.message,
    });
  }

  return composeRecoveryBoard({ compensations, correctiveGroups, painSummary, daysSinceLastRecovery });
}

/**
 * Record a completion (4B.3). Idempotent per (user, exerciseKey, date);
 * validates the key against the ces registry; XP awarded via the idempotent
 * ledger — XP award failed (completion kept) is the contract.
 */
export async function recordRecoveryCompletion({ userId, exerciseKey, date = null }) {
  const numericUserId = Number(userId);
  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    const err = new Error('Valid user identity is required');
    err.statusCode = 400;
    throw err;
  }
  const key = String(exerciseKey || '').trim();
  if (!/^ces-[a-z0-9-]+$/.test(key)) {
    const err = new Error('exerciseKey must be a ces-* registry key');
    err.statusCode = 400;
    throw err;
  }

  const Exercise = getExercise();
  const registryRow = await Exercise.findOne({
    where: { exercise_key: key },
    attributes: ['name'],
    raw: true,
  });
  if (!registryRow) {
    const err = new Error('Unknown recovery exercise');
    err.statusCode = 404;
    throw err;
  }

  const completedDate = String(date || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const [completion, created] = await getRecoveryCompletion().findOrCreate({
    where: { userId: numericUserId, exerciseKey: key, completedDate },
    defaults: { exerciseName: registryRow.name, source: 'board' },
  });

  let xp = null;
  if (created) {
    try {
      xp = await GamificationPointsService.recordLedgerEntry({
        userId: numericUserId,
        points: RECOVERY_XP_POINTS,
        source: 'achievement_earned',
        description: `Recovery work completed: ${registryRow.name}`,
        idempotencyKey: `recovery:${numericUserId}:${key.slice(0, 60)}:${completedDate}`,
        metadata: { exerciseKey: key, completedDate, lane: 'recovery_board' },
      });
    } catch (awardErr) {
      logger.warn('[RecoveryBoard] XP award failed (completion kept, non-critical)', {
        userId: numericUserId,
        exerciseKey: key,
        error: awardErr?.message,
      });
    }
  }

  return {
    completion: {
      exerciseKey: key,
      exerciseName: completion.exerciseName,
      completedDate,
      alreadyCompleted: !created,
    },
    xpAwarded: xp?.pointsAwarded ?? 0,
  };
}
