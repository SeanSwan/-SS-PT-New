/**
 * ============================================================================
 * FILE: classStyleModifiers.mjs
 * PURPOSE: Class style modifiers (pyramid, superset, alternative boards) + stretch generator
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Applies class style modifications (pyramid weight drops,
 * superset grouping) to generated exercises, generates Board 2/3 alternatives,
 * and produces warm-up stretch sequences.
 * HOW IT FITS: bootcampGenerator → classStyleModifiers (steps 9-11 in pipeline)
 */

// ── Two-Board System ──────────────────────────────────────────────────
// Board 1 = main intensity. Board 2 = joint-friendly alternatives.
// Board 3 = low-impact swaps for lower-pounding movement paths.

const JOINT_MOD_FIELDS = [
  'kneeMod',
  'ankleMod',
  'backMod',
  'shoulderMod',
  'wristMod',
  'elbowMod',
  'footMod',
  'hipMod',
];

function cleanAlternativeName(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'n/a') return null;
  return trimmed;
}

function firstAvailableAlternative(exercise, fields) {
  for (const field of fields) {
    const alternative = cleanAlternativeName(exercise[field]);
    if (alternative) return alternative;
  }
  return null;
}

// Region → preferred modification field for pain-aware swaps (Cortex P0 §5.5).
const REGION_MOD_FIELD = {
  knee: 'kneeMod',
  ankle: 'ankleMod',
  back: 'backMod',
  shoulder: 'shoulderMod',
  wrist: 'wristMod',
  elbow: 'elbowMod',
  foot: 'footMod',
  hip: 'hipMod',
};

/**
 * Derive the best joint-friendly alternative name for an exercise, preferring
 * the modification field that matches the painful body region (e.g. a
 * left_knee report prefers kneeMod), then any joint mod, then easyVariation.
 * Returns null when the exercise carries no usable alternative.
 */
export function deriveJointFriendlyAlternative(exercise, region = '') {
  const normalized = String(region).toLowerCase();
  const preferredField = Object.entries(REGION_MOD_FIELD)
    .find(([key]) => normalized.includes(key))?.[1];
  const preferred = preferredField ? cleanAlternativeName(exercise[preferredField]) : null;
  return preferred
    || firstAvailableAlternative(exercise, JOINT_MOD_FIELDS)
    || cleanAlternativeName(exercise.easyVariation);
}

function buildAlternativeExercise(exercise, exerciseName, board, boardNumber, boardLabel) {
  return {
    ...exercise,
    board,
    boardNumber,
    boardLabel,
    sourceExerciseName: exercise.exerciseName,
    exerciseName,
    pyramidStartWeight: null,
    pyramidDrops: null,
    supersetOrder: null,
    supersetGroupId: null,
    // SWA-105 Slice 2: a Board-2/3 alternative is a DIFFERENT exercise, derived
    // from a modification name rather than selected by the ladder. The spread
    // above would otherwise hand it the parent's rung and chips — so a
    // joint-friendly substitute would render "bodyweight substitute" because
    // the exercise it replaces was one. Cleared for the same reason the
    // pyramid/superset fields above are cleared: inherited state that was never
    // about this row. No chips are invented in their place; nothing here is
    // provable from a modification string, and the board label already says
    // what this row is.
    selectionRung: 'R0',
    selectionChips: [],
  };
}

export function generateBoard2(board1Exercises) {
  const alternatives = [];
  for (const ex of board1Exercises) {
    const jointName = firstAvailableAlternative(ex, JOINT_MOD_FIELDS)
      || cleanAlternativeName(ex.easyVariation);
    const lowImpactName = cleanAlternativeName(ex.easyVariation)
      || firstAvailableAlternative(ex, ['ankleMod', 'kneeMod', 'backMod', 'hipMod', 'footMod', 'shoulderMod']);

    if (jointName) {
      alternatives.push(buildAlternativeExercise(
        ex,
        jointName,
        'alternative',
        2,
        'Joint-Friendly Alternatives',
      ));
    }

    if (lowImpactName && lowImpactName !== jointName) {
      alternatives.push(buildAlternativeExercise(
        ex,
        lowImpactName,
        'lowImpact',
        3,
        'Low-Impact Swaps',
      ));
    }
  }
  return alternatives;
}

