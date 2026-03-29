'use strict';

/**
 * Seed Test Workout History
 * =========================
 * Creates 30 days of workout history for user ID 61 (Jackie - first test client)
 * so that charts, progress tracking, and analytics have data to display.
 *
 * Exercises chosen from the seeded NASM Rolodex. Each workout has 4-6 exercises
 * with realistic sets, reps, weights, and form ratings.
 */

const { v4: uuidv4 } = require('uuid');

// Common exercises for each day type
const PUSH_EXERCISES = [
  { name: 'Barbell Bench Press', type: 'Strength Training', muscles: ['Chest', 'Triceps', 'Shoulders'] },
  { name: 'Dumbbell Shoulder Press', type: 'Strength Training', muscles: ['Shoulders', 'Triceps'] },
  { name: 'Incline Dumbbell Press', type: 'Strength Training', muscles: ['Chest', 'Shoulders'] },
  { name: 'Tricep Pushdown', type: 'Strength Training', muscles: ['Triceps'] },
  { name: 'Lateral Raise', type: 'Strength Training', muscles: ['Shoulders'] },
  { name: 'Push-Up', type: 'Calisthenics', muscles: ['Chest', 'Triceps'] },
];

const PULL_EXERCISES = [
  { name: 'Barbell Deadlift', type: 'Strength Training', muscles: ['Back', 'Hamstrings', 'Glutes'] },
  { name: 'Lat Pulldown', type: 'Strength Training', muscles: ['Back', 'Biceps'] },
  { name: 'Seated Cable Row', type: 'Strength Training', muscles: ['Back'] },
  { name: 'Dumbbell Bicep Curl', type: 'Strength Training', muscles: ['Biceps'] },
  { name: 'Face Pull', type: 'Strength Training', muscles: ['Shoulders', 'Back'] },
  { name: 'Barbell Row', type: 'Strength Training', muscles: ['Back'] },
];

const LEG_EXERCISES = [
  { name: 'Barbell Back Squat', type: 'Strength Training', muscles: ['Quadriceps', 'Glutes'] },
  { name: 'Romanian Deadlift', type: 'Strength Training', muscles: ['Hamstrings', 'Glutes'] },
  { name: 'Leg Press', type: 'Strength Training', muscles: ['Quadriceps', 'Glutes'] },
  { name: 'Walking Lunges', type: 'Strength Training', muscles: ['Quadriceps', 'Glutes'] },
  { name: 'Leg Curl', type: 'Strength Training', muscles: ['Hamstrings'] },
  { name: 'Calf Raise', type: 'Strength Training', muscles: ['Calves'] },
];

const CORE_EXERCISES = [
  { name: 'Plank', type: 'Core', muscles: ['Core', 'Abs'] },
  { name: 'Cable Woodchop', type: 'Core', muscles: ['Core', 'Obliques'] },
  { name: 'Russian Twist', type: 'Core', muscles: ['Obliques'] },
];

function generateSets(exerciseName, dayOffset) {
  const numSets = 3 + Math.floor(Math.random() * 2); // 3-4 sets
  const sets = [];
  // Progressive overload simulation — weight increases slightly over days
  const baseWeight = exerciseName.includes('Squat') ? 135 : exerciseName.includes('Deadlift') ? 185 :
    exerciseName.includes('Bench') ? 135 : exerciseName.includes('Press') ? 95 :
    exerciseName.includes('Row') ? 115 : exerciseName.includes('Curl') ? 30 :
    exerciseName.includes('Plank') ? 0 : 45;

  const progressionWeight = Math.floor(baseWeight + (dayOffset * 0.5));

  for (let i = 1; i <= numSets; i++) {
    sets.push({
      setNumber: i,
      weight: progressionWeight > 0 ? progressionWeight : null,
      reps: 8 + Math.floor(Math.random() * 5), // 8-12 reps
      rpe: 6 + Math.floor(Math.random() * 4), // RPE 6-9
      tempo: '2/0/2',
      restPeriod: 60,
      formRating: 3 + Math.floor(Math.random() * 3), // 3-5 form rating
      completed: true,
    });
  }
  return sets;
}

