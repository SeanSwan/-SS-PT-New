/**
 * muscleReadinessService — CC-1 (Mobbin plan 1.3): per-muscle-group readiness from REAL logged volume.
 *
 * Pure scoring layer over the SAME digest the Restore compass consumes (restoreDataSources
 * fetchRecentLoad → { muscle, count, lastTrainedLocalDate }). Deterministic, no LLM, no schema changes.
 * Honesty contract: this is a TRAINING-LOG ESTIMATE (`source: 'training-log-estimate'`), not a
 * physiological measurement — the UI must carry that label. Larger groups get longer recovery windows;
 * heavier-than-usual recent volume slows the curve, lighter speeds it. Client view is read-only;
 * training decisions stay with the trainer (indispensability law).
 */

import { fetchSessionWindow, fetchRecentLoad } from './restoreDataSources.mjs';
import { formatDateOnlyInTimeZone, resolveClientTrainingDateContext } from '../clientTrainingDateService.mjs';

/** Canonical muscle groups with recovery windows (days to ~full readiness at normal volume). */
export const RECOVERY_WINDOW_DAYS = Object.freeze({
  quads: 2.5,
  hamstrings: 2.5,
  glutes: 2.5,
  back: 2.5,
  chest: 2.0,
  shoulders: 2.0,
  core: 1.5,
  biceps: 1.5,
  triceps: 1.5,
  calves: 1.5,
  forearms: 1.0,
  neck: 1.0,
});

export const CANONICAL_GROUPS = Object.freeze(Object.keys(RECOVERY_WINDOW_DAYS));

/** Freeform primaryMuscles → canonical group. Unknown → null (dropped, never guessed). */
const GROUP_ALIASES = {
  quads: 'quads', quadriceps: 'quads', 'quadriceps femoris': 'quads',
  hamstrings: 'hamstrings', hamstring: 'hamstrings',
  glutes: 'glutes', gluteus: 'glutes', 'gluteus maximus': 'glutes', 'glute medius': 'glutes',
  back: 'back', lats: 'back', 'latissimus dorsi': 'back', 'upper back': 'back', 'lower back': 'back',
  rhomboids: 'back', traps: 'back', trapezius: 'back', erectors: 'back', 'erector spinae': 'back',
  chest: 'chest', pectorals: 'chest', pecs: 'chest', 'pectoralis major': 'chest',
  shoulders: 'shoulders', deltoids: 'shoulders', delts: 'shoulders', 'rear delts': 'shoulders',
  'rotator cuff': 'shoulders',
  core: 'core', abs: 'core', abdominals: 'core', obliques: 'core', 'transverse abdominis': 'core',
  biceps: 'biceps', triceps: 'triceps',
  calves: 'calves', soleus: 'calves', gastrocnemius: 'calves',
  forearms: 'forearms', grip: 'forearms',
  neck: 'neck', 'cervical spine': 'neck',
};

export function canonicalGroup(raw) {
  if (!raw || typeof raw !== 'string') return null;
  return GROUP_ALIASES[raw.trim().toLowerCase()] || null;
}

const STATE_THRESHOLDS = { ready: 90, caution: 50 };

/**
 * Pure per-group score. daysSince null = never trained in the window → fully ready.
 * relativeVolume: this group's recent set count relative to the client's median group count
 * (1 = typical). Clamped 0.75–1.25 so an outlier session bends the curve, never breaks it.
 */
export function scoreReadiness({ group, daysSince, relativeVolume }) {
  const windowDays = RECOVERY_WINDOW_DAYS[group] || 2.0;
  if (daysSince == null) return { group, pct: 100, state: 'ready' };
  const volumeAdj = Math.min(1.25, Math.max(0.75, relativeVolume || 1));
  const effectiveWindow = windowDays * volumeAdj;
  const pct = Math.max(0, Math.min(100, Math.round((daysSince / effectiveWindow) * 100)));
  const state = pct >= STATE_THRESHOLDS.ready ? 'ready' : pct >= STATE_THRESHOLDS.caution ? 'caution' : 'loading';
  return { group, pct, state };
}

const daysBetween = (fromIso, toIso) => {
  if (!fromIso || !toIso) return null;
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return Math.max(0, (to - from) / 86400000);
};

/**
 * Board assembler: recentLoad rows (freeform muscles) → full canonical board.
 * Every canonical group is always present (untrained → READY 100) so the grid never has holes.
 */
export function buildReadinessBoard({ recentLoad, todayLocalDate }) {
  const perGroup = new Map();
  for (const row of recentLoad || []) {
    const group = canonicalGroup(row.muscle);
    if (!group) continue;
    const entry = perGroup.get(group) || { count: 0, lastTrainedLocalDate: null };
    entry.count += row.count || 0;
    if (!entry.lastTrainedLocalDate || (row.lastTrainedLocalDate || '') > entry.lastTrainedLocalDate) {
      entry.lastTrainedLocalDate = row.lastTrainedLocalDate || null;
    }
    perGroup.set(group, entry);
  }

  const counts = [...perGroup.values()].map((e) => e.count).sort((a, b) => a - b);
  const median = counts.length ? counts[Math.floor(counts.length / 2)] || 1 : 1;

  const groups = CANONICAL_GROUPS.map((group) => {
    const entry = perGroup.get(group);
    if (!entry) return { group, pct: 100, state: 'ready', lastTrainedLocalDate: null };
    const daysSince = daysBetween(entry.lastTrainedLocalDate, todayLocalDate);
    const scored = scoreReadiness({ group, daysSince, relativeVolume: median ? entry.count / median : 1 });
    return { ...scored, lastTrainedLocalDate: entry.lastTrainedLocalDate };
  });

  return { source: 'training-log-estimate', todayLocalDate, groups };
}

/** Orchestrator — same real-data pipeline the Restore compass rides (Rule 18: shared digests). */
export async function composeReadinessBoard({ userId, storedTimeZone, storedTimeZoneConfigured, headerTimeZone, actorId }) {
  const dateContext = resolveClientTrainingDateContext({
    storedTimeZone, storedTimeZoneConfigured, headerTimeZone, actorId, targetClientId: userId,
  });
  const timeZone = dateContext.timeZone;
  const sessionWindow = await fetchSessionWindow(userId, timeZone);
  const recentLoad = await fetchRecentLoad(sessionWindow.recentCompleted);
  const todayLocalDate = formatDateOnlyInTimeZone(new Date(), timeZone);
  return buildReadinessBoard({ recentLoad, todayLocalDate });
}