// ── Pyramid Style ─────────────────────────────────────────────────────
// Heavy → drop 20lbs → lighter → failure
// Applied per station: exercises get sequential weight drops

export function applyPyramidStyle(exercises, explanations) {
  let groupId = 0;
  const stationGroups = {};

  for (const ex of exercises) {
    if (ex.board !== 'main' || ex.isCardioFinisher) continue;

    const stKey = ex.stationIndex ?? -1;
    if (!stationGroups[stKey]) {
      stationGroups[stKey] = [];
      groupId++;
    }
    stationGroups[stKey].push(ex);
  }

  for (const [, group] of Object.entries(stationGroups)) {
    for (let i = 0; i < group.length; i++) {
      group[i].pyramidDrops = i;
      group[i].pyramidStartWeight = i === 0 ? 'heavy' : i === 1 ? 'medium' : 'light';
    }
  }

  explanations.push({
    type: 'style',
    message: 'Pyramid style: Each station starts heavy and progressively drops weight. Last set to failure.',
  });
}

// ── Superset Style ────────────────────────────────────────────────────
// 3 exercises same muscle group: heavy compound → bodyweight → light banded

export function applySupersetStyle(exercises, explanations) {
  let supersetGroupId = 1;
  const stationGroups = {};

  for (const ex of exercises) {
    if (ex.board !== 'main' || ex.isCardioFinisher) continue;

    const stKey = ex.stationIndex ?? -1;
    if (!stationGroups[stKey]) stationGroups[stKey] = [];
    stationGroups[stKey].push(ex);
  }

  for (const [, group] of Object.entries(stationGroups)) {
    for (let i = 0; i < group.length; i++) {
      group[i].supersetGroupId = supersetGroupId;
      group[i].supersetOrder = i + 1;
    }
    supersetGroupId++;
  }

  explanations.push({
    type: 'style',
    message: 'Superset style: Each station groups exercises by muscle — compound → bodyweight → banded, all to failure.',
  });
}

// ── Warm-Up Stretch Generator ─────────────────────────────────────────

const STYLE_CUES = {
  mixed: {
    title: 'Mixed',
    cue: 'Mixed style: rotate the coaching focus each station so strength, conditioning, and control all show up in one class.',
  },
  ladder: {
    title: 'Ladder',
    cue: 'Ladder style: build reps each round, such as 2-4-6-8-10, while keeping form strict before increasing speed.',
  },
  descending: {
    title: 'Descending',
    cue: 'Descending style: start with the highest quality volume, then reduce reps as intensity and fatigue climb.',
  },
  chipper: {
    title: 'Chipper',
    cue: 'Chipper style: complete one focused block before moving on, using smooth pacing instead of rushing early reps.',
  },
  countdown: {
    title: 'Countdown',
    cue: 'Countdown style: shorten each work block from longer control sets into brief finishers with sharper intent.',
  },
  death_by: {
    title: 'Death By',
    cue: 'Death by style: add one rep each minute until the athlete can no longer finish the target inside the minute.',
  },
  ygig: {
    title: 'You Go I Go',
    cue: 'You go I go style: pair athletes so one works while one rests, then switch cleanly on the coach signal.',
  },
  contrast: {
    title: 'Contrast',
    cue: 'Contrast style: pair controlled strength with an explosive or faster bodyweight pattern for the same station focus.',
  },
  density: {
    title: 'Density',
    cue: 'Density style: maximize clean work inside a fixed block, tracking total rounds without letting movement quality drop.',
  },
};

function appendStyleCue(exercise, cue) {
  if (exercise.board !== 'main') return;

  exercise.description = exercise.description
    ? `${exercise.description} ${cue}`
    : cue;
}

function addGenericStyleCue(classStyle, exercises, explanations) {
  const config = STYLE_CUES[classStyle];
  if (!config) return false;

  for (const exercise of exercises) appendStyleCue(exercise, config.cue);

  explanations.push({
    type: 'style',
    message: `${config.title} (${classStyle}) style: ${config.cue.replace(`${config.title} style: `, '')}`,
  });

  return true;
}