function buildFormData(exercises, dayOffset) {
  return {
    exercises: exercises.map((ex, idx) => ({
      exerciseId: `seed-${idx}`,
      exerciseName: ex.name,
      exerciseType: ex.type,
      primaryMuscles: ex.muscles,
      sets: generateSets(ex.name, dayOffset),
      notes: '',
      painLevel: 0,
    })),
    sessionNotes: 'Great workout session. Client showed good form and energy.',
    clientMood: ['Energetic', 'Focused', 'Determined'][Math.floor(Math.random() * 3)],
    overallDifficulty: 6 + Math.floor(Math.random() * 3),
  };
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const CLIENT_USER_ID = 61; // Jackie — first test client
    const TRAINER_USER_ID = 1; // Admin/trainer

    // Check if DailyWorkoutForms table exists
    try {
      await queryInterface.sequelize.query('SELECT 1 FROM "DailyWorkoutForms" LIMIT 1');
    } catch {
      console.log('DailyWorkoutForms table does not exist yet — skipping workout history seed');
      return;
    }

    // Check if we already have data for this client
    const [existing] = await queryInterface.sequelize.query(
      `SELECT COUNT(*) as count FROM "DailyWorkoutForms" WHERE "userId" = ${CLIENT_USER_ID}`
    );
    if (existing[0]?.count > 5) {
      console.log(`Client ${CLIENT_USER_ID} already has ${existing[0].count} workout forms — skipping seed`);
      return;
    }

    const workouts = [];
    const now = new Date();
    const dayTypes = [PUSH_EXERCISES, PULL_EXERCISES, LEG_EXERCISES];

    // Generate 30 days of workout history (skip some days for realism)
    for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
      // Skip some days (weekends, rest days) for realistic pattern
      if (Math.random() < 0.35) continue;

      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      date.setHours(9 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0, 0);

      // Rotate push/pull/legs
      const dayType = dayTypes[dayOffset % 3];
      // Pick 4-5 exercises + 1-2 core
      const exerciseCount = 4 + Math.floor(Math.random() * 2);
      const selectedExercises = dayType.slice(0, exerciseCount);
      const coreCount = 1 + Math.floor(Math.random() * 2);
      const selectedCore = CORE_EXERCISES.slice(0, coreCount);
      const allExercises = [...selectedExercises, ...selectedCore];

      const formData = buildFormData(allExercises, 30 - dayOffset);
      const duration = 45 + Math.floor(Math.random() * 30); // 45-75 min

      workouts.push({
        userId: CLIENT_USER_ID,
        trainerId: TRAINER_USER_ID,
        formData: JSON.stringify(formData),
        sessionDate: date,
        sessionType: 'in_person',
        status: 'completed',
        duration,
        caloriesBurned: Math.floor(duration * 7.5 + Math.random() * 100),
        exerciseCount: allExercises.length,
        totalSets: allExercises.length * 3,
        sessionDeducted: true,
        notes: formData.sessionNotes,
        createdAt: date,
        updatedAt: date,
      });
    }

    if (workouts.length > 0) {
      await queryInterface.bulkInsert('DailyWorkoutForms', workouts);
      console.log(`✅ Seeded ${workouts.length} workout forms for client ${CLIENT_USER_ID}`);
    }

    // Also seed ProgressData entries for gamification/insights
    try {
      await queryInterface.sequelize.query('SELECT 1 FROM "ProgressData" LIMIT 1');

      const progressEntries = [];
      let cumulativeXp = 500; // Start with some base XP
      let streak = 0;

      for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
        const date = new Date(now);
        date.setDate(date.getDate() - dayOffset);

        const didWorkout = workouts.some(w => {
          const wDate = new Date(w.sessionDate);
          return wDate.toDateString() === date.toDateString();
        });

        if (didWorkout) {
          streak++;
          cumulativeXp += 50 + Math.floor(Math.random() * 30);
        } else {
          streak = 0;
        }

        progressEntries.push({
          userId: CLIENT_USER_ID,
          date: date,
          xpGained: didWorkout ? 50 + Math.floor(Math.random() * 30) : 0,
          totalXp: cumulativeXp,
          level: Math.floor(0.1 * Math.sqrt(cumulativeXp)),
          workoutsCompleted: didWorkout ? 1 : 0,
          exercisesCompleted: didWorkout ? 5 + Math.floor(Math.random() * 3) : 0,
          caloriesBurned: didWorkout ? 300 + Math.floor(Math.random() * 200) : 0,
          workoutDuration: didWorkout ? 45 + Math.floor(Math.random() * 30) : 0,
          currentStreak: streak,
          longestStreak: Math.max(streak, 7),
          consistencyScore: Math.min(100, Math.floor((streak / 7) * 100)),
          createdAt: date,
          updatedAt: date,
        });
      }

      // Check for existing progress data
      const [existingProgress] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM "ProgressData" WHERE "userId" = ${CLIENT_USER_ID}`
      );
      if (!existingProgress[0]?.count || existingProgress[0].count < 5) {
        await queryInterface.bulkInsert('ProgressData', progressEntries);
        console.log(`✅ Seeded ${progressEntries.length} progress entries for client ${CLIENT_USER_ID}`);
      }
    } catch (err) {
      console.log('ProgressData table not available — skipping progress seed:', err.message);
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('DailyWorkoutForms', { userId: 61 });
    try {
      await queryInterface.bulkDelete('ProgressData', { userId: 61 });
    } catch { /* table may not exist */ }
  }
};
