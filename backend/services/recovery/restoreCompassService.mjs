/**
 * ============================================================================
 * FILE: restoreCompassService.mjs
 * PURPOSE: Compose the Restore (off-day recovery) ritual from REAL client data.
 * AUTHOR: Claude Fable 5 | CREATED: 2026-07-21
 * SPEC: docs/ai-workflow/AI-HANDOFF/RECOVERY-COMPASS-OFF-DAY-SPEC-2026-07-21.md
 * KIMI CO-DESIGN R1: AGREE-WITH-CHANGES — H1 predicate, H2 cold-start law,
 *   H4 empty-block suppression, H5 slot priority, H6 per-item XP all encoded.
 *
 * Deterministic — NO LLM anywhere in this path (Rule 8 zero-PII by design).
 * Every recommended item carries `why[]` provenance naming the real record
 * that triggered it; an item with no real-data trigger is NEVER emitted.
 * ============================================================================
 */
import { resolveClientTrainingDateContext } from '../clientTrainingDateService.mjs';
import { getAllModels } from '../../models/index.mjs';
import {
  fetchActivePlanContext, fetchSessionWindow, fetchRecentLoad, fetchMovementFlags,
  fetchActivePain, fetchGoalText, fetchRecoveryCandidates, parseMuscleList,
} from './restoreDataSources.mjs';

/** NASM compensation → corrective-category tags (domain truth, not guesses). */
export const COMPENSATION_TO_TAGS = {
  forward_head: 'upper_crossed_syndrome',
  rounded_shoulders: 'upper_crossed_syndrome',
  arms_fall_forward: 'upper_crossed_syndrome',
  shoulder_elevation: 'upper_crossed_syndrome',
  anterior_pelvic_tilt: 'lower_crossed_syndrome',
  low_back_arches: 'lower_crossed_syndrome',
  excessive_forward_lean: 'lower_crossed_syndrome',
  knee_valgus: 'pronation_distortion_syndrome',
  knees_cave_inward: 'pronation_distortion_syndrome',
  feet_turn_out: 'pronation_distortion_syndrome',
  feet_flatten: 'pronation_distortion_syndrome',
};

/**
 * CC-2 two-tier copy law (Kimi verdict 2026-07-22): clients NEVER see syndrome names —
 * diagnosis-flavored language is a liability and scary copy. Tags translate to plain body
 * areas for the client; the raw NASM vocabulary ships only in trainerDrivers for trainer UIs.
 */
const TAG_TO_CLIENT_AREA = {
  upper_crossed_syndrome: 'neck and shoulders',
  lower_crossed_syndrome: 'hips and lower back',
  pronation_distortion_syndrome: 'knees and feet',
};

export function clientFocusFrom(correctiveTags, painEntries) {
  const tags = [...new Set(correctiveTags || [])].filter((t) => TAG_TO_CLIENT_AREA[t]);
  const areas = tags.map((t) => TAG_TO_CLIENT_AREA[t]);
  const avoided = (painEntries || []).map((p) => p.bodyRegion).filter(Boolean);
  if (areas.length === 0 && avoided.length === 0) return { clientSummary: null, trainerDrivers: tags };
  const parts = [];
  if (areas.length > 0) parts.push(`focused on your ${areas.join(' and ')}`);
  if (avoided.length > 0) parts.push(`easing off your ${avoided.join(' and ')}`);
  return {
    clientSummary: `Built around how you move — ${parts.join(', ')}.`,
    trainerDrivers: tags,
  };
}

const FULL_PANEL_STATES = ['rest', 'active-recovery', 'unplanned'];
const BLOCK_LIMITS = { inhibit: 3, lengthen: 4, activate: 3, cardio: 2 };
const FAT_LOSS_PATTERN = /fat|lean|lose|weight.?loss|cut|slim|tone/i;

