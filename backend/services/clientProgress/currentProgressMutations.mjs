// backend/services/clientProgress/currentProgressMutations.mjs

const isRecord = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value));

const addNumber = (currentValue, increment) => {
  const current = Number(currentValue) || 0;
  const parsedIncrement = Number(increment) || 0;
  return current + parsedIncrement;
};

const applyExperiencePoints = (clientProgress, experiencePoints) => {
  const points = Number(experiencePoints);
  if (!Number.isFinite(points) || points <= 0) return;

  clientProgress.experiencePoints += points;
  const xpNeeded = 100 + (clientProgress.overallLevel * 25);
  if (clientProgress.experiencePoints >= xpNeeded) {
    clientProgress.overallLevel += 1;
    clientProgress.experiencePoints -= xpNeeded;
  }
};

const applyLevelEntry = (clientProgress, category, points) => {
  const levelField = `${category}Level`;
  const pointsField = `${category}ExperiencePoints`;
  if (clientProgress[levelField] === undefined || clientProgress[pointsField] === undefined) return;

  clientProgress[pointsField] = addNumber(clientProgress[pointsField], points);
  const categoryXpNeeded = 50 + (clientProgress[levelField] * 15);
  if (clientProgress[pointsField] >= categoryXpNeeded) {
    clientProgress[levelField] += 1;
    clientProgress[pointsField] -= categoryXpNeeded;
  }
};

const applyLevelUpdates = (clientProgress, levelUpdates) => {
  if (!isRecord(levelUpdates)) return;
  Object.entries(levelUpdates).forEach(([category, points]) => {
    applyLevelEntry(clientProgress, category, points);
  });
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const newAchievementList = (clientProgress, achievementsUnlocked) => {
  const currentAchievements = asArray(clientProgress.achievements);
  return asArray(achievementsUnlocked).filter((achievement) => !currentAchievements.includes(achievement));
};

const applyAchievements = (clientProgress, achievementsUnlocked) => {
  const currentAchievements = asArray(clientProgress.achievements);
  const currentAchievementDates = clientProgress.achievementDates || {};
  const newAchievements = newAchievementList(clientProgress, achievementsUnlocked);
  if (!newAchievements.length) return;

  clientProgress.achievements = [...new Set([...currentAchievements, ...newAchievements])];
  clientProgress.achievementDates = {
    ...currentAchievementDates,
    ...Object.fromEntries(newAchievements.map((achievement) => [achievement, new Date().toISOString()])),
  };
};

const METRIC_INCREMENTS = [
  ['workoutsCompleted', 'workoutsCompleted'],
  ['totalExercisesPerformed', 'totalExercisesPerformed'],
  ['totalMinutes', 'totalMinutes'],
];

const applyWorkoutMetrics = (clientProgress, workoutMetrics) => {
  if (!isRecord(workoutMetrics)) return;
  METRIC_INCREMENTS.forEach(([source, target]) => {
    if (workoutMetrics[source]) clientProgress[target] = addNumber(clientProgress[target], workoutMetrics[source]);
  });
  if (workoutMetrics.updatedStreakDays !== undefined) {
    clientProgress.streakDays = workoutMetrics.updatedStreakDays;
  }
};

export const applyCurrentClientProgressUpdates = (clientProgress, body = {}) => {
  applyExperiencePoints(clientProgress, body.experiencePoints);
  applyLevelUpdates(clientProgress, body.levelUpdates);
  applyAchievements(clientProgress, body.achievementsUnlocked);
  applyWorkoutMetrics(clientProgress, body.workoutMetrics);
};

export const applyTrainerProgressUpdates = (clientProgress, updates = {}) => {
  Object.keys(updates).forEach((key) => {
    if (clientProgress[key] !== undefined) clientProgress[key] = updates[key];
  });
};
