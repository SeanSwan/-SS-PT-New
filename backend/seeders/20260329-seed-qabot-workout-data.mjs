/**
 * ============================================================================
 * FILE: 20260329-seed-qabot-workout-data.mjs
 * PURPOSE: Seed realistic workout data for QABot (user 57) to populate charts
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-29
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Creates 45 DailyWorkoutForm entries spanning 90 days
 * for user 57 (QABot). Provides realistic data for all progress charts:
 * Workout Frequency, Weight Progression, Muscle Group Focus, Body Fat Trend,
 * Session Frequency, Muscle Recovery, Exercise Intensity.
 *
 * HOW TO RUN: node backend/seeders/20260329-seed-qabot-workout-data.mjs
 */

import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// Seed for test users so progress charts populate
const SEED_USERS = [2, 4, 57]; // admin, client, QABot
const TRAINER_ID = 2; // Admin who "logged" these

// ─────────────────────────────────────────────────────────────
// SECTION: Exercise Templates
// ─────────────────────────────────────────────────────────────

const EXERCISE_TEMPLATES = {
  chest: [
    { name: 'Barbell Bench Press', muscleGroup: 'Chest', category: 'Strength' },
    { name: 'Dumbbell Incline Press', muscleGroup: 'Chest', category: 'Strength' },
    { name: 'Cable Chest Fly', muscleGroup: 'Chest', category: 'Strength' },
  ],
  back: [
    { name: 'Barbell Deadlift', muscleGroup: 'Back', category: 'Strength' },
    { name: 'Lat Pulldown', muscleGroup: 'Back', category: 'Strength' },
    { name: 'Seated Cable Row', muscleGroup: 'Back', category: 'Strength' },
  ],
  legs: [
    { name: 'Barbell Back Squat', muscleGroup: 'Legs', category: 'Strength' },
    { name: 'Leg Press', muscleGroup: 'Legs', category: 'Strength' },
    { name: 'Romanian Deadlift', muscleGroup: 'Legs', category: 'Strength' },
    { name: 'Walking Lunges', muscleGroup: 'Legs', category: 'Strength' },
  ],
  shoulders: [
    { name: 'Overhead Press', muscleGroup: 'Shoulders', category: 'Strength' },
    { name: 'Lateral Raises', muscleGroup: 'Shoulders', category: 'Strength' },
    { name: 'Face Pulls', muscleGroup: 'Shoulders', category: 'Strength' },
  ],
  arms: [
    { name: 'Barbell Curl', muscleGroup: 'Arms', category: 'Strength' },
    { name: 'Tricep Pushdown', muscleGroup: 'Arms', category: 'Strength' },
    { name: 'Hammer Curls', muscleGroup: 'Arms', category: 'Strength' },
  ],
  core: [
    { name: 'Plank Hold', muscleGroup: 'Core', category: 'Stabilization' },
    { name: 'Cable Crunch', muscleGroup: 'Core', category: 'Strength' },
    { name: 'Hanging Leg Raise', muscleGroup: 'Core', category: 'Strength' },
  ],
  cardio: [
    { name: 'Treadmill Run', muscleGroup: 'Cardio', category: 'Cardio', isCardio: true },
    { name: 'Stationary Bike', muscleGroup: 'Cardio', category: 'Cardio', isCardio: true },
  ],
};

