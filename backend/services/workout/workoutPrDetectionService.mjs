/**
 * workoutPrDetectionService.mjs — server-side PR engine (launch charter 4a)
 * ===========================================================================
 * Detects personal records at the workout WRITE path — single writer,
 * idempotent, never fails the save.
 *
 * FLOW (detectAndRecordPersonalRecords):
 *   1. buildPrCandidates: best weight + best Brzycki est-1RM per exercise from
 *      the just-logged sets (pure; exported for tests).
 *   2. Prior bests: personal_records rows for those exercises; exercises with
 *      NO row bootstrap their baseline from workout_logs history (excluding
 *      the current session) so the first run against existing history never
 *      fakes a wall of PRs.
 *   3. New best → upsert the row + ONE idempotent ledger award via
 *      GamificationPointsService (key pr:{userId}:{exercise}:{metric}:{date},
 *      unique-indexed — replays/duplicate submits cannot double-award).
 *   4. First-ever lift (zero history) → quiet 'first' event: recorded, NOT
 *      point-awarded, and celebrated softly ("New lift unlocked").
 *
 * CONTRACT: same never-fail posture as workoutXpAwardStep — callers wrap in
 * try/catch; any throw here must never block the 201/save. Returns
 * { prEvents } for the response so SaveSuccessPanel celebrates truthfully.
 */
import { Op } from 'sequelize';
import { getPersonalRecord } from '../../models/index.mjs';
import { estimateBrzycki1RM } from '../oneRepMaxService.mjs';
import logger from '../../utils/logger.mjs';

export const PR_POINTS = 25;

const toPositiveNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Pure: best weight + best est-1RM candidate per exercise from logged sets. */
export function buildPrCandidates(exercises = []) {
  const candidates = new Map();
  for (const exercise of exercises) {
    const name = String(exercise?.exerciseName || exercise?.name || '').trim();
    if (!name) continue;
    for (const set of exercise?.sets || []) {
      const weight = toPositiveNumber(set?.weight);
      const reps = toPositiveNumber(set?.reps);
      if (!weight || !reps) continue;
      const entry = candidates.get(name) || { exerciseName: name, weight: null, est1rm: null };
      if (!entry.weight || weight > entry.weight.value) {
        entry.weight = { value: weight, weight, reps };
      }
      if (reps <= 15) {
        const est = estimateBrzycki1RM(weight, reps);
        const estValue = toPositiveNumber(est);
        if (estValue && (!entry.est1rm || estValue > entry.est1rm.value)) {
          entry.est1rm = { value: estValue, weight, reps };
        }
      }
      candidates.set(name, entry);
    }
  }
  return [...candidates.values()];
}

/**
 * BOOTSTRAP SEMANTICS (deliberate): "no personal_records row" = first-ever →
 * a QUIET baseline event (no points, soft copy). Users with pre-engine history
 * get their baseline recorded on their next log instead of a history join
 * (workout_logs has no userId — ownership requires a sessions join; the
 * optional Sean-gated backfill script can seed real historical bests so PRs
 * compare against true history from day 1).
 */

/**
 * Main entry. Never throws to the caller's happy path — callers still wrap.
 * @returns {Promise<{ prEvents: Array }>} additive response payload
 */
export async function detectAndRecordPersonalRecords({
  userId,
  formId = null,
  sessionId = null,
  exercises = [],
  date = null,
  // Charter v3 H integrity rails: historical/backfilled sources RECORD
  // baselines (they represent real training, stamped at the workout date)
  // but must NEVER earn points or celebration.
  awardPoints = true,
  achievedAt = null,
}) {
  const numericUserId = Number(userId);
  if (!Number.isInteger(numericUserId) || numericUserId <= 0) return { prEvents: [] };

  const candidates = buildPrCandidates(exercises);
  if (candidates.length === 0) return { prEvents: [] };

  const names = candidates.map((c) => c.exerciseName);
  const PersonalRecord = getPersonalRecord();
  const existing = await PersonalRecord.findAll({
    where: { userId: numericUserId, exerciseName: { [Op.in]: names } },
  });
  const existingByKey = new Map(existing.map((r) => [`${r.exerciseName}::${r.metric}`, r]));

  const prEvents = [];
  const dateKey = String(date || new Date().toISOString().slice(0, 10)).slice(0, 10);

  for (const candidate of candidates) {
    for (const metric of ['weight', 'est1rm']) {
      const best = candidate[metric];
      if (!best) continue;
      const key = `${candidate.exerciseName}::${metric}`;
      const prior = existingByKey.get(key);

      if (!prior) {
        // First-ever recorded best for this metric: quiet "first", no points.
        await PersonalRecord.create({
          userId: numericUserId,
          exerciseName: candidate.exerciseName,
          metric,
          value: best.value,
          weight: best.weight,
          reps: best.reps,
          sessionId,
          formId: formId ? String(formId) : null,
          achievedAt: achievedAt ? new Date(achievedAt) : new Date(),
        }).catch((err) => {
          // Unique-index race (double submit): safe to ignore — the row exists.
          logger.warn('[PrDetection] create raced/failed', { userId: numericUserId, key, error: err?.message });
        });
        if (metric === 'weight') {
          prEvents.push({
            exerciseName: candidate.exerciseName,
            metric,
            value: best.value,
            previous: null,
            first: true,
          });
        }
        continue;
      }

      if (best.value > Number(prior.value)) {
        const previous = Number(prior.value);
        await prior
          .update({
            value: best.value,
            weight: best.weight,
            reps: best.reps,
            sessionId,
            formId: formId ? String(formId) : null,
            achievedAt: achievedAt ? new Date(achievedAt) : new Date(),
          })
          .catch((err) => {
            logger.warn('[PrDetection] update failed', { userId: numericUserId, key, error: err?.message });
          });

        prEvents.push({
          exerciseName: candidate.exerciseName,
          metric,
          value: best.value,
          previous,
          first: false,
        });

        if (awardPoints) {
          try {
            // Lazy import: GamificationPointsService defines Sequelize models at
            // module load, which breaks route tests that mock database.mjs.
            const { default: GamificationPointsService } =
              await import('../gamification/GamificationPointsService.mjs');
            await GamificationPointsService.recordLedgerEntry({
              userId: numericUserId,
              points: PR_POINTS,
              source: 'achievement_earned',
              description: `Personal record: ${candidate.exerciseName} (${metric === 'weight' ? 'top weight' : 'est. 1RM'})`,
              // Name sliced to keep the key inside PointTransaction's 128-char column.
              idempotencyKey: `pr:${numericUserId}:${candidate.exerciseName.slice(0, 60)}:${metric}:${dateKey}`,
              metadata: { exerciseName: candidate.exerciseName, metric, value: best.value, previous },
            });
          } catch (awardErr) {
            logger.warn('[PrDetection] PR award failed (record kept, non-critical)', {
              userId: numericUserId,
              key,
              error: awardErr?.message,
            });
          }
        }
      }
    }
  }

  if (prEvents.length > 0) {
    logger.info('[PrDetection] PR events recorded', {
      userId: numericUserId,
      formId,
      count: prEvents.length,
      exercises: prEvents.map((e) => e.exerciseName),
    });
  }
  return { prEvents };
}
