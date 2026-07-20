/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  workoutProofLoader.mjs — DUAL-SOURCE proof reader (Kimi Slice-2 REVISE)       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  A WorkoutSession's per-set data lives in EITHER model depending on save path:  ║
 * ║   • logs (WorkoutLog): exerciseName/weight/reps/setNumber — the CLIENT FORM     ║
 * ║     logger (POST /api/workout-forms). The dominant HUMAN path.                  ║
 * ║   • exercises→sets (WorkoutExercise→Set): Exercise.name/weightUsed/repsCompleted║
 * ║     — the MCP/structured/plan path (structured Set writer).                     ║
 * ║  Slice-1 read only exercises→sets → BLANK chart for client-logged workouts.     ║
 * ║  This reads BOTH and unifies to one per-set shape keyed by NORMALIZED name.      ║
 * ║  PRECEDENCE: within (session, nameKey) prefer `log` rows if any exist — Set rows ║
 * ║  can be plan/template placeholders; rendering planned values as performed PRs is ║
 * ║  the one unforgivable failure on a screen called "proof".                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
import { Op } from 'sequelize';
import { normalizeExerciseName } from '../utils/exerciseIdentity.mjs';
import logger from '../utils/logger.mjs';

export const EPLEY_MAX_REPS = 36;   // Epley validity cap
export const PROOF_LOAD_LIMIT = 60; // window for the chart + a RECENT best — NOT all-time (see proof-service note)

// Free-text logger ⇒ drop rows with no usable weight/reps so they never poison volume or the chart.
// The Epley rep cap (≤36) is deliberately NOT applied here: a high-rep set is REAL volume and must agree
// with the session's canonical totalWeight (which is uncapped). Epley-validity (the ≤36 cap) lives in
// estimateOneRepMax instead — so a high-rep set counts toward VOLUME/exerciseCount but yields no e1RM
// chart point. (EPLEY_MAX_REPS stays exported for that chart-side guard.)
// Weight coercion contract: ONLY null/undefined mean "bodyweight" (0). Empty/whitespace strings,
// booleans, and other junk coerce to NaN → dropped — junk must never inflate exerciseCount by
// masquerading as a bodyweight set. (Unreachable from the DB caller — FLOAT columns — but these
// helpers are exported via unifyRow/toUnifiedSessions, so the contract is enforced, not assumed.)
const toWeight = (w) => {
  if (w == null) return 0;
  if (typeof w === 'number') return w;
  if (typeof w === 'string' && w.trim() !== '') return Number(w);
  return NaN;
};

const isValidSet = (weight, reps, source) => {
  // reps > 0 = real work happened. The Epley rep cap (≤36) is deliberately NOT applied here — a
  // high-rep set is REAL volume and must agree with the session's canonical totalWeight; Epley
  // validity lives in estimateOneRepMax (chart-side only).
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || reps <= 0) return false;
  // LOG rows: bodyweight (weight 0, ~24% of prod sets) is real human-logged work — keep, or the proof
  // screen under-reports ("2 EXERCISES" for a Bench+Pull-ups+Squats session).
  // SET rows: require performed LOAD (weight > 0). A structured Set row with null weightUsed cannot be
  // distinguished from a planner placeholder whose repsCompleted was prefilled — fail toward never
  // fabricating a phantom "bodyweight exercise" on the proof screen from a placeholder.
  return source === 'log' ? weight >= 0 : weight > 0;
};

const toRows = (arr, source) => {
  const rows = [];
  for (const x of arr || []) {
    const weight = toWeight(x.weight);
    const reps = Number(x.reps);
    if (!isValidSet(weight, reps, source)) continue;
    const nameKey = normalizeExerciseName(x.exerciseName);
    if (!nameKey) continue;
    rows.push({
      nameKey,
      displayName: String(x.exerciseName ?? '').trim() || 'Exercise',
      weight,
      reps,
      setNumber: Number.isFinite(Number(x.setNumber)) ? Number(x.setNumber) : null,
      source,
    });
  }
  return rows;
};

