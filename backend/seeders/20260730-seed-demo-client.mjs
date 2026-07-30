/**
 * Demo Client Sandbox Seeder — Workout-OS C8a (2026-07-30, R3 hostile fix)
 * =========================================================================
 * Creates ONE shared sandbox client with ~90 days of realistic training
 * data so every chart, ring, and history surface renders in demos.
 * Exclusions ride EXISTING classifiers — zero runtime code:
 *   billing-proof:  clientSource 'external' → isNonDeductingClient (locked)
 *   nudge-proof:    notificationPreferences.workoutReminders = false
 *   self-watermark: display name "Demo Client (Sandbox)".
 * R3 fix: creation goes through the MODELS (not raw SQL) so NOT-NULL
 * columns receive their model defaults and the password-hashing hook runs —
 * a raw INSERT omitted required banner/total columns and would have failed
 * on prod. Totals are computed truthfully from the generated sets.
 *
 * Run:    node backend/seeders/20260730-seed-demo-client.mjs
 * Reset:  FORCE_RESEED=true node backend/seeders/20260730-seed-demo-client.mjs
 */
import { randomUUID } from 'node:crypto';
import '../models/index.mjs';
import { getUser, getWorkoutSession, getWorkoutLog } from '../models/index.mjs';
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
  const User = getUser();
  const WorkoutSession = getWorkoutSession();
  const WorkoutLog = getWorkoutLog();

  let demoUser = await User.findOne({ where: { email: DEMO_EMAIL }, attributes: ['id'] });
  if (!demoUser) {
    // Model path: defaults fill required columns; the hash hook makes the
    // random password unusable-but-hashed. The sandbox is never logged into.
    demoUser = await User.create({
      email: DEMO_EMAIL,
      username: DEMO_USERNAME,
      password: randomUUID() + randomUUID(),
      firstName: 'Demo Client',
      lastName: '(Sandbox)',
      role: 'client',
      clientSource: 'external',
      notificationPreferences: { workoutReminders: false },
      isActive: true,
    });
    logger.info(`[DemoSeeder] created demo client user id=${demoUser.id}`);
  }
  const demoUserId = demoUser.id;

  const existingCount = await WorkoutSession.count({ where: { userId: demoUserId } });
  if (existingCount > 0) {
    if (process.env.FORCE_RESEED !== 'true') {
      logger.info(`[DemoSeeder] demo client already has ${existingCount} sessions — done (FORCE_RESEED=true to reset).`);
      return { demoUserId, seeded: 0, skipped: true };
    }
    const sessions = await WorkoutSession.findAll({ where: { userId: demoUserId }, attributes: ['id'] });
    await WorkoutLog.destroy({ where: { sessionId: sessions.map((s) => s.id) } });
    await WorkoutSession.destroy({ where: { userId: demoUserId } });
    logger.info('[DemoSeeder] FORCE_RESEED — cleared demo workout rows');
  }

  let seeded = 0;
  for (let daysAgo = DAYS_BACK; daysAgo >= 1; daysAgo -= rand(1, 3)) {
    const when = new Date();
    when.setDate(when.getDate() - daysAgo);
    when.setHours(rand(7, 18), rand(0, 59), 0, 0);
    const split = SPLITS[seeded % SPLITS.length];
    const progression = 1 + ((DAYS_BACK - daysAgo) / DAYS_BACK) * 0.15;

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
    const totals = logs.reduce(
      (acc, log) => ({
        sets: acc.sets + 1,
        reps: acc.reps + log.reps,
        weight: acc.weight + log.weight * log.reps,
      }),
      { sets: 0, reps: 0, weight: 0 },
    );

    const session = await WorkoutSession.create({
      userId: demoUserId,
      title: `${split.label} — Demo`,
      date: when,
      status: 'completed',
      duration: rand(40, 70),
      totalSets: totals.sets,
      totalReps: totals.reps,
      totalWeight: totals.weight,
      completedAt: when,
    });
    await WorkoutLog.bulkCreate(logs.map((log) => ({ ...log, sessionId: session.id })));
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
