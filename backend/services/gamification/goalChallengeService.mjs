/**
 * goalChallengeService.mjs
 * ========================
 * Converts client onboarding goals into gamification challenges.
 * Called after both admin and self-service onboarding completion.
 *
 * Psychology principles applied:
 * - Endowed Progress: Auto-join "First Steps" challenge on onboarding
 * - Progress Gradient Effect: Progress bars on all challenges
 * - Variable Ratio Reinforcement: XP varies per challenge type
 * - Autonomy: Only initial challenges are auto-created; rest are opt-in
 */

import { getAllModels } from '../../models/index.mjs';

/**
 * Goal-to-challenge mapping templates.
 * Each primary goal maps to a set of auto-generated challenges.
 */
const GOAL_CHALLENGE_MAP = {
  weight_loss: [
    {
      title: 'Weekly Weigh-In',
      description: 'Record your weight once per week to track your progress toward your target.',
      challengeType: 'weekly',
      category: 'fitness',
      difficulty: 1,
      xpReward: 25,
      maxProgress: 12,
      progressUnit: 'weeks'
    },
    {
      title: '3x/Week Workout Streak',
      description: 'Complete at least 3 workout sessions per week for 4 weeks.',
      challengeType: 'monthly',
      category: 'streak',
      difficulty: 3,
      xpReward: 100,
      maxProgress: 4,
      progressUnit: 'weeks'
    },
    {
      title: 'Daily Calorie Target',
      description: 'Hit your daily calorie target for 7 consecutive days.',
      challengeType: 'weekly',
      category: 'nutrition',
      difficulty: 2,
      xpReward: 50,
      maxProgress: 7,
      progressUnit: 'days'
    }
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
      progressUnit: 'percent'
    },
    {
      title: 'Volume Increase',
      description: 'Increase total weekly training volume by 10% over your baseline.',
      challengeType: 'monthly',
      category: 'fitness',
      difficulty: 3,
      xpReward: 100,
      maxProgress: 100,
      progressUnit: 'percent'
    },
    {
      title: 'Protein Intake Streak',
      description: 'Hit your daily protein target for 14 consecutive days.',
      challengeType: 'weekly',
      category: 'nutrition',
      difficulty: 2,
      xpReward: 75,
      maxProgress: 14,
      progressUnit: 'days'
    }
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
      progressUnit: 'days'
    },
    {
      title: 'Try 5 New Exercises',
      description: 'Add 5 exercises you have never done before to your routine.',
      challengeType: 'monthly',
      category: 'fitness',
      difficulty: 2,
      xpReward: 60,
      maxProgress: 5,
      progressUnit: 'exercises'
    },
    {
      title: 'Flexibility Improvement',
      description: 'Complete 10 stretching sessions within 30 days.',
      challengeType: 'monthly',
      category: 'mindfulness',
      difficulty: 2,
      xpReward: 50,
      maxProgress: 10,
      progressUnit: 'sessions'
    }
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
      progressUnit: 'miles'
    },
    {
      title: 'Weekly Cardio Minutes',
      description: 'Complete at least 150 minutes of cardio per week for 4 weeks.',
      challengeType: 'monthly',
      category: 'fitness',
      difficulty: 3,
      xpReward: 100,
      maxProgress: 4,
      progressUnit: 'weeks'
    }
  ],
  flexibility: [
    {
      title: 'Daily Stretch Streak',
      description: 'Stretch for at least 10 minutes every day for 21 days.',
      challengeType: 'monthly',
      category: 'mindfulness',
      difficulty: 2,
      xpReward: 80,
      maxProgress: 21,
      progressUnit: 'days'
    },
    {
      title: 'Yoga Count',
      description: 'Complete 12 yoga sessions within 30 days.',
      challengeType: 'monthly',
      category: 'mindfulness',
      difficulty: 2,
      xpReward: 75,
      maxProgress: 12,
      progressUnit: 'sessions'
    }
  ]
};

// Universal "First Steps" challenge — endowed progress principle
const FIRST_STEPS_CHALLENGE = {
  title: 'First Steps',
  description: 'Complete your onboarding profile and record your first workout. You are already halfway there!',
  challengeType: 'daily',
  category: 'streak',
  difficulty: 1,
  xpReward: 50,
  maxProgress: 2,
  progressUnit: 'steps'
};

/**
 * Normalize primary goal string to a map key.
 */
