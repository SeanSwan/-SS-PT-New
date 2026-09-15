export const REPLACEMENT_DETAIL_FIELDS = [
  'exerciseLibraryId', 'exerciseKey', 'key', 'canonicalExerciseKey',
  'videoUrl', 'previewVideoUrl', 'imageUrl', 'thumbnailUrl', 'description', 'instructions',
  'equipmentRequired', 'muscleTargets', 'easyVariation', 'mediumVariation', 'hardVariation',
  'kneeMod', 'shoulderMod', 'ankleMod', 'wristMod', 'elbowMod', 'footMod', 'hipMod', 'backMod',
];
export function unverifiedReplacement(exercise, name) {
  return {
    ...exercise,
    ...Object.fromEntries(REPLACEMENT_DETAIL_FIELDS.map(field => [field, null])),
    exerciseName: name,
    sourceExerciseName: exercise.sourceExerciseName ?? exercise.exerciseName,
    sourceExerciseKey: exercise.sourceExerciseKey ?? exercise.exerciseKey ?? exercise.key ?? null,
    sourceExerciseLibraryId: exercise.sourceExerciseLibraryId ?? exercise.exerciseLibraryId ?? null,
    detailsVerified: false, resolution: 'unverified_replacement', selectionChips: [], selectionRung: 'R0',
  };
}
