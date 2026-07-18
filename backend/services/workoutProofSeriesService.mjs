/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  workoutProofSeriesService.mjs — Post-Save Handoff · PROOF (Slice-2 dual-source)║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Builds the est-1RM proof series from REAL logged sessions. Consumes the        ║
 * ║  UNIFIED per-set shape from workoutProofLoader (both WorkoutLog `logs` AND       ║
 * ║  WorkoutExercise→Set `exercises`), keyed on NORMALIZED exercise name (nameKey)   ║
 * ║  — because WorkoutLog is free-text with no exerciseId. Identity/precedence/guards║
 * ║  live in the loader; this stays pure math (Epley, top set, PR, ISO-week streak). ║
 * ║  DATA-TRUTH: never fabricates a point; empty history → null, never mock.         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
import { loadUnifiedSessions, PROOF_LOAD_LIMIT } from './workoutProofLoader.mjs';

export const EPLEY_REP_DIVISOR = 30;
export const PROOF_WINDOW = 12;

/** Estimated 1-rep max for one set (Epley). null for junk (defensive; loader already guards). */
export function estimateOneRepMax(weight, reps) {
  const w = Number(weight);
  const r = Number(reps);
  if (!Number.isFinite(w) || !Number.isFinite(r) || w <= 0 || r <= 0) return null;
  return Math.round(w * (1 + r / EPLEY_REP_DIVISOR));
}

/** Best (max) estimated 1RM over a set of unified sets. Warmups sort out naturally (lower e1RM). */
export function topSetE1rm(sets) {
  let best = null;
  for (const s of sets || []) {
    const e = estimateOneRepMax(s.weight, s.reps);
    if (e !== null && (best === null || e > best)) best = e;
  }
  return best;
}

export function exerciseVolume(sets) {
  return (sets || []).reduce((sum, s) => {
    const w = Number(s?.weight);
    const r = Number(s?.reps);
    return Number.isFinite(w) && Number.isFinite(r) && w > 0 && r > 0 ? sum + w * r : sum;
  }, 0);
}

export const sessionVolume = (session) => exerciseVolume(session?.sets);

const setsForKey = (session, nameKey) => (session?.sets || []).filter((s) => s.nameKey === nameKey);

// ISO-8601 week key so cadence/streak are calendar-correct.
function isoWeekKey(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc - yearStart) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function pickProofExercise(todaySession, priorSessions) {
  const todaySets = todaySession?.sets || [];
  if (todaySets.length === 0) return null;
  const priorCount = new Map();
  for (const s of priorSessions) {
    const seen = new Set((s.sets || []).map((x) => x.nameKey));
    for (const k of seen) priorCount.set(k, (priorCount.get(k) || 0) + 1);
  }
  const agg = new Map();
  todaySets.forEach((set, idx) => {
    const cur = agg.get(set.nameKey);
    if (cur) cur.vol += exerciseVolume([set]);
    else agg.set(set.nameKey, { nameKey: set.nameKey, idx, vol: exerciseVolume([set]), priors: priorCount.get(set.nameKey) || 0 });
  });
  const ranked = [...agg.values()].sort((a, b) => b.vol - a.vol || a.idx - b.idx);
  const chosen = ranked.find((r) => r.priors >= 3) || ranked[0];
  return chosen.nameKey;
}

// Most-recent raw display name for a nameKey (names can vary in casing/spacing across sessions).
function latestDisplayName(sessionsNewestFirst, nameKey) {
  for (const s of sessionsNewestFirst) {
    const hit = (s.sets || []).find((x) => x.nameKey === nameKey);
    if (hit) return hit.displayName || 'Exercise';
  }
  return 'Exercise';
}

/**
 * Pure builder over UNIFIED sessions:
 *   [{ id, date, duration, sets:[{ nameKey, displayName, weight, reps, setNumber, source }] }]
 */
