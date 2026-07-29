/**
 * Workout Badges Seeder — Workout-OS C3 (2026-07-29)
 * ===================================================
 * The "Badges" table ships EMPTY by design (admin-created content), which is
 * one of the two reasons badges could never be earned (the other — no award
 * call site — is fixed by fireWorkoutBadgeChecks). This seeds the five
 * launch badges whose criteria the CURRENT evaluator provably satisfies from
 * real workout saves (streak_achievement × 4 + exercise_completion × 1).
 * Lifetime workout-count badges are DEFERRED — they need a criteriaType enum
 * migration (no 'workout_count' type exists).
 *
 * Run:   node backend/seeders/20260729-seed-workout-badges.mjs
 * Idempotent: inserts only badges whose name is not already present.
 * Requires: at least one admin user (Badges.createdBy is NOT NULL → "Users").
 */
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';

const BADGES = [
  {
    name: '3-Day Spark',
    description: 'Logged workouts three days running. The habit is catching.',
    category: 'general',
    difficulty: 'beginner',
    criteriaType: 'streak_achievement',
    criteria: { days: 3 },
    rewards: { points: 100 },
  },
  {
    name: '7-Day Wingbeat',
    description: 'A full week of training logged without breaking the chain.',
    category: 'general',
    difficulty: 'beginner',
    criteriaType: 'streak_achievement',
    criteria: { days: 7 },
    rewards: { points: 250 },
  },
  {
    name: '14-Day Glide',
    description: 'Two straight weeks of logged work. Momentum is real.',
    category: 'endurance',
    difficulty: 'intermediate',
    criteriaType: 'streak_achievement',
    criteria: { days: 14 },
    rewards: { points: 500 },
  },
  {
    name: '30-Day Ascent',
    description: 'Thirty consecutive training days. Rare air.',
    category: 'endurance',
    difficulty: 'advanced',
    criteriaType: 'streak_achievement',
    criteria: { days: 30 },
    rewards: { points: 1000 },
  },
  {
    name: 'Full-Session Swan',
    description: 'Six or more exercises logged in a single session.',
    category: 'strength',
    difficulty: 'intermediate',
    criteriaType: 'exercise_completion',
    criteria: { count: 6 },
    rewards: { points: 150 },
  },
];

export async function seedWorkoutBadges() {
  const [admins] = await sequelize.query(
    `SELECT id FROM "Users" WHERE role = 'admin' ORDER BY "createdAt" ASC LIMIT 1`,
  );
  if (!admins.length) {
    throw new Error('No admin user found — Badges.createdBy requires one. Aborting (nothing written).');
  }
  const createdBy = admins[0].id;

  let inserted = 0;
  for (const badge of BADGES) {
    const [result] = await sequelize.query(
      `INSERT INTO "Badges"
         (id, name, description, category, difficulty, "criteriaType", criteria, rewards, "isActive", "createdBy", "createdAt", "updatedAt")
       SELECT gen_random_uuid(), :name, :description, :category, :difficulty, :criteriaType,
              CAST(:criteria AS json), CAST(:rewards AS json), true, :createdBy, NOW(), NOW()
       WHERE NOT EXISTS (SELECT 1 FROM "Badges" WHERE name = :name)
       RETURNING id`,
      {
        replacements: {
          ...badge,
          criteria: JSON.stringify(badge.criteria),
          rewards: JSON.stringify(badge.rewards),
          createdBy,
        },
      },
    );
    if (result.length) {
      inserted += 1;
      logger.info(`[BadgeSeeder] inserted "${badge.name}"`);
    } else {
      logger.info(`[BadgeSeeder] "${badge.name}" already present — skipped`);
    }
  }
  logger.info(`[BadgeSeeder] done — ${inserted} inserted, ${BADGES.length - inserted} already present.`);
  return { inserted, total: BADGES.length };
}

const isDirectRun = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isDirectRun) {
  seedWorkoutBadges()
    .then(({ inserted, total }) => {
      logger.info(`[BadgeSeeder] complete: ${inserted}/${total} new.`);
      process.exit(0);
    })
    .catch((err) => {
      logger.error(`[BadgeSeeder] failed: ${err.message}`);
      process.exit(1);
    });
}

export default seedWorkoutBadges;