/** Pure: raw dual-source row → one unified session { id, date, duration, sets:[unifiedSet] }. */
export function unifyRow(row) {
  const logRows = toRows(row.logRows, 'log');
  const setRows = toRows(row.setRows, 'set');
  const keys = new Set([...logRows, ...setRows].map((r) => r.nameKey));
  const sets = [];
  for (const key of keys) {
    const logsForKey = logRows.filter((r) => r.nameKey === key);
    const setsForKey = setRows.filter((r) => r.nameKey === key);
    // Precedence (chartable-aware, one source per key — never mixed, so no cross-source double-count):
    //  • logs win when they carry any CHARTABLE (weighted, Epley-valid) row — a human log of load is the
    //    strongest truth, and a planner placeholder never survives the validity filter (no repsCompleted).
    //  • but a bodyweight-ONLY log scribble must NOT suppress same-key WEIGHTED Set rows: surviving 'set'
    //    rows always claim performed load (repsCompleted>0 AND weightUsed>0). Without this, a stray
    //    bodyweight log note would erase a prior weighted e1RM point and fabricate "A new best" —
    //    executed-and-proven failure mode from the go-live hostile review.
    // Push the winning source's rows AS-IS — no setNumber dedupe: the form numbers sets PER exercise-block,
    // so the same lift logged as two blocks legitimately reuses setNumber across REAL sets; deduping made
    // totalVolumeLbs disagree with the session's canonical totalWeight.
    let winner;
    if (logsForKey.length === 0) winner = setsForKey;
    else if (setsForKey.length === 0) winner = logsForKey;
    else {
      const logsChartable = logsForKey.some((r) => r.weight > 0 && r.reps <= EPLEY_MAX_REPS);
      winner = logsChartable ? logsForKey : setsForKey;
    }
    sets.push(...winner);
  }
  return { id: row.id, date: row.date, duration: row.duration, sets };
}

export const toUnifiedSessions = (rawRows) => (rawRows || []).map(unifyRow);

/** DB loader — read-only, dual-source, degrades to [] on any failure (never crashes the save). */
export async function loadUnifiedSessions({ targetUserId, models, limit = PROOF_LOAD_LIMIT }) {
  const { WorkoutSession, WorkoutExercise, Set, Exercise, WorkoutLog } = models || {};
  if (!WorkoutSession) return [];
  try {
    const rows = await WorkoutSession.findAll({
      where: {
        userId: targetUserId,
        // PERFORMED sessions only. Plan generation creates status:'planned' rows (dated NOW when no date
        // is passed), so without this filter a 12-session plan generated Monday makes Tuesday's one real
        // workout read "Session 13 this week", fires a phantom streak headline, and can suppress a genuine
        // PR via the isNewestSession gate. Real saves are 'completed' (form path reconciles planned →
        // completed); 'in_progress' is a live session being logged. skipped/cancelled never count.
        status: { [Op.in]: ['completed', 'in_progress'] },
      },
      order: [['date', 'DESC']],
      limit,
      include: [
        // separate:true → each hasMany runs as a batched follow-up query, NOT a JOIN. Without it,
        // eager-loading BOTH sibling hasMany collections (logs AND exercises→sets) on one parent
        // cartesian-explodes to logs×sets rows for any session that has both populated (planner
        // placeholders + form logs on the SAME findOrCreate'd session — the loader's mainline case):
        // ~logs×sets×limit rows over the wire on the save path. Hydration stayed correct (Sequelize
        // de-dups by PK) but the DB/wire cost did not. Splitting logs + the nested sets kills it.
        // Explicit ORDER on the separate child queries: without it row order is Postgres-plan-dependent,
        // making pickProofExercise's first-seen-index tie-break (and latestDisplayName casing) flip
        // between the save-path handoff and a later GET /:id/handoff re-entry on exact volume ties.
        { model: WorkoutLog, as: 'logs', required: false, separate: true, order: [['setNumber', 'ASC'], ['id', 'ASC']], attributes: ['exerciseName', 'weight', 'reps', 'setNumber'] },
        {
          model: WorkoutExercise, as: 'exercises', required: false,
          include: [
            { model: Exercise, as: 'exercise', attributes: ['name'] },
            { model: Set, as: 'sets', separate: true, order: [['setNumber', 'ASC'], ['id', 'ASC']], attributes: ['weightUsed', 'repsCompleted', 'setNumber'] },
          ],
        },
      ],
    });
    const rawRows = rows.map((r) => ({
      id: r.id,
      date: r.date,
      duration: r.duration,
      logRows: (r.logs || []).map((l) => ({ exerciseName: l.exerciseName, weight: l.weight, reps: l.reps, setNumber: l.setNumber })),
      setRows: (r.exercises || []).flatMap((ex) => (ex.sets || []).map((s) => ({
        exerciseName: ex.exercise?.name, weight: s.weightUsed, reps: s.repsCompleted, setNumber: s.setNumber,
      }))),
    }));
    return toUnifiedSessions(rawRows);
  } catch (err) {
    // Use the REAL app logger (not models?.logger — a model registry has no logger, so the old call was a
    // silent no-op). This is the ONLY signal that a prod association-alias drift has killed the feature:
    // the load fails -> [] -> proof null -> UI suppresses, invisibly. name+message only, never SQL/rows.
    // Object meta, NOT extra primitive args: this logger has no format.splat(), so trailing primitives
    // land under Symbol(splat) and are DROPPED by json()/simple() — the "which alias broke" payload
    // would never reach a transport. Object meta serializes.
    logger?.warn?.('[workoutProofLoader] dual-source load failed; degrading to empty', { name: err?.name, message: err?.message });
    return [];
  }
}