/** Day-state matrix (Kimi H5 slot-priority input). Pure, unit-tested. */
export function resolveDayState({ hasActivePlan, completedToday, plannedToday, cursorDayType }) {
  if (completedToday) return 'already-trained';
  if (plannedToday) return 'training';
  if (!hasActivePlan) return 'no-plan';
  const dayType = String(cursorDayType || '').toLowerCase();
  if (dayType === 'rest') return 'rest';
  if (dayType === 'active_recovery' || dayType === 'active-recovery') return 'active-recovery';
  return 'unplanned';
}

export const modeForDayState = (dayState) => {
  if (dayState === 'no-plan') return 'cold';
  return FULL_PANEL_STATES.includes(dayState) ? 'full' : 'strip';
};

/** Corrective tags derived from the client's real movement screen. */
export const correctiveTagsFrom = (compensations) => {
  const tags = new Set();
  for (const comp of compensations || []) {
    if (COMPENSATION_TO_TAGS[comp]) tags.add(COMPENSATION_TO_TAGS[comp]);
    else if (/crossed|distortion/.test(comp)) tags.add(comp);
  }
  return [...tags];
};

const exerciseTags = (exercise) => {
  const raw = exercise.nasmCorrectiveCategory;
  if (Array.isArray(raw)) return raw.map((t) => String(t).toLowerCase());
  return parseMuscleList(raw);
};

const overlaps = (a, b) => a.some((item) => b.includes(item));

/**
 * Conflict predicate (Kimi H1 — deterministic and testable):
 * an exercise is EXCLUDED from activate/cardio blocks when its primary
 * muscles overlap the next planned session's muscles AND it is loading work
 * (compound/isolation/calisthenics/core, or a CES activate step).
 * Inhibit/lengthen (SMR + stretching) are never excluded — they aid recovery.
 */
export function conflictsWithNextSession(exercise, nextUpMuscles, blockKey) {
  if (blockKey === 'inhibit' || blockKey === 'lengthen') return false;
  if (!nextUpMuscles.length) return false;
  const muscles = parseMuscleList(exercise.primaryMuscles);
  if (!overlaps(muscles, nextUpMuscles)) return false;
  const loading = ['compound', 'isolation', 'calisthenics', 'core'].includes(exercise.exerciseType)
    || exercise.cesProtocolStep === 'activate';
  return loading;
}

/** Pain filter: never recommend into an actively painful region. */
export function blockedByPain(exercise, painEntries) {
  if (!painEntries.length) return false;
  const muscles = parseMuscleList(exercise.primaryMuscles);
  const haystack = [...muscles, String(exercise.bodyPartCategory || '').toLowerCase(),
    String(exercise.name || '').toLowerCase()].join(' ');
  return painEntries.some(({ bodyRegion }) => bodyRegion && haystack.includes(bodyRegion));
}

const doseFor = (exercise) => {
  if (exercise.recommendedDuration) return `${exercise.recommendedDuration}s`;
  if (exercise.recommendedSets && exercise.recommendedReps) {
    return `${exercise.recommendedSets}×${exercise.recommendedReps}`;
  }
  return exercise.cesProtocolStep === 'inhibit' ? '60–90s slow' : '2×45s';
};

const toItem = (exercise, why, sources) => ({
  exerciseId: exercise.id,
  name: exercise.name,
  dose: doseFor(exercise),
  xp: exercise.experiencePointsEarned ?? 10,
  thumbnailUrl: exercise.thumbnailUrl || exercise.imageUrl || null,
  videoUrl: exercise.videoUrl || null,
  why,
  dataSources: sources,
});

const describeMuscles = (muscles) => muscles.slice(0, 3).join(' + ');

/**
 * Pure block composer. All inputs are REAL-data digests from restoreDataSources.
 * Blocks with zero qualifying items are suppressed (Kimi H4) — never emitted empty.
 */