export function buildProofSeriesFromUnifiedSessions(sessions, { todaySessionId, windowSize = PROOF_WINDOW, now } = {}) {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;
  const sorted = [...sessions]
    .filter((s) => s && s.id != null && s.date != null)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  if (sorted.length === 0) return null;

  // Honesty guard: if a specific session was requested but it is OUTSIDE the loaded window (≤60 recent
  // sessions — e.g. re-entry via GET /:id/handoff on an old session, or a BACKDATED save when newer
  // sessions already exist), do NOT silently substitute the latest session's proof under the requested
  // id. Misattributed proof — showing session Y's PR/gold-point as session X's — is the one unforgivable
  // failure on a screen named "proof". Return null → the handoff is honestly suppressed for that session.
  // Only fall back to "latest" when no specific session was requested at all (todaySessionId nullish).
  const today = todaySessionId != null
    ? sorted.find((s) => s.id === todaySessionId)
    : sorted[sorted.length - 1];
  if (!today) return null;
  const prior = sorted.filter((s) => s.id !== today.id && new Date(s.date) <= new Date(today.date));

  const nameKey = pickProofExercise(today, prior);
  if (!nameKey) return null;
  const exerciseName = latestDisplayName([...sorted].reverse(), nameKey);

  const upToToday = sorted.filter((s) => new Date(s.date) <= new Date(today.date));
  const allPoints = [];
  for (const s of upToToday) {
    const e1rm = topSetE1rm(setsForKey(s, nameKey));
    if (e1rm === null) continue;
    allPoints.push({ sessionId: s.id, dateISO: new Date(s.date).toISOString(), e1rm, isToday: s.id === today.id });
  }
  const points = allPoints.slice(-windowSize);
  const todayPoint = allPoints.find((p) => p.isToday) || null; // honest null; never a prior value
  const todayE1rm = todayPoint ? todayPoint.e1rm : null;

  // DATA-TRUTH NOTE: pr / isFirstEver are computed over the LOADED window (PROOF_LOAD_LIMIT sessions) —
  // a RECENT best, not guaranteed all-time for very tenured users whose true best predates the window.
  // UI copy therefore says "a new best" (not "all-time PR"); the eyebrow states "LAST N SESSIONS" for
  // honest context. True all-time = a follow-up exercise-scoped MAX query (out of Slice-2 scope).
  const priorE1rms = allPoints.filter((p) => !p.isToday).map((p) => p.e1rm);
  const priorBest = priorE1rms.length ? Math.max(...priorE1rms) : null;
  const pr = todayE1rm !== null && priorBest !== null && todayE1rm > priorBest;
  const prDeltaLbs = pr ? todayE1rm - priorBest : 0;

  const todayWeek = isoWeekKey(now || today.date);
  const sessionsThisWeek = upToToday.filter((s) => isoWeekKey(s.date) === todayWeek).length;

  return {
    nameKey,
    exerciseName,
    points,
    todayE1rm,
    pr,
    prDeltaLbs,
    totalVolumeLbs: Math.round(sessionVolume(today)),
    exerciseCount: new Set((today.sets || []).map((s) => s.nameKey)).size,
    durationMin: today.duration != null && Number.isFinite(Number(today.duration)) ? Math.round(Number(today.duration)) : null,
    sessionsThisWeek,
    streakWeeks: countStreakWeeks(upToToday, todayWeek),
    // "first session with >=1 proof-eligible set" (either source) — guards the 'first' headline.
    isFirstEver: allPoints.length <= 1 && prior.every((s) => topSetE1rm(setsForKey(s, nameKey)) === null),
  };
}

function countStreakWeeks(sessions, todayWeek) {
  const perWeek = new Map();
  for (const s of sessions) {
    const k = isoWeekKey(s.date);
    if (k) perWeek.set(k, (perWeek.get(k) || 0) + 1);
  }
  let streak = 0;
  let cursor = (perWeek.get(todayWeek) || 0) >= 3 ? todayWeek : prevIsoWeek(todayWeek);
  while ((perWeek.get(cursor) || 0) >= 3) { streak += 1; cursor = prevIsoWeek(cursor); }
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

/** DB entry point: dual-source load → pure build. Read-only; null on no usable data. */
export async function buildProofSeries({ targetUserId, todaySessionId, models, windowSize = PROOF_WINDOW }) {
  const sessions = await loadUnifiedSessions({ targetUserId, models, limit: PROOF_LOAD_LIMIT });
  return buildProofSeriesFromUnifiedSessions(sessions, { todaySessionId, windowSize });
}
