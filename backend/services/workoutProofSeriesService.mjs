/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  workoutProofSeriesService.mjs — Post-Save Handoff · PROOF (Slice 1, isolated) ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  PURPOSE: Turn a client's real logged sessions into the "proof" series the     ║
 * ║           Post-Save Handoff renders (Victory e1RM trend for one exercise).     ║
 * ║  SOURCE : Kimi 4.2 blueprint §(g) A2 + Fable ruling §1.5 (data-truth: REAL     ║
 * ║           logged data only — never fabricated points).                         ║
 * ║  SHAPE  : WorkoutSession → exercises (WorkoutExercise → exercise:Exercise.name)║
 * ║           → sets (Set.weightUsed FLOAT, Set.repsCompleted INT, Set.setType).   ║
 * ║  ISOLATION: pure compute + a thin loader. Touches NO save gate, NO deduction,  ║
 * ║             NO route. Slice-1 safe (Fable R5 direct-to-builder track).          ║
 * ║  DATA-TRUTH: if history is empty, returns a single real point or null — it     ║
 * ║              never invents a trend (Product Core Loop data-truth rule).         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// Epley estimated 1-rep max. Guarded so junk rows (null/0/negative) never poison a chart.
export const EPLEY_REP_DIVISOR = 30;
export const PROOF_WINDOW = 12;

/** Estimated 1-rep max for one set (Epley). Returns null when the set can't yield a real estimate. */
export function estimateOneRepMax(weightUsed, repsCompleted) {
  const w = Number(weightUsed);
  const r = Number(repsCompleted);
  if (!Number.isFinite(w) || !Number.isFinite(r) || w <= 0 || r <= 0) return null;
  return Math.round(w * (1 + r / EPLEY_REP_DIVISOR));
}

/** "top set" = the working set that yields the best (max) estimated 1RM. Warmups excluded. */
export function topSetE1rm(sets) {
  if (!Array.isArray(sets) || sets.length === 0) return null;
  const working = sets.filter((s) => s && s.setType !== 'warmup');
  const pool = working.length ? working : sets;
  let best = null;
  for (const s of pool) {
    const e = estimateOneRepMax(s.weightUsed, s.repsCompleted);
    if (e !== null && (best === null || e > best)) best = e;
  }
  return best;
}

/** Total moved load for one logged exercise = Σ weightUsed × repsCompleted over its sets. */
export function exerciseVolume(exercise) {
  if (!exercise || !Array.isArray(exercise.sets)) return 0;
  return exercise.sets.reduce((sum, s) => {
    const w = Number(s?.weightUsed);
    const r = Number(s?.repsCompleted);
    if (!Number.isFinite(w) || !Number.isFinite(r) || w <= 0 || r <= 0) return sum;
    return sum + w * r;
  }, 0);
}

/** Total session volume across all exercises. */
export function sessionVolume(session) {
  if (!session || !Array.isArray(session.exercises)) return 0;
  return session.exercises.reduce((sum, ex) => sum + exerciseVolume(ex), 0);
}

// ISO-8601 week key ("2026-W29") so "sessions this week" and streaks are calendar-correct.
function isoWeekKey(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = utc.getUTCDay() || 7; // Mon=1..Sun=7
  utc.setUTCDate(utc.getUTCDate() + 4 - day); // nearest Thursday
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc - yearStart) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function pickProofExercise(todaySession, priorSessions) {
  const todayExercises = Array.isArray(todaySession?.exercises) ? todaySession.exercises : [];
  if (todayExercises.length === 0) return null;
  // Prior-session appearance count per exerciseId (for the "≥3 prior sessions" rule).
  const priorCount = new Map();
  for (const s of priorSessions) {
    const seen = new Set((s.exercises || []).map((e) => e.exerciseId));
    for (const id of seen) priorCount.set(id, (priorCount.get(id) || 0) + 1);
  }
  // Aggregate today's rows by exerciseId — one exercise can be multiple rows (supersets/re-logging),
  // so rank on the TRUE per-exercise volume, consistent with point-building (not per-row).
  const agg = new Map();
  todayExercises.forEach((ex, idx) => {
    const cur = agg.get(ex.exerciseId);
    if (cur) { cur.vol += exerciseVolume(ex); }
    else {
      agg.set(ex.exerciseId, {
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        idx,
        vol: exerciseVolume(ex),
        priors: priorCount.get(ex.exerciseId) || 0,
      });
    }
  });
  // volume desc, then earliest-listed wins ties (deterministic — matches blueprint AC)
  const ranked = [...agg.values()].sort((a, b) => b.vol - a.vol || a.idx - b.idx);
  const chosen = ranked.find((r) => r.priors >= 3) || ranked[0];
  return { exerciseId: chosen.exerciseId, exerciseName: chosen.exerciseName };
}

