/**
 * historyBackfillService.mjs — attested history backfill (charter v3 H)
 * =======================================================================
 * Sean: "if three months of working out are missed, I need three months of
 * filler based off what we've been doing already" — grounded in the client's
 * REAL exercise history, previewed and edited by the trainer, ATTESTED, and
 * committed through the unified write path under the pre-existing
 * `ai_generated_backfill` source class whose policy suppresses billing, plan
 * advancement, XP/streaks, and (via the 4a rail) PR awards. Charts include
 * the sessions — that's the point: proof of work that actually happened.
 *
 * DETERMINISM: the generator is seeded from the date+exercise strings, so the
 * same inputs always preview identically (stable re-preview, testable).
 * CAPS: 120 days per run, 60 sessions max (charter V3-C). UNDO: every run is
 * recorded with its created form/session ids; undo deletes logs → sessions →
 * forms in one transaction (FK-safe) and stamps the run undone.
 */
import { Op } from 'sequelize';
import sequelize from '../../database.mjs';
import HistoryBackfillRun from '../../models/HistoryBackfillRun.mjs';
import { getDailyWorkoutForm } from '../../models/index.mjs';
import { getExerciseHistoryFromLogs } from '../analyticsExerciseHistoryService.mjs';
import { submitAiWorkoutLogAsDailyForm } from './aiWorkoutDailyFormService.mjs';
import logger from '../../utils/logger.mjs';

export const BACKFILL_MAX_DAYS = 120;
export const BACKFILL_MAX_SESSIONS = 60;
export const BACKFILL_SOURCE = 'ai_generated_backfill';

/* ── deterministic pseudo-random (string-seeded xorshift) ── */
const seedFrom = (text) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const nextFloat = (state) => {
  let x = state;
  x ^= x << 13; x >>>= 0;
  x ^= x >> 17;
  x ^= x << 5; x >>>= 0;
  return { state: x, value: (x % 10000) / 10000 };
};

const isoAddDays = (iso, days) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a, b) =>
  Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86_400_000);

/** Session weekday offsets per cadence (spread through the week). */
const CADENCE_OFFSETS = {
  1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6],
};

/**
 * PURE + DETERMINISTIC: realistic sessions across the range from the client's
 * real exercise distribution. Loads stay AT OR BELOW each exercise's observed
 * max with mild week-over-week progression toward it.
 */
export function generateBackfillDays({
  startDate,
  endDate,
  sessionsPerWeek = 3,
  exercisePool = [],
  dominantExercises = [],
  breaks = [],
  conflictDates = [],
}) {
  const totalDays = daysBetween(startDate, endDate) + 1;
  if (totalDays <= 0) throw new Error('endDate must be on or after startDate');
  if (totalDays > BACKFILL_MAX_DAYS) {
    throw new Error(`Backfill range is capped at ${BACKFILL_MAX_DAYS} days per run`);
  }
  const pool = exercisePool.filter((p) => p?.exerciseName);
  if (pool.length === 0) {
    throw new Error('No exercise history to ground the backfill — log at least a few real sessions first (or supply a pool)');
  }

  const cadence = Math.min(Math.max(Math.round(sessionsPerWeek) || 3, 1), 7);
  const offsets = CADENCE_OFFSETS[cadence];
  const conflicts = new Set(conflictDates);
  const inBreak = (iso) => breaks.some((b) => b?.start && b?.end && iso >= b.start && iso <= b.end);

  // Weighted pool: frequency-weighted, dominant exercises boosted 2x.
  const dominant = new Set(dominantExercises);
  const weighted = pool.map((p) => ({
    ...p,
    weightFactor: Math.max(1, Number(p.timesPerformed) || 1) * (dominant.has(p.exerciseName) ? 2 : 1),
  }));
  const totalWeight = weighted.reduce((sum, p) => sum + p.weightFactor, 0);
  const pickExercise = (state) => {
    const roll = nextFloat(state);
    let cursor = roll.value * totalWeight;
    for (const p of weighted) {
      cursor -= p.weightFactor;
      if (cursor <= 0) return { state: roll.state, picked: p };
    }
    return { state: roll.state, picked: weighted[weighted.length - 1] };
  };

  const weeks = Math.ceil(totalDays / 7);
  const days = [];
  for (let w = 0; w < weeks && days.length < BACKFILL_MAX_SESSIONS; w += 1) {
    for (const offset of offsets) {
      if (days.length >= BACKFILL_MAX_SESSIONS) break;
      const date = isoAddDays(startDate, w * 7 + offset);
      if (date > endDate || conflicts.has(date) || inBreak(date)) continue;

      let state = seedFrom(`backfill:${date}`);
      const exerciseCountRoll = nextFloat(state);
      state = exerciseCountRoll.state;
      const exerciseCount = 3 + Math.floor(exerciseCountRoll.value * 3); // 3-5
      const used = new Set();
      const exercises = [];
      // Gentle progression: later weeks push closer to the observed max.
      const progress = weeks > 1 ? w / (weeks - 1) : 1;

      while (exercises.length < exerciseCount && used.size < weighted.length) {
        const pick = pickExercise(state);
        state = pick.state;
        if (used.has(pick.picked.exerciseName)) continue;
        used.add(pick.picked.exerciseName);
        const maxWeight = Math.max(1, Number(pick.picked.maxWeight) || 45);
        const repsBase = Math.min(Math.max(Number(pick.picked.maxReps) || 8, 3), 12);
        const sets = [];
        for (let s = 0; s < 3; s += 1) {
          const noise = nextFloat(state);
          state = noise.state;
          // 70–90% of max early, drifting to 80–100% by the final week; never above max.
          const low = 0.70 + 0.10 * progress;
          const span = 0.20;
          const load = Math.min(maxWeight, Math.round((maxWeight * (low + span * noise.value)) / 5) * 5 || 5);
          sets.push({
            setNumber: s + 1,
            weight: Math.min(load, maxWeight),
            reps: Math.min(15, Math.max(3, repsBase + (s === 2 ? -1 : 0))),
            rpe: null,
            restTime: 90,
            formQuality: null,
          });
        }
        exercises.push({ exerciseName: pick.picked.exerciseName, sets, formRating: null, painLevel: 0 });
      }
      if (exercises.length > 0) days.push({ date, exercises });
    }
  }
  return days;
}