export function composeBlocks({ candidates, recentLoad, correctiveTags, painEntries, nextUpMuscles, nextUpFocus, goalText, mode }) {
  const loadMuscles = recentLoad.map((entry) => entry.muscle);
  const conflictNote = nextUpFocus ? `kept light — ${nextUpFocus} is next on your plan` : null;
  const blocks = [];
  // One exercise appears in ONE block only — first match in CES order wins
  // (Swan card standard: never duplicate the same fact across a surface).
  const used = new Set();

  const pick = (blockKey, filter, buildWhy, provenance, limit) => {
    const items = [];
    for (const exercise of candidates) {
      if (items.length >= limit) break;
      if (used.has(exercise.id)) continue;
      if (blockedByPain(exercise, painEntries)) continue;
      if (conflictsWithNextSession(exercise, nextUpMuscles, blockKey)) continue;
      const trigger = filter(exercise);
      if (!trigger) continue;
      used.add(exercise.id);
      items.push(toItem(exercise, buildWhy(trigger), trigger.sources));
    }
    if (items.length > 0) {
      blocks.push({ key: blockKey, provenance, conflictNote: blockKey === 'activate' ? conflictNote : null, items });
    }
  };

  // INHIBIT — foam roll / SMR for what was actually trained (Sean: "myofascial release, especially")
  pick('inhibit',
    (ex) => {
      if (ex.cesProtocolStep !== 'inhibit') return null;
      const hit = parseMuscleList(ex.primaryMuscles).filter((m) => loadMuscles.includes(m));
      if (hit.length) return { hit, sources: ['session_load_72h'] };
      const tagHit = exerciseTags(ex).filter((t) => correctiveTags.includes(t));
      return tagHit.length ? { hit: tagHit, sources: ['movement_screen'] } : null;
    },
    (t) => [`because you trained ${describeMuscles(t.hit)} in the last 3 days`],
    loadMuscles.length
      ? `because you trained ${describeMuscles(loadMuscles)} recently`
      : 'from your movement screen',
    BLOCK_LIMITS.inhibit);

  // LENGTHEN — stretching/flexibility for the same real targets
  pick('lengthen',
    (ex) => {
      if (!(ex.cesProtocolStep === 'lengthen' || ex.exerciseType === 'flexibility')) return null;
      const hit = parseMuscleList(ex.primaryMuscles).filter((m) => loadMuscles.includes(m));
      if (hit.length) return { hit, sources: ['session_load_72h'] };
      const tagHit = exerciseTags(ex).filter((t) => correctiveTags.includes(t));
      return tagHit.length ? { hit: tagHit, sources: ['movement_screen'] } : null;
    },
    (t) => (t.sources[0] === 'session_load_72h'
      ? [`stretch what you loaded — ${describeMuscles(t.hit)}`]
      : [`your movement screen flagged ${describeMuscles(t.hit).replace(/_/g, ' ')}`]),
    'stretch what you loaded; lengthen what your screen flagged',
    BLOCK_LIMITS.lengthen);

  if (mode === 'full') {
    // ACTIVATE — corrective work ONLY when the movement screen produced real flags
    if (correctiveTags.length) {
      pick('activate',
        (ex) => {
          if (ex.cesProtocolStep !== 'activate') return null;
          const tagHit = exerciseTags(ex).filter((t) => correctiveTags.includes(t));
          return tagHit.length ? { hit: tagHit, sources: ['movement_screen'] } : null;
        },
        (t) => [`because your movement screen flagged ${describeMuscles(t.hit).replace(/_/g, ' ')}`],
        'pull your body back — corrective work from your screen',
        BLOCK_LIMITS.activate);
    }

    // CARDIO — only for a real, stated fat-loss-class goal (Fable override of Kimi K6,
    // reason on record: Sean named fat-burn core intent; empty-suppression covers drift)
    if (goalText && FAT_LOSS_PATTERN.test(goalText)) {
      pick('cardio',
        (ex) => (String(ex.bodyPartCategory || '').toLowerCase() === 'cardio'
          ? { hit: ['cardio'], sources: ['stated_goal'] } : null),
        () => [`zone work for your goal — kept easy on purpose`],
        `for the goal you told your coach — kept light`,
        BLOCK_LIMITS.cardio);
    }
  }

  return blocks;
}

