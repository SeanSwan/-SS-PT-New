/**
 * weeklyChallengeCron — Auto-create weekly challenges
 * =====================================================
 * Runs a daily check; if no active weekly challenge ends after today,
 * creates a new one from a rotating template covering all categories.
 * Uses setInterval (matching existing server patterns — no cron library).
 */

import Challenge from '../models/Challenge.mjs';
import User from '../models/User.mjs';
import { Op } from 'sequelize';
import logger from '../utils/logger.mjs';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const CHALLENGE_TEMPLATES = [
  { title: 'Weekly Workout Streak', description: 'Complete at least one workout every day this week.', category: 'fitness', difficulty: 2, xpReward: 200 },
  { title: 'Dance It Out', description: 'Post a dance video or share your best moves this week.', category: 'dance', difficulty: 1, xpReward: 150 },
  { title: 'Playlist Drop', description: 'Share your ultimate workout playlist with the community.', category: 'music', difficulty: 1, xpReward: 100 },
  { title: 'Creative Expression Week', description: 'Share a piece of fitness-inspired art, photography, or creative work.', category: 'art', difficulty: 2, xpReward: 200 },
  { title: 'Gamer + Athlete', description: '30 min gaming + 30 min exercise every day this week.', category: 'gaming', difficulty: 3, xpReward: 300 },
  { title: 'Community Connection', description: 'Comment on 5 different posts and make a new friend this week.', category: 'social', difficulty: 1, xpReward: 150 },
  { title: 'Mindful Movement', description: 'Complete 3 stretching or yoga sessions this week.', category: 'mindfulness', difficulty: 2, xpReward: 150 },
  { title: 'Nutrition Check-In', description: 'Log your meals for 5 days this week and share a healthy recipe.', category: 'nutrition', difficulty: 2, xpReward: 200 },
  { title: 'Community Meetup Prep', description: 'Organize or join a virtual workout with at least one other member.', category: 'community_meetup', difficulty: 2, xpReward: 250 },
  { title: 'Consistency King', description: 'Log activity (any type) every single day this week.', category: 'streak', difficulty: 3, xpReward: 300 },
];

let templateIndex = 0;

async function createWeeklyChallenge() {
  try {
    const now = new Date();

    // Check if there's already an active weekly challenge ending after today
    const existing = await Challenge.findOne({
      where: {
        type: 'weekly',
        status: 'active',
        endDate: { [Op.gt]: now },
      },
    });

    if (existing) {
      logger.info(`Weekly challenge already active: "${existing.title}" — skipping.`);
      return;
    }

    // Find admin user for createdBy
    const admin = await User.findOne({ where: { role: 'admin' } });
    if (!admin) {
      logger.warn('No admin user found — cannot create weekly challenge.');
      return;
    }

    // Calculate next Monday → Sunday
    const dayOfWeek = now.getDay(); // 0=Sun … 6=Sat
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
    const startDate = new Date(now.getTime() + daysUntilMonday * ONE_DAY_MS);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate.getTime() + 6 * ONE_DAY_MS);
    endDate.setHours(23, 59, 59, 999);

    const template = CHALLENGE_TEMPLATES[templateIndex % CHALLENGE_TEMPLATES.length];
    templateIndex++;

    await Challenge.create({
      ...template,
      type: 'weekly',
      startDate,
      endDate,
      status: 'active',
      isPublic: true,
      isFeatured: true,
      maxParticipants: 500,
      currentParticipants: 0,
      createdBy: admin.id,
    });

    logger.info(`✅ Weekly challenge created: "${template.title}" (${template.category}) — ${startDate.toDateString()} to ${endDate.toDateString()}`);
  } catch (err) {
    logger.error(`Weekly challenge creation failed: ${err.message}`);
  }
}

/**
 * Start the weekly challenge scheduler.
 * Runs immediately on start, then checks every 24 hours.
 */
export function startWeeklyChallengeScheduler() {
  logger.info('🗓️  Weekly challenge scheduler started.');
  // Run once on startup after a short delay
  setTimeout(() => createWeeklyChallenge(), 5000);
  // Then check daily
  setInterval(() => createWeeklyChallenge(), ONE_DAY_MS);
}

export default { startWeeklyChallengeScheduler };
