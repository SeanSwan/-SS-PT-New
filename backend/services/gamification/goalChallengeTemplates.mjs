export const GOAL_CHALLENGE_MAP = {
  weight_loss: [
    {
      title: 'Weekly Weigh-In',
      description: 'Record your weight once per week to track your progress toward your target.',
      challengeType: 'weekly',
      category: 'fitness',
      difficulty: 1,
      xpReward: 25,
      maxProgress: 12,
      progressUnit: 'weeks',
    },
    {
      title: '3x/Week Workout Streak',
      description: 'Complete at least 3 workout sessions per week for 4 weeks.',
      challengeType: 'monthly',
      category: 'streak',
      difficulty: 3,
      xpReward: 100,
      maxProgress: 4,
      progressUnit: 'weeks',
    },
    {
      title: 'Nutrition Check-In Rhythm',
      description: 'Log one honest nutrition check-in for 7 days; consistency and review matter more than perfect numbers.',
      challengeType: 'weekly',
      category: 'nutrition',
      difficulty: 2,
      xpReward: 50,
      maxProgress: 7,
      progressUnit: 'days',
    },
  ],
  muscle_gain: [
    {
      title: 'Benchpress PR',
      description: 'Increase your benchpress 1RM by 5% within 8 weeks.',
      challengeType: 'monthly',
      category: 'fitness',
      difficulty: 4,
      xpReward: 150,
      maxProgress: 100,
      progressUnit: 'percent',
    },
    {
      title: 'Volume Increase',
      description: 'Increase total weekly training volume by 10% over your baseline.',
      challengeType: 'monthly',
      category: 'fitness',
      difficulty: 3,
      xpReward: 100,
      maxProgress: 100,
      progressUnit: 'percent',
    },
    {
      title: 'Protein Support Rhythm',
      description: 'Log a protein-supporting meal or coach-reviewed check-in for 14 days without treating the number as a pass/fail score.',
      challengeType: 'weekly',
      category: 'nutrition',
      difficulty: 2,
      xpReward: 75,
      maxProgress: 14,
      progressUnit: 'days',
    },
  ],
  general_fitness: [
    {
      title: '30-Day Consistency',
      description: 'Complete at least 4 workouts per week for 30 days.',
      challengeType: 'monthly',
      category: 'streak',
      difficulty: 3,
      xpReward: 120,
      maxProgress: 30,
      progressUnit: 'days',
    },
    {
      title: 'Try 5 New Exercises',
      description: 'Add 5 exercises you have never done before to your routine.',
      challengeType: 'monthly',
      category: 'fitness',
      difficulty: 2,
      xpReward: 60,
      maxProgress: 5,
      progressUnit: 'exercises',
    },
    {
      title: 'Flexibility Improvement',
      description: 'Complete 10 stretching sessions within 30 days.',
      challengeType: 'monthly',
      category: 'fitness',
      difficulty: 2,
      xpReward: 50,
      maxProgress: 10,
      progressUnit: 'sessions',
    },
  ],
  endurance: [
    {
      title: 'Distance Tracker',
      description: 'Log cumulative running/walking distance over 4 weeks.',
      challengeType: 'monthly',
      category: 'fitness',
      difficulty: 3,
      xpReward: 100,
      maxProgress: 50,
      progressUnit: 'miles',
    },
    {
      title: 'Weekly Cardio Minutes',
      description: 'Complete at least 150 minutes of cardio per week for 4 weeks.',
      challengeType: 'monthly',
      category: 'fitness',
      difficulty: 3,
      xpReward: 100,
      maxProgress: 4,
      progressUnit: 'weeks',
    },
  ],
  flexibility: [
    {
      title: 'Daily Stretch Streak',
      description: 'Stretch for at least 10 minutes every day for 21 days.',
      challengeType: 'monthly',
      category: 'fitness',
      difficulty: 2,
      xpReward: 80,
      maxProgress: 21,
      progressUnit: 'days',
    },
    {
      title: 'Flexibility Count',
      description: 'Complete 12 flexibility sessions within 30 days.',
      challengeType: 'monthly',
      category: 'fitness',
      difficulty: 2,
      xpReward: 75,
      maxProgress: 12,
      progressUnit: 'sessions',
    },
  ],
};

export const FIRST_STEPS_CHALLENGE = {
  title: 'First Steps',
  description: 'Complete your onboarding profile and record your first workout. You are already halfway there!',
  challengeType: 'daily',
  category: 'streak',
  difficulty: 1,
  xpReward: 50,
  maxProgress: 2,
  progressUnit: 'steps',
};

export function normalizeGoal(goalStr) {
  if (!goalStr || typeof goalStr !== 'string') return 'general_fitness';
  const lower = goalStr.toLowerCase().trim();
  if (lower.includes('weight') && lower.includes('loss')) return 'weight_loss';
  if (lower.includes('lose') && lower.includes('weight')) return 'weight_loss';
  if (lower.includes('fat') && lower.includes('loss')) return 'weight_loss';
  if (lower.includes('muscle') || lower.includes('bulk') || lower.includes('mass')) return 'muscle_gain';
  if (lower.includes('strength') || lower.includes('strong')) return 'muscle_gain';
  if (lower.includes('endurance') || lower.includes('cardio') || lower.includes('run')) return 'endurance';
  if (lower.includes('flex') || lower.includes('mobil') || lower.includes('stretch')) return 'flexibility';
  return 'general_fitness';
}

export function getTemplatesForGoal(primaryGoal) {
  const goalKey = normalizeGoal(primaryGoal);
  return {
    goalKey,
    templates: GOAL_CHALLENGE_MAP[goalKey] || GOAL_CHALLENGE_MAP.general_fitness,
  };
}

export function getGoalRecordCategory(goalKey) {
  if (goalKey === 'weight_loss') return 'weight';
  if (goalKey === 'muscle_gain') return 'strength';
  return 'fitness';
}