/**
 * Pure proof builder. `sessions` = ALL of the user's sessions available (chronological or not),
 * each shaped { id, date, duration, exercises:[{ exerciseId, exerciseName, sets:[{setType,weightUsed,repsCompleted}] }] }.
 * `todaySessionId` selects the just-saved session. `now` defaults to that session's date for determinism.
 * Returns null only when there is no usable session at all.
 */
export function buildProofSeriesFromSessions(sessions, { todaySessionId, windowSize = PROOF_WINDOW, now } = {}) {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;
  const sorted = [...sessions]
    .filter((s) => s && s.id != null && s.date != null)
    .sort((a, b) => new Date(a.date) - new Date(b.date)); // oldest → newest
  if (sorted.length === 0) return null;

  const today = sorted.find((s) => s.id === todaySessionId) || sorted[sorted.length - 1];
  const prior = sorted.filter((s) => s.id !== today.id && new Date(s.date) <= new Date(today.date));

  const proof = pickProofExercise(today, prior);
  if (!proof) return null;
  const exerciseId = proof.exerciseId;
  const exerciseName = proof.exerciseName || 'Exercise';

  // Points: every session (up to today) containing the proof exercise, last `windowSize`, chronological.
  const upToToday = sorted.filter((s) => new Date(s.date) <= new Date(today.date));
  const allPoints = [];
  for (const s of upToToday) {
    // One exercise can be logged as MULTIPLE WorkoutExercise rows in a single session
    // (supersets / circuits / re-logging — no unique (session,exercise) constraint), so aggregate
    // ALL matching rows' sets before picking the top set. Using only the first row hides real PRs.
    const matchingSets = (s.exercises || [])
      .filter((e) => e.exerciseId === exerciseId)
      .flatMap((e) => e.sets || []);
    if (matchingSets.length === 0) continue;
    const e1rm = topSetE1rm(matchingSets);
    if (e1rm === null) continue;
    allPoints.push({ sessionId: s.id, dateISO: new Date(s.date).toISOString(), e1rm, isToday: s.id === today.id });
  }
  const points = allPoints.slice(-windowSize);
  // Honest today value: null when today's proof exercise produced no real e1rm (e.g. bodyweight).
  // NEVER fall back to a prior session's number and render it as "today."
  const todayPoint = allPoints.find((p) => p.isToday) || null;
  const todayE1rm = todayPoint ? todayPoint.e1rm : null;

  // PR is ALL-TIME (not window-bounded), per blueprint.
  const priorE1rms = allPoints.filter((p) => !p.isToday).map((p) => p.e1rm);
  const priorBest = priorE1rms.length ? Math.max(...priorE1rms) : null;
  const pr = todayE1rm !== null && priorBest !== null && todayE1rm > priorBest;
  const prDeltaLbs = pr ? todayE1rm - priorBest : 0;

  // Weekly cadence relative to today's week.
  const todayWeek = isoWeekKey(now || today.date);
  const sessionsThisWeek = upToToday.filter((s) => isoWeekKey(s.date) === todayWeek).length;
  const streakWeeks = countStreakWeeks(upToToday, todayWeek);

  return {
    exerciseId,
    exerciseName,
    points,
    todayE1rm,
    pr,
    prDeltaLbs,
    totalVolumeLbs: Math.round(sessionVolume(today)),
    exerciseCount: Array.isArray(today.exercises) ? today.exercises.length : 0,
    durationMin: today.duration != null && Number.isFinite(Number(today.duration)) ? Math.round(Number(today.duration)) : null,
    sessionsThisWeek,
    streakWeeks,
    isFirstEver: allPoints.length <= 1 && prior.length === 0,
  };
}