export function applyClassStyle(classStyle, exercises, explanations) {
  if (!classStyle || classStyle === 'standard') return;

  if (classStyle === 'pyramid') {
    applyPyramidStyle(exercises, explanations);
    for (const exercise of exercises) {
      appendStyleCue(exercise, 'Pyramid style: start heavier, drop load each round, and finish with controlled failure mechanics.');
    }
    return;
  }

  if (classStyle === 'superset') {
    applySupersetStyle(exercises, explanations);
    for (const exercise of exercises) {
      appendStyleCue(exercise, 'Superset style: move through the paired station sequence with minimal transition time.');
    }
    return;
  }

  addGenericStyleCue(classStyle, exercises, explanations);
}

const STRETCH_LIBRARY = {
  lower_body: [
    { exerciseName: 'Standing Quad Stretch', targetMuscles: 'quads', durationSec: 30 },
    { exerciseName: 'Hamstring Doorway Stretch', targetMuscles: 'hamstrings', durationSec: 30 },
    { exerciseName: 'Hip Flexor Lunge Stretch', targetMuscles: 'hip_flexors', durationSec: 30 },
    { exerciseName: 'Calf Raises (dynamic)', targetMuscles: 'calves', durationSec: 20 },
    { exerciseName: 'Glute Bridge Hold', targetMuscles: 'glutes', durationSec: 30 },
    { exerciseName: 'Ankle Circles', targetMuscles: 'ankles', durationSec: 20 },
  ],
  upper_body: [
    { exerciseName: 'Arm Circles (forward + back)', targetMuscles: 'shoulders', durationSec: 20 },
    { exerciseName: 'Cross-Body Shoulder Stretch', targetMuscles: 'rear_deltoid', durationSec: 30 },
    { exerciseName: 'Doorway Chest Stretch', targetMuscles: 'chest', durationSec: 30 },
    { exerciseName: 'Wrist Circles', targetMuscles: 'wrists', durationSec: 15 },
    { exerciseName: 'Cat-Cow (thoracic)', targetMuscles: 'upper_back', durationSec: 30 },
    { exerciseName: 'Neck Rolls', targetMuscles: 'neck', durationSec: 15 },
  ],
  cardio: [
    { exerciseName: 'Light Jog in Place', targetMuscles: 'full_body', durationSec: 30 },
    { exerciseName: 'Arm Swings', targetMuscles: 'shoulders', durationSec: 20 },
    { exerciseName: 'Leg Swings (front/back)', targetMuscles: 'hip_flexors', durationSec: 20 },
    { exerciseName: 'Torso Rotations', targetMuscles: 'core', durationSec: 20 },
    { exerciseName: 'Ankle Bounces', targetMuscles: 'calves', durationSec: 15 },
    { exerciseName: 'High Knee March', targetMuscles: 'quads,hip_flexors', durationSec: 30 },
  ],
  full_body: [
    { exerciseName: 'World\'s Greatest Stretch', targetMuscles: 'full_body', durationSec: 30 },
    { exerciseName: 'Inchworms', targetMuscles: 'hamstrings,core', durationSec: 30 },
    { exerciseName: 'Arm Circles', targetMuscles: 'shoulders', durationSec: 20 },
    { exerciseName: 'Hip Circles', targetMuscles: 'hips', durationSec: 20 },
    { exerciseName: 'Cat-Cow', targetMuscles: 'spine', durationSec: 20 },
    { exerciseName: 'Bodyweight Squat Hold', targetMuscles: 'quads,glutes', durationSec: 30 },
  ],
};

export function generateStretches(dayType, durationMin) {
  const library = STRETCH_LIBRARY[dayType] ?? STRETCH_LIBRARY.full_body;
  const totalSec = durationMin * 60;
  const stretches = [];
  let elapsed = 0;

  for (let i = 0; i < library.length && elapsed < totalSec; i++) {
    const stretch = library[i];
    stretches.push({
      exerciseName: stretch.exerciseName,
      targetMuscles: stretch.targetMuscles,
      durationSec: stretch.durationSec,
      sortOrder: i + 1,
    });
    elapsed += stretch.durationSec;
  }

  return stretches;
}
