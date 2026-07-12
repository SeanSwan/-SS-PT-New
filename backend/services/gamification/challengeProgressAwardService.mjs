/**
 * Challenge progress point-award policy.
 *
 * Converts a requested progress update into one monotonic cumulative point
 * total. Cumulative points never decrease, so lowering and re-raising progress
 * cannot mint the same reward twice.
 */
const MAX_LEGACY_CHALLENGE_POINTS = 500;

const asFiniteNonNegative = (value, label) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new Error(label);
  }
  return numberValue;
};

export function calculateChallengeProgressAward({
  currentProgress,
  priorPointsEarned,
  requestedProgress,
  overwrite,
  challenge,
}) {
  const requested = asFiniteNonNegative(
    requestedProgress,
    'Progress must be a finite non-negative number',
  );
  const current = asFiniteNonNegative(currentProgress || 0, 'Current progress is invalid');
  const priorPoints = Math.floor(
    asFiniteNonNegative(priorPointsEarned || 0, 'Prior challenge points are invalid'),
  );
  const goal = asFiniteNonNegative(challenge?.goal, 'Challenge goal is invalid');
  const pointsPerUnit = asFiniteNonNegative(
    challenge?.pointsPerUnit || 0,
    'Challenge points per unit are invalid',
  );
  const bonusPoints = Math.floor(
    asFiniteNonNegative(challenge?.bonusPoints || 0, 'Challenge bonus points are invalid'),
  );

  const newProgress = Math.min(overwrite ? requested : current + requested, goal);
  const justCompleted = current < goal && newProgress >= goal;
  const calculatedPoints = Math.min(
    MAX_LEGACY_CHALLENGE_POINTS,
    Math.floor(newProgress * pointsPerUnit) + (justCompleted ? bonusPoints : 0),
  );
  const cumulativePoints = Math.max(priorPoints, calculatedPoints);

  return {
    newProgress,
    cumulativePoints,
    pointsToAward: cumulativePoints - priorPoints,
    justCompleted,
  };
}
