function exerciseSearchText(exercise) {
  return [
    exercise.name,
    exercise.key,
    exercise.exerciseType,
    exercise.bodyPartCategory,
    ...(Array.isArray(exercise.muscles) ? exercise.muscles : [exercise.muscles]),
    ...(Array.isArray(exercise.equipment) ? exercise.equipment : [exercise.equipment]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function hasAny(text, words) {
  return words.some(word => text.includes(word));
}

function scoreExerciseForIntensity(exercise, intensityCategory) {
  if (!intensityCategory) return 0;

  const text = exerciseSearchText(exercise);
  const difficulty = Number(exercise.difficulty ?? 500);
  const hasEquipment = !hasAny(text, ['bodyweight', 'none']) && hasAny(text, [
    'barbell',
    'dumbbell',
    'kettlebell',
    'machine',
    'cable',
    'bench',
  ]);

  switch (intensityCategory) {
    case 'high_impact':
      return (hasAny(text, ['jump', 'burpee', 'sprint', 'plyo', 'hop', 'bound']) ? 70 : 0)
        + (hasAny(text, ['mobility', 'stretch', 'recovery']) ? -35 : 0)
        + Math.min(20, difficulty / 50);
    case 'medium_impact':
      return (hasAny(text, ['compound', 'squat', 'row', 'press', 'lunge', 'hinge']) ? 45 : 0)
        + (hasAny(text, ['jump', 'burpee', 'sprint', 'plyo']) ? -40 : 0)
        + (difficulty >= 250 && difficulty <= 700 ? 15 : 0);
    case 'calisthenics':
      return (hasAny(text, ['bodyweight', 'push up', 'pull up', 'plank', 'squat', 'lunge']) ? 70 : 0)
        + (hasEquipment ? -35 : 0);
    case 'stability':
      return (hasAny(text, ['core', 'balance', 'stability', 'bosu', 'single', 'unilateral', 'plank']) ? 70 : 0)
        + (hasAny(text, ['jump', 'sprint']) ? -30 : 0);
    case 'flexibility':
      return (hasAny(text, ['stretch', 'mobility', 'flexibility', 'recovery', 'flow']) ? 80 : 0)
        + Math.max(0, 500 - difficulty) / 20;
    case 'cardio':
      return (hasAny(text, ['cardio', 'conditioning', 'jump', 'jack', 'sprint', 'burpee', 'climber']) ? 70 : 0)
        + (hasAny(text, ['mobility', 'stretch']) ? -35 : 0);
    default:
      return 0;
  }
}

export function rankExercisesForBootcamp(exercises, { intensityCategory } = {}) {
  if (!intensityCategory || !Array.isArray(exercises)) return exercises;

  return [...exercises]
    .map((exercise, index) => ({
      exercise,
      index,
      score: scoreExerciseForIntensity(exercise, intensityCategory),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(item => item.exercise);
}