/** Preview for a client: real pool + conflict detection (nothing persisted). */
export async function buildBackfillPreview({
  userId,
  startDate,
  endDate,
  sessionsPerWeek = 3,
  dominantExercises = [],
  breaks = [],
}) {
  const history = await getExerciseHistoryFromLogs(userId, { limit: 30 });
  const exercisePool = (history?.exercises ?? []).map((row) => ({
    exerciseName: row.exerciseName,
    timesPerformed: row.timesPerformed,
    maxWeight: row.maxWeight,
    maxReps: row.maxReps,
  }));

  const DailyWorkoutForm = getDailyWorkoutForm();
  const existing = await DailyWorkoutForm.findAll({
    where: { clientId: userId, date: { [Op.between]: [startDate, endDate] } },
    attributes: ['date'],
    raw: true,
  });
  const conflictDates = existing.map((r) => String(r.date).slice(0, 10));

  const days = generateBackfillDays({
    startDate, endDate, sessionsPerWeek, exercisePool, dominantExercises, breaks, conflictDates,
  });
  return { days, exercisePoolSize: exercisePool.length, conflictDates };
}

/** Commit (attested) through the unified write path under the suppressed source. */
export async function commitBackfill({ userId, trainerId, days, attestation, grounding = null }) {
  if (typeof attestation !== 'string' || attestation.trim().length < 10) {
    const err = new Error('Trainer attestation is required (at least 10 characters) — it certifies this reflects training that occurred');
    err.statusCode = 400;
    throw err;
  }
  if (!Array.isArray(days) || days.length === 0) {
    const err = new Error('No days to commit');
    err.statusCode = 400;
    throw err;
  }
  if (days.length > BACKFILL_MAX_SESSIONS) {
    const err = new Error(`Backfill commits are capped at ${BACKFILL_MAX_SESSIONS} sessions per run`);
    err.statusCode = 400;
    throw err;
  }

  const created = [];
  const skipped = [];
  for (const day of days) {
    try {
      const result = await submitAiWorkoutLogAsDailyForm({
        clientId: userId,
        trainerId,
        date: day.date,
        exercises: day.exercises,
        title: 'Backfilled session',
        notes: 'Backfilled from trainer-attested history',
        source: BACKFILL_SOURCE,
        sequelize,
      });
      created.push({ date: day.date, formId: result.formId, sessionId: result.sessionId });
    } catch (err) {
      skipped.push({ date: day.date, reason: err?.message?.slice(0, 120) ?? 'failed' });
    }
  }

  const run = await HistoryBackfillRun.create({
    userId,
    trainerId,
    startDate: days[0]?.date ?? null,
    endDate: days[days.length - 1]?.date ?? null,
    attestation: attestation.trim(),
    grounding,
    created,
    skipped,
  });
  logger.info('[HistoryBackfill] run #%d: %d created, %d skipped (client %d)', run.id, created.length, skipped.length, userId);
  return { runId: run.id, created, skipped };
}

/** Undo a run: delete workout_logs → workout_sessions → daily_workout_forms. */
export async function undoBackfillRun({ runId, trainerId }) {
  const run = await HistoryBackfillRun.findByPk(runId);
  if (!run) {
    const err = new Error('Backfill run not found');
    err.statusCode = 404;
    throw err;
  }
  if (run.undoneAt) {
    const err = new Error('This backfill run was already undone');
    err.statusCode = 400;
    throw err;
  }
  const created = Array.isArray(run.created) ? run.created : [];
  const sessionIds = created.map((c) => c.sessionId).filter(Boolean);
  const formIds = created.map((c) => c.formId).filter(Boolean);

  await sequelize.transaction(async (transaction) => {
    if (sessionIds.length > 0) {
      await sequelize.query('DELETE FROM workout_logs WHERE "sessionId" IN (:sessionIds)', {
        replacements: { sessionIds }, transaction,
      });
      await sequelize.query('DELETE FROM workout_sessions WHERE id IN (:sessionIds)', {
        replacements: { sessionIds }, transaction,
      });
    }
    if (formIds.length > 0) {
      await sequelize.query('DELETE FROM daily_workout_forms WHERE id IN (:formIds)', {
        replacements: { formIds }, transaction,
      });
    }
    await run.update({ undoneAt: new Date(), undoneBy: trainerId }, { transaction });
  });

  logger.info('[HistoryBackfill] run #%d undone by %d (%d sessions removed)', runId, trainerId, sessionIds.length);
  return { runId, removedSessions: sessionIds.length, removedForms: formIds.length };
}