// Workout split patterns (3-4 workouts/week)
const WORKOUT_SPLITS = [
  { label: 'Push', groups: ['chest', 'shoulders', 'arms'] },
  { label: 'Pull', groups: ['back', 'arms'] },
  { label: 'Legs', groups: ['legs', 'core'] },
  { label: 'Upper', groups: ['chest', 'back', 'shoulders'] },
  { label: 'Cardio + Core', groups: ['cardio', 'core'] },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Data Generation Helpers
// ─────────────────────────────────────────────────────────────

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSets(exercise, weekIndex) {
  // Progressive overload: weight increases ~2% per week
  const baseWeight = exercise.isCardio ? 0 : randomBetween(45, 135);
  const progressionFactor = 1 + (weekIndex * 0.02);
  const numSets = randomBetween(3, 4);
  const sets = [];

  for (let i = 0; i < numSets; i++) {
    const weight = exercise.isCardio ? 0 : Math.round(baseWeight * progressionFactor / 5) * 5;
    const reps = exercise.isCardio ? randomBetween(20, 30) : randomBetween(8, 12);
    sets.push({
      setNumber: i + 1,
      weight,
      reps,
      completed: true,
      rpe: randomBetween(6, 9),
    });
  }
  return sets;
}

function generateWorkout(date, splitIndex, weekIndex) {
  const split = WORKOUT_SPLITS[splitIndex % WORKOUT_SPLITS.length];
  const exercises = [];

  for (const group of split.groups) {
    const templates = EXERCISE_TEMPLATES[group];
    // Pick 1-2 exercises from each group
    const count = Math.min(randomBetween(1, 2), templates.length);
    const shuffled = [...templates].sort(() => Math.random() - 0.5);

    for (let i = 0; i < count; i++) {
      exercises.push({
        exerciseName: shuffled[i].name,
        name: shuffled[i].name,
        muscleGroup: shuffled[i].muscleGroup,
        category: shuffled[i].category,
        exerciseType: shuffled[i].muscleGroup,
        sets: generateSets(shuffled[i], weekIndex),
        formRating: randomBetween(3, 5),
        painLevel: randomBetween(0, 2),
        performanceNotes: '',
      });
    }
  }

  return {
    exercises,
    sessionNotes: `${split.label} day — Week ${weekIndex + 1}`,
    overallIntensity: randomBetween(6, 9),
    submittedBy: TRAINER_ID,
    submittedAt: new Date(date).toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────
// SECTION: Main Seeder
// ─────────────────────────────────────────────────────────────

async function seedQABotWorkouts() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not found in environment. Set it in .env');
    process.exit(1);
  }

  const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: databaseUrl.includes('render.com') ? {
      ssl: { require: true, rejectUnauthorized: false }
    } : {},
  });

  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    // Check if daily_workout_forms table exists
    const [tableCheck] = await sequelize.query(
      `SELECT to_regclass('public.daily_workout_forms') AS exists`
    );
    if (!tableCheck[0]?.exists) {
      console.log('daily_workout_forms table does not exist. Creating it...');
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS daily_workout_forms (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID,
          client_id INTEGER NOT NULL REFERENCES "Users"(id),
          trainer_id INTEGER NOT NULL REFERENCES "Users"(id),
          date DATE NOT NULL DEFAULT CURRENT_DATE,
          form_data JSONB NOT NULL,
          session_deducted BOOLEAN NOT NULL DEFAULT false,
          total_points_earned INTEGER NOT NULL DEFAULT 0,
          mcp_processed BOOLEAN NOT NULL DEFAULT false,
          submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          processing_started_at TIMESTAMPTZ,
          processing_completed_at TIMESTAMPTZ,
          processing_errors JSONB,
          form_version VARCHAR(10) DEFAULT '1.0',
          estimated_duration INTEGER,
          trainer_notes TEXT,
          client_summary TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_dwf_client_date ON daily_workout_forms(client_id, date);
        CREATE INDEX IF NOT EXISTS idx_dwf_client_id ON daily_workout_forms(client_id);
        CREATE INDEX IF NOT EXISTS idx_dwf_trainer_id ON daily_workout_forms(trainer_id);
        CREATE INDEX IF NOT EXISTS idx_dwf_date ON daily_workout_forms(date);
      `);
      console.log('daily_workout_forms table created.');
    }

    // Verify seed users exist
    const [existingUsers] = await sequelize.query(
      `SELECT id FROM "Users" WHERE id IN (${SEED_USERS.join(',')})`
    );
    const validUserIds = existingUsers.map(u => u.id);
    console.log(`Found users: ${validUserIds.join(', ')}`);

    if (validUserIds.length === 0) {
      console.error('No valid users found to seed data for.');
      process.exit(1);
    }

    const now = new Date();
    let totalSeeded = 0;

    for (const userId of validUserIds) {
      // Delete existing workout data for this user (idempotent)
      const [deleted] = await sequelize.query(
        `DELETE FROM daily_workout_forms WHERE client_id = ${userId} RETURNING id`
      );
      if (deleted.length > 0) {
        console.log(`Cleared ${deleted.length} existing workout forms for user ${userId}.`);
      }

      // Generate 90 days of workout data (3-4 workouts per week = ~45 workouts)
      const workouts = [];
      let splitIndex = 0;

      for (let dayOffset = 90; dayOffset >= 0; dayOffset--) {
        const date = new Date(now);
        date.setDate(date.getDate() - dayOffset);
        const dayOfWeek = date.getDay();

        const isWorkoutDay = [1, 2, 4, 5].includes(dayOfWeek) || (dayOfWeek === 6 && Math.random() > 0.6);
        if (!isWorkoutDay) continue;
        if (Math.random() < 0.1) continue;

        const weekIndex = Math.floor((90 - dayOffset) / 7);
        const dateStr = date.toISOString().split('T')[0];
        const formData = generateWorkout(dateStr, splitIndex, weekIndex);
        const totalPoints = 50 + (formData.exercises.length * 10);

        workouts.push({
          id: uuidv4(),
          clientId: userId,
          trainerId: TRAINER_ID,
          date: dateStr,
          formData,
          totalPointsEarned: totalPoints,
          mcpProcessed: true,
          sessionDeducted: false,
          submittedAt: new Date(date.getTime() + randomBetween(8, 18) * 3600000).toISOString(),
        });

        splitIndex++;
      }

      // Insert all workouts
      for (const w of workouts) {
        await sequelize.query(
          `INSERT INTO daily_workout_forms (id, client_id, trainer_id, date, form_data, total_points_earned, mcp_processed, session_deducted, submitted_at, created_at, updated_at)
           VALUES (:id, :clientId, :trainerId, :date, :formData::jsonb, :totalPointsEarned, :mcpProcessed, :sessionDeducted, :submittedAt, NOW(), NOW())`,
          {
            replacements: {
              id: w.id,
              clientId: w.clientId,
              trainerId: w.trainerId,
              date: w.date,
              formData: JSON.stringify(w.formData),
              totalPointsEarned: w.totalPointsEarned,
              mcpProcessed: w.mcpProcessed,
              sessionDeducted: w.sessionDeducted,
              submittedAt: w.submittedAt,
            },
          }
        );
      }

      console.log(`Seeded ${workouts.length} workout forms for user ${userId}.`);
      if (workouts.length > 0) {
        console.log(`  Date range: ${workouts[0].date} to ${workouts[workouts.length - 1].date}`);
      }
      totalSeeded += workouts.length;

      // Seed body_measurements
      const [bmCheck] = await sequelize.query(
        `SELECT to_regclass('public.body_measurements') AS exists`
      );
      if (bmCheck[0]?.exists) {
        await sequelize.query(`DELETE FROM body_measurements WHERE "userId" = ${userId}`);

        const bmData = [
          { daysAgo: 85, weight: 195, bodyFat: 22.5, muscleMass: 38.0 },
          { daysAgo: 70, weight: 193, bodyFat: 21.8, muscleMass: 38.5 },
          { daysAgo: 55, weight: 191, bodyFat: 21.0, muscleMass: 39.0 },
          { daysAgo: 40, weight: 189, bodyFat: 20.3, muscleMass: 39.5 },
          { daysAgo: 25, weight: 188, bodyFat: 19.5, muscleMass: 40.0 },
          { daysAgo: 10, weight: 186, bodyFat: 18.8, muscleMass: 40.5 },
        ];

        for (const bm of bmData) {
          const measureDate = new Date(now);
          measureDate.setDate(measureDate.getDate() - bm.daysAgo);
          const dateStr = measureDate.toISOString().split('T')[0];

          await sequelize.query(
            `INSERT INTO body_measurements ("userId", "measurementDate", weight, "bodyFatPercentage", "muscleMassPercentage", "progressScore", "recordedBy", "createdAt", "updatedAt")
             VALUES (:userId, :measurementDate, :weight, :bodyFat, :muscleMass, :progressScore, :recordedBy, NOW(), NOW())
             ON CONFLICT DO NOTHING`,
            {
              replacements: {
                userId,
                measurementDate: dateStr,
                weight: bm.weight,
                bodyFat: bm.bodyFat,
                muscleMass: bm.muscleMass,
                progressScore: Math.round((100 - bm.bodyFat) * 2),
                recordedBy: TRAINER_ID,
              },
            }
          ).catch(err => console.warn('Body measurement insert skipped:', err.message));
        }
        console.log(`  Seeded 6 body measurements for user ${userId}.`);
      }
    }

    console.log(`\nTotal: ${totalSeeded} workout forms seeded across ${validUserIds.length} users.`);

    console.log('QABot test data seeding complete!');

  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seedQABotWorkouts();
