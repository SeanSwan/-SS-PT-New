/**
 * Converts onboarding goals into private gamification challenges.
 */
import { getAllModels } from '../../models/index.mjs';
import {
  FIRST_STEPS_CHALLENGE,
  getGoalRecordCategory,
  getTemplatesForGoal,
} from './goalChallengeTemplates.mjs';

const THIRTY_DAYS = 30;

const buildWindow = () => {
  const now = new Date();
  const thirtyDaysLater = new Date(now);
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + THIRTY_DAYS);
  return { now, thirtyDaysLater };
};

async function createChallengeWithParticipant({
  Challenge,
  ChallengeParticipant,
  userId,
  template,
  now,
  thirtyDaysLater,
  participantDefaults,
}) {
  const userKey = String(userId);
  const [challenge] = await Challenge.findOrCreate({
    where: { title: template.title, createdBy: userKey },
    defaults: {
      ...template,
      createdBy: userKey,
      status: 'active',
      isPublic: false,
      startDate: now,
      endDate: thirtyDaysLater,
      currentParticipants: 1,
    },
  });

  await ChallengeParticipant.findOrCreate({
    where: { userId: userKey, challengeId: challenge.id },
    defaults: participantDefaults,
  });

  return challenge;
}

async function createFirstStepsChallenge(models, userId, window) {
  return createChallengeWithParticipant({
    ...models,
    userId,
    template: FIRST_STEPS_CHALLENGE,
    ...window,
    participantDefaults: {
      status: 'active',
      currentProgress: 1,
      progressPercentage: 50,
    },
  });
}

async function createGoalChallenge(models, userId, template, window) {
  return createChallengeWithParticipant({
    ...models,
    userId,
    template,
    ...window,
    participantDefaults: {
      status: 'joined',
      currentProgress: 0,
      progressPercentage: 0,
    },
  });
}

async function createPrimaryGoalRecord({ Goal, userId, primaryGoal, goals, goalKey, thirtyDaysLater, now }) {
  await Goal.findOrCreate({
    where: { userId: String(userId), title: primaryGoal },
    defaults: {
      userId: String(userId),
      title: primaryGoal,
      description: goals?.whyImportant || `Primary fitness goal: ${primaryGoal}`,
      targetValue: 100,
      currentValue: 0,
      unit: 'percent',
      category: getGoalRecordCategory(goalKey),
      priority: 'high',
      status: 'active',
      deadline: thirtyDaysLater,
      startDate: now,
      trackingMethod: 'manual',
      difficulty: 3,
      xpReward: 200,
    },
  });
}

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

  const { goalKey, templates } = getTemplatesForGoal(primaryGoal);
  const window = buildWindow();
  const created = [];
  const challengeModels = { Challenge, ChallengeParticipant };

  try {
    created.push(await createFirstStepsChallenge(challengeModels, userId, window));
  } catch (err) {
    console.error('[GoalChallengeService] Failed to create First Steps challenge:', err.message);
  }

  for (const template of templates) {
    try {
      created.push(await createGoalChallenge(challengeModels, userId, template, window));
    } catch (err) {
      console.error(`[GoalChallengeService] Failed to create challenge "${template.title}":`, err.message);
    }
  }

  try {
    await createPrimaryGoalRecord({ Goal, userId, primaryGoal, goals, goalKey, ...window });
  } catch (err) {
    console.error('[GoalChallengeService] Failed to create primary goal record:', err.message);
  }

  console.info(`[GoalChallengeService] Created ${created.length} challenges for user ${userId} (goal: ${goalKey})`);
  return created;
}

export default { generateChallengesFromGoals };