/** Muscles targeted by the NEXT planned (cursor) session — via real Exercise rows. */
export async function resolveNextUpMuscles(cursorSession, candidatesById, matchByName) {
  if (!cursorSession?.exercises?.length) return { muscles: [], focus: cursorSession?.weekFocus || null };
  const names = cursorSession.exercises
    .map((entry) => (typeof entry === 'string' ? entry : entry?.name || entry?.exerciseName))
    .filter(Boolean);
  const muscles = new Set();
  for (const name of names) {
    const match = await matchByName(name);
    for (const muscle of parseMuscleList(match?.primaryMuscles)) muscles.add(muscle);
  }
  return {
    muscles: [...muscles],
    focus: cursorSession.weekFocus || cursorSession.dayLabel || null,
  };
}

/** Orchestrator — fetch real data, resolve state, compose. */
export async function composeRestoreToday({ userId, storedTimeZone, storedTimeZoneConfigured, headerTimeZone, actorId }) {
  const dateContext = resolveClientTrainingDateContext({
    storedTimeZone, storedTimeZoneConfigured, headerTimeZone, actorId, targetClientId: userId,
  });
  const timeZone = dateContext.timeZone;

  const [{ plan, cursorSession }, sessionWindow, movement, painEntries, goalText] = await Promise.all([
    fetchActivePlanContext(userId),
    fetchSessionWindow(userId, timeZone),
    fetchMovementFlags(userId),
    fetchActivePain(userId),
    fetchGoalText(userId),
  ]);

  const dayState = resolveDayState({
    hasActivePlan: Boolean(plan),
    completedToday: sessionWindow.completedToday.length > 0,
    plannedToday: sessionWindow.plannedToday.length > 0,
    cursorDayType: cursorSession?.session?.dayType,
  });
  const mode = modeForDayState(dayState);
  const base = { dayState, mode, localDate: dateContext.localDate, generatedAt: new Date().toISOString() };

  // Kimi H2: active pain + no movement screen = fail closed to coach referral.
  if (painEntries.length > 0 && !movement.hasProfile) {
    return { ...base, mode: 'cold', coldStart: { reason: 'pain-needs-coach', showFoundations: false }, blocks: [] };
  }

  if (mode === 'cold') {
    return {
      ...base,
      coldStart: { reason: 'no-plan', showFoundations: painEntries.length === 0 },
      blocks: [],
    };
  }

  const recentLoad = await fetchRecentLoad(sessionWindow.recentCompleted);
  const candidates = await fetchRecoveryCandidates();
  const { Exercise } = getAllModels();
  const matchByName = (name) => Exercise.findOne({ where: { name }, attributes: ['id', 'primaryMuscles'] });
  const nextUp = await resolveNextUpMuscles(cursorSession, null, matchByName);

  const blocks = composeBlocks({
    candidates,
    recentLoad,
    correctiveTags: correctiveTagsFrom(movement.compensations),
    painEntries,
    nextUpMuscles: nextUp.muscles,
    nextUpFocus: nextUp.focus,
    goalText,
    mode,
  });

  // Kimi H4: real data but nothing composed → honest curating state, not a husk.
  if (blocks.length === 0) {
    return { ...base, mode: 'cold', coldStart: { reason: 'library-curating', showFoundations: false }, blocks: [] };
  }

  return {
    ...base,
    blocks,
    nextUpFocus: nextUp.focus,
    // CC-2: client-safe "why" (plain body areas + pain avoidance); NASM names only in trainerDrivers.
    focus: clientFocusFrom(correctiveTagsFrom(movement.compensations), painEntries),
  };
}
