/**
 * Test Client Seed
 * ─────────────────────────────────────────────────────────────
 * Creates/updates a realistic test client for end-to-end AI pipeline validation.
 *
 * Profile: 55yo male, heart medication (Lisinopril), weight loss goal,
 *          left knee pain, moderate health risk — triggers conservative AI programming.
 *
 * Uses upsert/findOrCreate pattern — safe to re-run.
 *
 * Phase 11G — Test Client Seed
 */
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const TEST_EMAIL = 'client@swanstudios.com';
const TEST_USERNAME = 'testclient';

export async function up(queryInterface) {
  const now = new Date();

  // ─── 1. Create or update User ─────────────────────────────────

  // Check if user exists
  const [existingUsers] = await queryInterface.sequelize.query(
    `SELECT id FROM "Users" WHERE email = :email LIMIT 1`,
    { replacements: { email: TEST_EMAIL } }
  );

  let userId;
  const hashedPassword = await bcrypt.hash('TestClient123!', 10);

  if (existingUsers.length > 0) {
    userId = existingUsers[0].id;
    // Update existing user
    await queryInterface.sequelize.query(
      `UPDATE "Users" SET
        "firstName" = 'Michael', "lastName" = 'Thompson',
        "phone" = '555-0199', role = 'client',
        "dateOfBirth" = '1971-03-15', gender = 'male',
        weight = 220, height = 70,
        "fitnessGoal" = 'weight_loss',
        "trainingExperience" = 'Intermittent gym goer for past 5 years. Mostly machines and treadmill. No structured program.',
        "healthConcerns" = 'Lisinopril 10mg daily for hypertension. Left knee pain (meniscus wear). Pre-diabetic A1C 5.9.',
        "emergencyContact" = 'Susan Thompson (wife) 555-0198',
        "availableSessions" = 12,
        "isActive" = true, "isOnboardingComplete" = true,
        "lastFullMeasurementDate" = :lastMeasDate,
        "lastWeighInDate" = :lastWeighDate,
        "measurementIntervalDays" = 30,
        "weighInIntervalDays" = 7,
        "spiritName" = 'Silver Elk',
        "updatedAt" = :now
      WHERE id = :userId`,
      {
        replacements: {
          userId,
          now,
          lastMeasDate: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
          lastWeighDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        }
      }
    );
    console.log(`  Updated existing test client (id: ${userId})`);
  } else {
    // Create new user
    await queryInterface.bulkInsert('"Users"', [{
      firstName: 'Michael',
      lastName: 'Thompson',
      email: TEST_EMAIL,
      username: TEST_USERNAME,
      password: hashedPassword,
      phone: '555-0199',
      role: 'client',
      dateOfBirth: '1971-03-15',
      gender: 'male',
      weight: 220,
      height: 70,
      fitnessGoal: 'weight_loss',
      trainingExperience: 'Intermittent gym goer for past 5 years. Mostly machines and treadmill. No structured program.',
      healthConcerns: 'Lisinopril 10mg daily for hypertension. Left knee pain (meniscus wear). Pre-diabetic A1C 5.9.',
      emergencyContact: 'Susan Thompson (wife) 555-0198',
      availableSessions: 12,
      isActive: true,
      isOnboardingComplete: true,
      lastFullMeasurementDate: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
      lastWeighInDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      measurementIntervalDays: 30,
      weighInIntervalDays: 7,
      spiritName: 'Silver Elk',
      points: 450,
      level: 3,
      tier: 'silver',
      streakDays: 5,
      totalWorkouts: 6,
      forcePasswordChange: false,
      createdAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      updatedAt: now,
    }]);

    const [newUsers] = await queryInterface.sequelize.query(
      `SELECT id FROM "Users" WHERE email = :email LIMIT 1`,
      { replacements: { email: TEST_EMAIL } }
    );
    userId = newUsers[0].id;
    console.log(`  Created test client (id: ${userId})`);
  }

  // ─── 2. Master Prompt JSON ────────────────────────────────────

  const masterPromptJson = {
    version: '3.0',
    clientProfile: {
      alias: 'Silver Elk',
      age: 55,
      gender: 'male',
      heightInches: 70,
      weightLbs: 220,
      bmi: 31.6,
    },
    goals: {
      primary: 'weight_loss',
      secondary: ['improve_cardiovascular_health', 'reduce_joint_pain'],
      targetWeightLbs: 195,
      timelineWeeks: 24,
    },
    medical: {
      medications: ['blood_pressure_medication'],
      conditions: ['hypertension', 'pre_diabetes', 'knee_pain_left'],
      clearanceRequired: true,
      restrictions: ['avoid_high_impact', 'monitor_heart_rate'],
    },
    training: {
      experienceLevel: 'intermediate',
      frequency: 3,
      preferredDuration: 45,
      availableEquipment: ['dumbbells', 'cables', 'machines', 'treadmill', 'stationary_bike'],
      preferredExerciseTypes: ['compound', 'core', 'flexibility'],
      dislikes: ['burpees', 'box_jumps'],
    },
    nutritionSummary: {
      approach: 'caloric_deficit',
      estimatedDailyCalories: 2200,
      proteinGoalGrams: 165,
    },
  };

  await queryInterface.sequelize.query(
    `UPDATE "Users" SET "masterPromptJson" = :masterPromptJson, "updatedAt" = :now WHERE id = :userId`,
    { replacements: { masterPromptJson: JSON.stringify(masterPromptJson), now, userId } }
  );

  // ─── 3. Onboarding Questionnaire ─────────────────────────────

  const [existingOnboarding] = await queryInterface.sequelize.query(
    `SELECT id FROM "ClientOnboardingQuestionnaires" WHERE "userId" = :userId LIMIT 1`,
    { replacements: { userId } }
  );

  const responsesJson = {
    q1_primary_goal: 'weight_loss',
    q2_secondary_goals: ['improve_cardiovascular_health', 'reduce_joint_pain'],
    q3_exercise_frequency: 3,
    q4_training_experience: 'intermediate',
    q5_medications: 'Lisinopril 10mg daily',
    q6_health_conditions: 'Hypertension, pre-diabetic A1C 5.9, left knee meniscus wear',
    q7_pain_areas: ['left_knee'],
    q8_exercise_preferences: ['strength_training', 'walking', 'swimming'],
    q9_exercise_dislikes: ['high_impact', 'jumping'],
    q10_available_days: ['monday', 'wednesday', 'friday'],
  };

  if (existingOnboarding.length === 0) {
    await queryInterface.bulkInsert('"ClientOnboardingQuestionnaires"', [{
      userId,
      questionnaireVersion: '3.0',
      status: 'completed',
      responsesJson: JSON.stringify(responsesJson),
      primaryGoal: 'weight_loss',
      trainingTier: 'intermediate',
      commitmentLevel: 7,
      healthRisk: 'moderate',
      nutritionPrefs: JSON.stringify({ approach: 'caloric_deficit', restrictions: [] }),
      completedAt: new Date(now.getTime() - 85 * 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    }]);
    console.log('  Created onboarding questionnaire');
  }

  // ─── 4. Baseline Measurements (NASM) ──────────────────────────

  const [existingBaseline] = await queryInterface.sequelize.query(
    `SELECT id FROM "client_baseline_measurements" WHERE "userId" = :userId LIMIT 1`,
    { replacements: { userId } }
  );

  if (existingBaseline.length === 0) {
    await queryInterface.bulkInsert('"client_baseline_measurements"', [{
      userId,
      takenAt: new Date(now.getTime() - 85 * 24 * 60 * 60 * 1000),
      restingHeartRate: 78,
      bloodPressureSystolic: 138,
      bloodPressureDiastolic: 88,
      bodyFatPercentage: 32.0,
      plankDuration: 25,
      benchPressWeight: 135,
      benchPressReps: 8,
      squatWeight: 155,
      squatReps: 8,
      pullUpsReps: 2,
      pullUpsAssisted: true,
      injuryNotes: 'Left knee: meniscus wear, occasional clicking. No acute injury. Can squat to parallel with discomfort below parallel.',
      painLevel: 3,
      nasmAssessmentScore: 55,
      medicalClearanceRequired: true,
      parqScreening: JSON.stringify({
        q1_heart_condition: false,
        q2_chest_pain_activity: false,
        q3_chest_pain_rest: false,
        q4_dizziness: false,
        q5_bone_joint: true, // flagged — knee pain
        q6_medications: true, // flagged — Lisinopril
        q7_other_reason: false,
        clearance: false,
        notes: 'Q5 and Q6 flagged. Medical clearance obtained from Dr. Shah 2025-12-10.',
      }),
      overheadSquatAssessment: JSON.stringify({
        ankleComplex: { compensation: 'feet_turn_out', severity: 'mild' },
        kneeComplex: { compensation: 'knee_valgus', severity: 'moderate' },
        lphc: { compensation: 'forward_lean', severity: 'moderate' },
        shoulderComplex: { compensation: 'arms_fall_forward', severity: 'mild' },
        headCervical: { compensation: 'none', severity: 'none' },
        overallScore: 55,
        notes: 'Moderate knee valgus bilateral, more pronounced on left. Forward lean likely compensating for ankle dorsiflexion limitation.',
      }),
      correctiveExerciseStrategy: JSON.stringify({
        inhibit: [
          { muscle: 'TFL/IT Band', exercise: 'Foam Roll IT Band', duration: '30s each side' },
          { muscle: 'Gastrocnemius/Soleus', exercise: 'Foam Roll Calves', duration: '30s each side' },
        ],
        lengthen: [
          { muscle: 'Hip Flexors', exercise: 'Half-Kneeling Hip Flexor Stretch', duration: '30s each side' },
          { muscle: 'Calves', exercise: 'Wall Calf Stretch', duration: '30s each side' },
        ],
        activate: [
          { muscle: 'Gluteus Medius', exercise: 'Banded Clamshell', reps: '15 each side' },
          { muscle: 'Vastus Medialis (VMO)', exercise: 'Terminal Knee Extension', reps: '15 each side' },
        ],
        integrate: [
          { pattern: 'Single-Leg Balance', exercise: 'Single-Leg Romanian Deadlift', reps: '8 each side' },
        ],
      }),
      notes: 'Medical clearance obtained from Dr. Raj Shah (cardiologist) on 2025-12-10. Cleared for moderate-intensity exercise with HR monitoring. Avoid exercises that significantly raise BP. Monitor for dizziness or chest pain.',
      createdAt: new Date(now.getTime() - 85 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    }]);
    console.log('  Created NASM baseline measurements');
  }

  // ─── 5. Body Measurements (3 months history) ─────────────────

  const [existingBodyMeasurements] = await queryInterface.sequelize.query(
    `SELECT COUNT(*) as count FROM "body_measurements" WHERE "userId" = :userId`,
    { replacements: { userId } }
  );

  if (parseInt(existingBodyMeasurements[0].count) === 0) {
    const bodyMeasurements = [
      // Month 1 (90 days ago) — initial full measurement
      {
        userId, recordedBy: userId,
        measurementDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        weight: 235, weightUnit: 'lbs', bodyFatPercentage: 32.0, bmi: 33.7,
        circumferenceUnit: 'inches',
        neck: 17.5, shoulders: 52, chest: 46, naturalWaist: 42, umbilicus: 44, hips: 44,
        rightBicep: 15, leftBicep: 14.5, rightThigh: 26, leftThigh: 25.5, rightCalf: 16, leftCalf: 15.5,
        notes: 'Initial measurement — starting the program.',
        measurementMethod: 'manual_tape', isVerified: true,
        comparisonData: JSON.stringify({}), photoUrls: JSON.stringify([]),
        createdAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), updatedAt: now,
      },
      // Month 2 (60 days ago)
      {
        userId, recordedBy: userId,
        measurementDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        weight: 228, weightUnit: 'lbs', bodyFatPercentage: 30.5, bmi: 32.7,
        circumferenceUnit: 'inches',
        neck: 17.0, shoulders: 51.5, chest: 45, naturalWaist: 40.5, umbilicus: 42.5, hips: 43.5,
        rightBicep: 15, leftBicep: 14.5, rightThigh: 25.5, leftThigh: 25, rightCalf: 16, leftCalf: 15.5,
        notes: 'Good progress — 7 lbs down, waist reducing.',
        measurementMethod: 'manual_tape', isVerified: true,
        comparisonData: JSON.stringify({}), photoUrls: JSON.stringify([]),
        createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000), updatedAt: now,
      },
      // Month 3 / most recent full (25 days ago)
      {
        userId, recordedBy: userId,
        measurementDate: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
        weight: 220, weightUnit: 'lbs', bodyFatPercentage: 29.0, bmi: 31.6,
        circumferenceUnit: 'inches',
        neck: 16.5, shoulders: 51, chest: 44, naturalWaist: 39, umbilicus: 41, hips: 43,
        rightBicep: 15.5, leftBicep: 15, rightThigh: 25, leftThigh: 24.5, rightCalf: 16, leftCalf: 15.5,
        notes: '15 lbs total lost. Waist down 3 inches. Biceps actually increased slightly — muscle gain!',
        measurementMethod: 'manual_tape', isVerified: true,
        comparisonData: JSON.stringify({}), photoUrls: JSON.stringify([]),
        createdAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000), updatedAt: now,
      },
      // Weekly weigh-ins (weight only)
      {
        userId, recordedBy: userId,
        measurementDate: new Date(now.getTime() - 19 * 24 * 60 * 60 * 1000),
        weight: 222, weightUnit: 'lbs', circumferenceUnit: 'inches',
        notes: 'Weekly weigh-in — slight bounce after weekend.',
        measurementMethod: 'smart_scale', isVerified: false,
        comparisonData: JSON.stringify({}), photoUrls: JSON.stringify([]),
        createdAt: new Date(now.getTime() - 19 * 24 * 60 * 60 * 1000), updatedAt: now,
      },
      {
        userId, recordedBy: userId,
        measurementDate: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
        weight: 221, weightUnit: 'lbs', circumferenceUnit: 'inches',
        notes: 'Weekly weigh-in — back on track.',
        measurementMethod: 'smart_scale', isVerified: false,
        comparisonData: JSON.stringify({}), photoUrls: JSON.stringify([]),
        createdAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000), updatedAt: now,
      },
      {
        userId, recordedBy: userId,
        measurementDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        weight: 220, weightUnit: 'lbs', circumferenceUnit: 'inches',
        notes: 'Weekly weigh-in — holding steady at 220.',
        measurementMethod: 'smart_scale', isVerified: false,
        comparisonData: JSON.stringify({}), photoUrls: JSON.stringify([]),
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), updatedAt: now,
      },
    ];

    await queryInterface.bulkInsert('"body_measurements"', bodyMeasurements);
    console.log(`  Created ${bodyMeasurements.length} body measurements`);
  }

  // ─── 6. Workout Sessions ──────────────────────────────────────

  const [existingSessions] = await queryInterface.sequelize.query(
    `SELECT COUNT(*) as count FROM "WorkoutSessions" WHERE "userId" = :userId`,
    { replacements: { userId } }
  );

  if (parseInt(existingSessions[0].count) === 0) {
    const sessions = [
      {
        id: uuidv4(), userId, title: 'Stabilization Endurance Day 1',
        date: new Date(now.getTime() - 80 * 24 * 60 * 60 * 1000),
        duration: 40, intensity: 5, status: 'completed',
        completedAt: new Date(now.getTime() - 80 * 24 * 60 * 60 * 1000),
        totalWeight: 2400, totalReps: 120, totalSets: 12, avgRPE: 5.5,
        notes: 'First session — focused on form and baseline assessment.',
        sessionType: 'trainer-led', experiencePoints: 50,
        createdAt: new Date(now.getTime() - 80 * 24 * 60 * 60 * 1000), updatedAt: now,
      },
      {
        id: uuidv4(), userId, title: 'Stabilization Endurance Day 2',
        date: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000),
        duration: 42, intensity: 5, status: 'completed',
        completedAt: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000),
        totalWeight: 2600, totalReps: 130, totalSets: 12, avgRPE: 5.5,
        notes: 'Good form on goblet squats. Knee felt stable.',
        sessionType: 'trainer-led', experiencePoints: 55,
        createdAt: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000), updatedAt: now,
      },
      {
        id: uuidv4(), userId, title: 'Stabilization Endurance Day 3',
        date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        duration: 45, intensity: 6, status: 'completed',
        completedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        totalWeight: 3200, totalReps: 140, totalSets: 14, avgRPE: 6.0,
        notes: 'Increased weight on several exercises. Core stability improving.',
        sessionType: 'trainer-led', experiencePoints: 60,
        createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000), updatedAt: now,
      },
      {
        id: uuidv4(), userId, title: 'Strength Endurance Day 1',
        date: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
        duration: 50, intensity: 6, status: 'completed',
        completedAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
        totalWeight: 4800, totalReps: 120, totalSets: 16, avgRPE: 6.5,
        notes: 'Progressed to Phase 2 OPT. Supersets introduced.',
        sessionType: 'trainer-led', experiencePoints: 65,
        createdAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000), updatedAt: now,
      },
      {
        id: uuidv4(), userId, title: 'Strength Endurance Day 2',
        date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        duration: 50, intensity: 7, status: 'completed',
        completedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        totalWeight: 5400, totalReps: 130, totalSets: 16, avgRPE: 6.5,
        notes: 'Weight increase on dumbbell rows and leg press. Knee stable with proper form.',
        sessionType: 'trainer-led', experiencePoints: 70,
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), updatedAt: now,
      },
      {
        id: uuidv4(), userId, title: 'Strength Endurance Day 3',
        date: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        duration: 52, intensity: 7, status: 'completed',
        completedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        totalWeight: 5800, totalReps: 128, totalSets: 16, avgRPE: 7.0,
        notes: 'Progressive overload working. Bench press at 155x8. Squat at 175x8 with good depth.',
        sessionType: 'trainer-led', experiencePoints: 75,
        createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), updatedAt: now,
      },
    ];

    await queryInterface.bulkInsert('"WorkoutSessions"', sessions);
    console.log(`  Created ${sessions.length} workout sessions`);
  }

  console.log(`\n  Test client ready: ${TEST_EMAIL} / TestClient123!\n`);
}

export async function down(queryInterface) {
  // Get user ID
  const [users] = await queryInterface.sequelize.query(
    `SELECT id FROM "Users" WHERE email = :email LIMIT 1`,
    { replacements: { email: TEST_EMAIL } }
  );

  if (users.length === 0) return;

  const userId = users[0].id;

  // Remove in reverse dependency order
  await queryInterface.sequelize.query(`DELETE FROM "WorkoutSessions" WHERE "userId" = :userId`, { replacements: { userId } });
  await queryInterface.sequelize.query(`DELETE FROM "body_measurements" WHERE "userId" = :userId`, { replacements: { userId } });
  await queryInterface.sequelize.query(`DELETE FROM "client_baseline_measurements" WHERE "userId" = :userId`, { replacements: { userId } });
  await queryInterface.sequelize.query(`DELETE FROM "ClientOnboardingQuestionnaires" WHERE "userId" = :userId`, { replacements: { userId } });
  await queryInterface.sequelize.query(`DELETE FROM "Users" WHERE id = :userId`, { replacements: { userId } });

  console.log(`  Removed test client: ${TEST_EMAIL}`);
}