// Consecutive weeks (ending at todayWeek) with ≥3 sessions each.
function countStreakWeeks(sessions, todayWeek) {
  const perWeek = new Map();
  for (const s of sessions) {
    const k = isoWeekKey(s.date);
    if (k) perWeek.set(k, (perWeek.get(k) || 0) + 1);
  }
  // Count consecutive weeks with >=3 sessions. The current week is in-progress, so if it hasn't
  // hit 3 yet, start from LAST week rather than collapsing a real streak of completed weeks to 0.
  let streak = 0;
  let cursor = (perWeek.get(todayWeek) || 0) >= 3 ? todayWeek : prevIsoWeek(todayWeek);
  while ((perWeek.get(cursor) || 0) >= 3) {
    streak += 1;
    cursor = prevIsoWeek(cursor);
  }
  return streak;
}

function prevIsoWeek(weekKey) {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekKey || '');
  if (!m) return null;
  let year = Number(m[1]);
  let week = Number(m[2]) - 1;
  if (week < 1) { year -= 1; week = isoWeeksInYear(year); }
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function isoWeeksInYear(year) {
  const p = (y) => (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400)) % 7;
  return p(year) === 4 || p(year - 1) === 3 ? 53 : 52;
}

/**
 * DB loader — thin wrapper around the pure builder. Additive, read-only.
 * `models` is the resolved model registry (getAllModels()); passed in so this stays testable.
 * Returns the same shape as buildProofSeriesFromSessions, or null.
 */
export async function buildProofSeries({ targetUserId, todaySessionId, models, windowSize = PROOF_WINDOW }) {
  const { WorkoutSession, WorkoutExercise, Set, Exercise } = models || {};
  if (!WorkoutSession) return null;
  try {
  const rows = await WorkoutSession.findAll({
    where: { userId: targetUserId },
    // Order eager-loaded exercises by orderInWorkout so tie-breaks/first-match are deterministic,
    // not dependent on raw DB row order.
    order: [['date', 'DESC'], [{ model: WorkoutExercise, as: 'exercises' }, 'orderInWorkout', 'ASC']],
    // NOTE: PR is all-time over THESE sessions but capped at the newest 60. A client whose true
    // all-time best on the picked exercise is older than 60 sessions could see a false PR. OK for v1.
    limit: 60,
    include: [{
      model: WorkoutExercise, as: 'exercises',
      include: [
        { model: Exercise, as: 'exercise', attributes: ['id', 'name'] },
        { model: Set, as: 'sets', attributes: ['setType', 'weightUsed', 'repsCompleted'] },
      ],
    }],
  });
  const sessions = rows.map((r) => ({
    id: r.id,
    date: r.date,
    duration: r.duration,
    exercises: (r.exercises || []).map((ex) => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exercise?.name || 'Exercise',
      sets: (ex.sets || []).map((s) => ({ setType: s.setType, weightUsed: s.weightUsed, repsCompleted: s.repsCompleted })),
    })),
  }));
  return buildProofSeriesFromSessions(sessions, { todaySessionId, windowSize });
  } catch (err) {
    // Loader failure (e.g. limit + ordered-hasMany sub-query surprise) → degrade to null, never crash the save.
    // Observable when a logger is injected via models (Slice-2 wiring) so a future drift here isn't silent.
    models?.logger?.warn?.('[workoutProofSeries] series load failed; degrading to null', err?.message);
    return null;
  }
}