function normalizeGoal(goalStr) {
  if (!goalStr || typeof goalStr !== 'string') return 'general_fitness';
  const lower = goalStr.toLowerCase().trim();
  if (lower.includes('weight') && lower.includes('loss')) return 'weight_loss';
  if (lower.includes('lose') && lower.includes('weight')) return 'weight_loss';
  if (lower.includes('fat') && lower.includes('loss')) return 'weight_loss';
  if (lower.includes('muscle') || lower.includes('bulk') || lower.includes('mass')) return 'muscle_gain';
  if (lower.includes('strength') || lower.includes('strong')) return 'muscle_gain';
  if (lower.includes('endurance') || lower.includes('cardio') || lower.includes('run')) return 'endurance';
  if (lower.includes('flex') || lower.includes('mobil') || lower.includes('yoga')) return 'flexibility';
  return 'general_fitness';
}

/**
 * Generate challenges from a user's onboarding goals.
 * Creates Challenge records and auto-enrolls the user via ChallengeParticipant.
 *
 * @param {number|string} userId - The user's ID
 * @param {object} masterPromptJson - The user's master prompt JSON (contains goals section)
 * @returns {Promise<Array>} Created challenges
 */
export async function generateChallengesFromGoals(userId, masterPromptJson) {
  const { Goal, Challenge, ChallengeParticipant } = getAllModels();

  if (!Goal || !Challenge || !ChallengeParticipant) {
    console.warn('[GoalChallengeService] Required models not available. Skipping challenge generation.');
    return [];
  }

  const goals = masterPromptJson?.goals;
  const primaryGoal = goals?.primary || goals?.primaryGoal;
  if (!primaryGoal) {
    console.info('[GoalChallengeService] No primary goal found. Skipping challenge generation.');
    return [];
  }

  const goalKey = normalizeGoal(primaryGoal);
  const templates = GOAL_CHALLENGE_MAP[goalKey] || GOAL_CHALLENGE_MAP.general_fitness;

  const now = new Date();
  const thirtyDaysLater = new Date(now);
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

  const created = [];

  // Create "First Steps" challenge + auto-enroll (endowed progress: 1/2 complete)
  try {
    const [firstSteps] = await Challenge.findOrCreate({
      where: { title: FIRST_STEPS_CHALLENGE.title, createdBy: String(userId) },
      defaults: {
        ...FIRST_STEPS_CHALLENGE,
        createdBy: String(userId),
        status: 'active',
        isPublic: false,
        startDate: now,
        endDate: thirtyDaysLater,
        currentParticipants: 1
      }
    });

    await ChallengeParticipant.findOrCreate({
      where: { userId: String(userId), challengeId: firstSteps.id },
      defaults: {
        status: 'active',
        currentProgress: 1, // Endowed progress: onboarding = step 1 of 2
        progressPercentage: 50
      }
    });

    created.push(firstSteps);
  } catch (err) {
    console.error('[GoalChallengeService] Failed to create First Steps challenge:', err.message);
  }

  // Create goal-specific challenges
  for (const template of templates) {
    try {
      const [challenge] = await Challenge.findOrCreate({
        where: { title: template.title, createdBy: String(userId) },
        defaults: {
          ...template,
          createdBy: String(userId),
          status: 'active',
          isPublic: false,
          startDate: now,
          endDate: thirtyDaysLater,
          currentParticipants: 1
        }
      });

      await ChallengeParticipant.findOrCreate({
        where: { userId: String(userId), challengeId: challenge.id },
        defaults: {
          status: 'joined',
          currentProgress: 0,
          progressPercentage: 0
        }
      });

      created.push(challenge);
    } catch (err) {
      console.error(`[GoalChallengeService] Failed to create challenge "${template.title}":`, err.message);
    }
  }

  // Create a corresponding Goal record for the primary goal
  try {
    await Goal.findOrCreate({
      where: { userId: String(userId), title: primaryGoal },
      defaults: {
        userId: String(userId),
        title: primaryGoal,
        description: goals?.whyImportant || `Primary fitness goal: ${primaryGoal}`,
        targetValue: 100,
        currentValue: 0,
        unit: 'percent',
        category: goalKey === 'weight_loss' ? 'weight' : goalKey === 'muscle_gain' ? 'strength' : 'fitness',
        priority: 'high',
        status: 'active',
        deadline: thirtyDaysLater,
        startDate: now,
        trackingMethod: 'manual',
        difficulty: 3,
        xpReward: 200
      }
    });
  } catch (err) {
    console.error('[GoalChallengeService] Failed to create primary goal record:', err.message);
  }

  console.info(`[GoalChallengeService] Created ${created.length} challenges for user ${userId} (goal: ${goalKey})`);
  return created;
}

export default { generateChallengesFromGoals };
