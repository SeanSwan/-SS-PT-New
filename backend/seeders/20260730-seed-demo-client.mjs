/**
 * Demo Client Sandbox Seeder — Workout-OS C8a (2026-07-30)
 * =========================================================
 * Creates ONE shared sandbox client with ~90 days of realistic training
 * data so every chart, ring, and history surface renders in demos. The
 * exclusions ride EXISTING classifiers — zero runtime code:
 *   billing-proof:  clientSource 'external' → isNonDeductingClient (locked)
 *   nudge-proof:    notificationPreferences.workoutReminders = false
 *   self-watermark: display name "Demo Client (Sandbox)" appears wherever
 *                   the client is listed — no watermark UI needed.
 * Data lands in the CANONICAL backbone (workout_sessions + workout_logs),
 * which the 15 chart endpoints and the rings read.
 *
 * Run:    node backend/seeders/20260730-seed-demo-client.mjs
 * Reset:  FORCE_RESEED=true node backend/seeders/20260730-seed-demo-client.mjs
 *         (wipes ONLY the demo user's workout rows, then re-seeds)
 * Idempotent without the flag: exits if the demo user already has sessions.
 */
import { randomUUID } from 'node:crypto';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';

const DEMO_EMAIL = 'demo-client@swanstudios.internal';
const DEMO_USERNAME = 'swan-demo-client';
const DAYS_BACK = 90;

const SPLITS = [
  { label: 'Push Day', exercises: [['Barbell Bench Press', 95], ['Overhead Press', 65], ['Cable Crossover', 40], ['Plank', 0]] },
  { label: 'Pull Day', exercises: [['Lat Pulldown', 90], ['Seated Row', 85], ['Bicep Curl', 30], ['Dead Bug', 0]] },
  { label: 'Leg Day', exercises: [['Goblet Squat', 50], ['Leg Press', 180], ['Romanian Deadlift', 95], ['Calf Raise', 90]] },
  { label: 'Full Body', exercises: [['Goblet Squat', 50], ['Pushup', 0], ['Band Row', 25], ['Plank', 0]] },
];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export async function seedDemoClient() {
  const [existing] = await sequelize.query(
    'SELECT id FROM "Users" WHERE email = :email OR username = :username LIMIT 1',
    { replacements: { email: DEMO_EMAIL, username: DEMO_USERNAME } },
  );
  let demoUserId = existing[0]?.id;

  if (!demoUserId) {
    const [rows] = await sequelize.query(
      `INSERT INTO "Users"
         (email, username, password, "firstName", "lastName", role, "clientSource",
          "notificationPreferences", "isActive", "createdAt", "updatedAt")
       VALUES
         (:email, :username, :password, 'Demo Client', '(Sandbox)', 'client', 'external',
          CAST(:prefs AS json), true, NOW(), NOW())
       RETURNING id`,
      {
        replacements: {
          email: DEMO_EMAIL,
          username: DEMO_USERNAME,
          // Random unusable secret — the sandbox is browsed BY staff, never logged into.
          password: randomUUID() + randomUUID(),
          prefs: JSON.stringify({ workoutReminders: false }),
        },
      },
    );
    demoUserId = rows[0].id;
    logger.info(`[DemoSeeder] created demo client user id=${demoUserId}`);
  }

  const [sessions] = await sequelize.query(
    'SELECT COUNT(*)::int AS count FROM workout_sessions WHERE "userId" = :id',
    { replacements: { id: demoUserId } },
  );
  if (sessions[0].count > 0) {
    if (process.env.FORCE_RESEED !== 'true') {
      logger.info(`[DemoSeeder] demo client already has ${sessions[0].count} sessions — done (FORCE_RESEED=true to reset).`);
      return { demoUserId, seeded: 0, skipped: true };
    }
    await sequelize.query(
      'DELETE FROM workout_logs WHERE "sessionId" IN (SELECT id FROM workout_sessions WHERE "userId" = :id)',
      { replacements: { id: demoUserId } },
    );
    await sequelize.query('DELETE FROM workout_sessions WHERE "userId" = :id', { replacements: { id: demoUserId } });
    logger.info('[DemoSeeder] FORCE_RESEED — cleared demo workout rows');
  }

  let seeded = 0;
  for (let daysAgo = DAYS_BACK; daysAgo >= 1; daysAgo -= rand(1, 3)) {
    const when = new Date();
    when.setDate(when.getDate() - daysAgo);
    when.setHours(rand(7, 18), rand(0, 59), 0, 0);
    const split = SPLITS[seeded % SPLITS.length];
    const progression = 1 + ((DAYS_BACK - daysAgo) / DAYS_BACK) * 0.15;
    const sessionId = randomUUID();
    const duration = rand(40, 70);

    const logs = [];
    for (const [exerciseName, baseWeight] of split.exercises) {
      const sets = rand(3, 4);
      for (let setNumber = 1; setNumber <= sets; setNumber += 1) {
        logs.push({
          exerciseName,
          setNumber,
          weight: baseWeight === 0 ? 0 : Math.round((baseWeight * progression) / 5) * 5,
          reps: rand(8, 12),
          rpe: rand(6, 9),
        });
      }
    }

    await sequelize.query(
      `INSERT INTO workout_sessions
         (id, "userId", title, date, status, duration, "totalSets", "completedAt", "createdAt", "updatedAt")
       VALUES (:id, :userId, :title, :date, 'completed', :duration, :totalSets, :date, NOW(), NOW())`,
      {
        replacements: {
          id: sessionId,
          userId: demoUserId,
          title: `${split.label} — Demo`,
          date: when.toISOString(),
          duration,
          totalSets: logs.length,
        },
      },
    );
    for (const log of logs) {
      await sequelize.query(
        `INSERT INTO workout_logs ("sessionId", "exerciseName", "setNumber", weight, reps, rpe, "createdAt", "updatedAt")
         VALUES (:sessionId, :exerciseName, :setNumber, :weight, :reps, :rpe, NOW(), NOW())`,
        { replacements: { sessionId, ...log } },
      );
    }
    seeded += 1;
  }

  logger.info(`[DemoSeeder] done — ${seeded} sessions across ~${DAYS_BACK} days for demo client ${demoUserId}.`);
  return { demoUserId, seeded, skipped: false };
}

const isDirectRun = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isDirectRun) {
  seedDemoClient()
    .then(({ seeded, skipped }) => {
      logger.info(`[DemoSeeder] complete (${skipped ? 'skipped — already seeded' : `${seeded} sessions`}).`);
      process.exit(0);
    })
    .catch((err) => {
      logger.error(`[DemoSeeder] failed: ${err.message}`);
      process.exit(1);
    });
}

export default seedDemoClient;
