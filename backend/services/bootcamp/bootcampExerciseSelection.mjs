import {
  CARDIO_FINISHERS,
  TRANSITION_TIME_SEC,
  distributeMuscleGroups,
  formatExerciseName,
} from './bootcampConstants.mjs';
import { estimateSetupTime } from './exerciseRolodexBridge.mjs';

function selectStationExercises(available, stationMuscles, count, usedNames) {
  const primaryMuscle = stationMuscles[0];

  const primaryMatches = available
    .filter(ex => {
      const exPrimary = ex.primaryMuscle || (ex.muscles ?? [])[0];
      return exPrimary && exPrimary === primaryMuscle;
    })
    .filter(ex => !usedNames.has(ex.key));

  const secondaryMatches = available
    .filter(ex => {
      const exMuscles = ex.muscles ?? [];
      const exPrimary = ex.primaryMuscle || exMuscles[0];
      if (exPrimary === primaryMuscle) return false;
      return exMuscles.includes(primaryMuscle);
    })
    .filter(ex => !usedNames.has(ex.key));

  const tertiaryMatches = stationMuscles.length > 1
    ? available
        .filter(ex => {
          const exPrimary = ex.primaryMuscle || (ex.muscles ?? [])[0];
          return stationMuscles.slice(1).includes(exPrimary);
        })
        .filter(ex => !usedNames.has(ex.key))
        .filter(ex => !primaryMatches.some(p => p.key === ex.key) && !secondaryMatches.some(s => s.key === ex.key))
    : [];

  const matching = [...primaryMatches, ...secondaryMatches, ...tertiaryMatches];
  const needed = Math.max(1, count - 1);

  if (matching.length >= needed) return matching.slice(0, needed);

  const selected = [...matching];
  const remainingPool = available
    .filter(ex => !usedNames.has(ex.key) && !selected.some(s => s.key === ex.key));

  for (const ex of remainingPool) {
    if (selected.length >= needed) break;
    selected.push(ex);
  }

  return selected;
}

function selectFullGroupExercises(available) {
  const compound = available
    .filter(ex => (ex.muscles ?? []).length >= 2)
    .slice(0, 5);

  const cardio = CARDIO_FINISHERS.slice(0, 5).map(cf => ({
    ...cf,
    key: cf.name.toLowerCase().replace(/\s+/g, '_'),
    muscles: cf.muscles.split(','),
    isCardio: true,
  }));

  const usedKeys = new Set([...compound.map(e => e.key), ...cardio.map(e => e.key)]);
  const accessory = available
    .filter(ex => !usedKeys.has(ex.key) && (ex.muscles ?? []).length <= 2)
    .slice(0, 5);

  const result = [];
  const maxLen = Math.max(compound.length, cardio.length, accessory.length);
  for (let i = 0; i < maxLen; i++) {
    if (compound[i]) result.push(compound[i]);
    if (cardio[i]) result.push(cardio[i]);
    if (accessory[i]) result.push(accessory[i]);
  }

  return result.slice(0, 15);
}

export function buildExerciseRecord(ex, opts) {
  const setupTime = ex.setupTimeSec ?? estimateSetupTime(ex);
  const exerciseLibraryId = normalizeExerciseLibraryId(ex.exerciseLibraryId);

  return {
    stationIndex: opts.stationIndex ?? undefined,
    exerciseName: ex.name ?? formatExerciseName(ex.key),
    durationSec: opts.durationSec,
    restSec: opts.restSec ?? TRANSITION_TIME_SEC,
    sortOrder: opts.sortOrder,
    isCardioFinisher: opts.isCardioFinisher ?? false,
    muscleTargets: Array.isArray(ex.muscles) ? ex.muscles.join(',') : (ex.muscles ?? ''),
    easyVariation: ex.easy ?? null,
    mediumVariation: ex.medium ?? null,
    hardVariation: ex.hard ?? null,
    kneeMod: ex.kneeMod ?? null,
    shoulderMod: ex.shoulderMod ?? null,
    ankleMod: ex.ankleMod ?? null,
    wristMod: ex.wristMod ?? null,
    backMod: ex.backMod ?? null,
    description: ex.description ?? null,
    instructions: ex.instructions ?? null,
    equipmentRequired: Array.isArray(ex.equipment) ? ex.equipment.join(', ') : (ex.equipment ?? null),
    videoUrl: ex.videoUrl ?? null,
    previewVideoUrl: ex.previewVideoUrl ?? null,
    imageUrl: ex.imageUrl ?? null,
    thumbnailUrl: ex.thumbnailUrl ?? null,
    board: 'main',
    setupTimeSec: setupTime,
    exerciseLibraryId,
    selectionReason: ex.selectionReason ?? null,
    equipmentEvidence: Array.isArray(ex.equipmentEvidence) ? ex.equipmentEvidence : [],
    missingEquipment: Array.isArray(ex.missingEquipment) ? ex.missingEquipment : [],
    mediaStatus: ex.mediaStatus ?? null,
    scoreBreakdown: ex.scoreBreakdown ?? null,
  };
}

export function normalizeExerciseLibraryId(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export function buildFullGroupWorkout(available, format, allExercises, explanations) {
  const selected = selectFullGroupExercises(available);
  for (let i = 0; i < selected.length; i++) {
    allExercises.push(buildExerciseRecord(selected[i], {
      durationSec: format.durationSec,
      sortOrder: i + 1,
      isCardioFinisher: selected[i].isCardio ?? false,
    }));
  }
  explanations.push({
    type: 'format',
    message: `Full group workout: ${selected.length} exercises x 2 rounds, ${format.durationSec}s each`,
  });
}

export function buildStationWorkout(available, targetMuscles, stationCount, format, usedNames, stations, allExercises, explanations) {
  const muscleGroups = distributeMuscleGroups(targetMuscles, stationCount);

  for (let s = 0; s < stationCount; s++) {
    const stationMuscles = muscleGroups[s];
    const stationExes = selectStationExercises(available, stationMuscles, format.exercisesPerStation, usedNames);

    stations.push({
      stationNumber: s + 1,
      stationName: `Station ${s + 1}: ${formatExerciseName(stationMuscles[0] ?? 'mixed')}`,
      equipmentNeeded: stationExes
        .flatMap(e => Array.isArray(e.equipment) ? e.equipment : (e.equipment ? [e.equipment] : []))
        .filter((v, i, a) => v && a.indexOf(v) === i)
        .map(eq => formatExerciseName(eq))
        .join(', ') || 'Bodyweight',
      setupTimeSec: 0,
      sortOrder: s + 1,
    });

    for (let e = 0; e < stationExes.length; e++) {
      allExercises.push(buildExerciseRecord(stationExes[e], {
        stationIndex: s,
        durationSec: format.durationSec,
        sortOrder: e + 1,
      }));
      usedNames.add(stationExes[e].key);
    }

    const finisher = CARDIO_FINISHERS[s % CARDIO_FINISHERS.length];
    allExercises.push(buildExerciseRecord(finisher, {
      stationIndex: s,
      durationSec: format.durationSec,
      restSec: 0,
      sortOrder: stationExes.length + 1,
      isCardioFinisher: true,
    }));
  }

  explanations.push({
    type: 'format',
    message: `${stationCount} stations, ${format.exercisesPerStation} exercises each, ${format.durationSec}s per exercise`,
  });
}
