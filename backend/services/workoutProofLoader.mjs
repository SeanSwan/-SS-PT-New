/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  workoutProofLoader.mjs — DUAL-SOURCE proof reader (Kimi Slice-2 REVISE)       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  A WorkoutSession's per-set data lives in EITHER model depending on save path:  ║
 * ║   • logs (WorkoutLog): exerciseName/weight/reps/setNumber — the CLIENT FORM     ║
 * ║     logger (POST /api/workout-forms). The dominant HUMAN path.                  ║
 * ║   • exercises→sets (WorkoutExercise→Set): Exercise.name/weightUsed/repsCompleted║
 * ║     — the MCP/structured/plan path (POST /api/workout/sessions).                ║
 * ║  Slice-1 read only exercises→sets → BLANK chart for client-logged workouts.     ║
 * ║  This reads BOTH and unifies to one per-set shape keyed by NORMALIZED name.      ║
 * ║  PRECEDENCE: within (session, nameKey) prefer `log` rows if any exist — Set rows ║
 * ║  can be plan/template placeholders; rendering planned values as performed PRs is ║
 * ║  the one unforgivable failure on a screen called "proof".                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
import { normalizeExerciseName } from '../utils/exerciseIdentity.mjs';

export const EPLEY_MAX_REPS = 36;   // Epley validity cap
export const PROOF_LOAD_LIMIT = 60; // window for the chart + a RECENT best — NOT all-time (see proof-service note)

// Free-text logger ⇒ drop junk rows so they never poison a chart.
const isValidSet = (w, r) => {
  const weight = Number(w);
  const reps = Number(r);
  return Number.isFinite(weight) && Number.isFinite(reps) && weight > 0 && reps > 0 && reps <= EPLEY_MAX_REPS;
};

const toRows = (arr, source) => {
  const rows = [];
  for (const x of arr || []) {
    if (!isValidSet(x.weight, x.reps)) continue;
    const nameKey = normalizeExerciseName(x.exerciseName);
    if (!nameKey) continue;
    rows.push({
      nameKey,
      displayName: String(x.exerciseName ?? '').trim() || 'Exercise',
      weight: Number(x.weight),
      reps: Number(x.reps),
      setNumber: Number.isFinite(Number(x.setNumber)) ? Number(x.setNumber) : null,
      source,
    });
  }
  return rows;
};

// Keep max weight per setNumber (volume is duplicate-sensitive); null setNumbers can't dedupe → keep all.
const dedupeBySetNumber = (rows) => {
  const byNum = new Map();
  const noNum = [];
  for (const r of rows) {
    if (r.setNumber == null) { noNum.push(r); continue; }
    const cur = byNum.get(r.setNumber);
    if (!cur || r.weight > cur.weight) byNum.set(r.setNumber, r);
  }
  return [...byNum.values(), ...noNum];
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
    const winner = logsForKey.length ? logsForKey : setsForKey; // logs-win precedence
    sets.push(...dedupeBySetNumber(winner));
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
      where: { userId: targetUserId },
      order: [['date', 'DESC']],
      limit,
      include: [
        { model: WorkoutLog, as: 'logs', required: false, attributes: ['exerciseName', 'weight', 'reps', 'setNumber'] },
        {
          model: WorkoutExercise, as: 'exercises', required: false,
          include: [
            { model: Exercise, as: 'exercise', attributes: ['name'] },
            { model: Set, as: 'sets', attributes: ['weightUsed', 'repsCompleted', 'setNumber'] },
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
    models?.logger?.warn?.('[workoutProofLoader] dual-source load failed; degrading to empty', err?.message);
    return [];
  }
}
