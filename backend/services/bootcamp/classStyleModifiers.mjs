/**
 * ============================================================================
 * FILE: classStyleModifiers.mjs
 * PURPOSE: Class style modifiers (pyramid, superset, board 2) + stretch generator
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Applies class style modifications (pyramid weight drops,
 * superset grouping) to generated exercises, generates Board 2 alternatives,
 * and produces warm-up stretch sequences.
 * HOW IT FITS: bootcampGenerator → classStyleModifiers (steps 9-11 in pipeline)
 */

// ── Two-Board System ──────────────────────────────────────────────────
// Board 1 = main intensity. Board 2 = easier alternatives for people
// who can't keep up (injury modifications, lower intensity).

export function generateBoard2(board1Exercises) {
  const board2 = [];
  for (const ex of board1Exercises) {
    const altName = ex.easyVariation
      || ex.kneeMod
      || ex.backMod
      || ex.shoulderMod;

    if (!altName) continue;

    board2.push({
      ...ex,
      board: 'alternative',
      exerciseName: altName,
      pyramidStartWeight: null,
      pyramidDrops: null,
      supersetOrder: null,
      supersetGroupId: null,
    });
  }
  return board2;
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
