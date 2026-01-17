import getModels from './models/associations.mjs';

const db = await getModels();
const { User, ClientOnboardingQuestionnaire, ClientBaselineMeasurements, ClientNutritionPlan } = db;

async function seedData() {
  try {
    // Find or create test user
    let testUser = await User.findOne({ where: { email: 'test-client@swanstudios.com' }});

    if (!testUser) {
      testUser = await User.create({
        email: 'test-client@swanstudios.com',
        username: 'test-client',
        password: 'hashed_password_here', // Use actual bcrypt hash
        firstName: 'Test',
        lastName: 'Client',
        role: 'client'
      });
      console.log('ƒo. Created test user');
    }

    // Create sample questionnaire
    const questionnaire = await ClientOnboardingQuestionnaire.create({
      userId: testUser.id,
      questionnaireVersion: '3.0',
      status: 'completed',
      responsesJson: {
        section1: { goal: 'weight_loss', commitment: 9 },
        section2: { injuries: 'none', pain_level: 0 }
        // ... truncated for brevity
      },
      primaryGoal: 'weight_loss',
      trainingTier: 'signature_60',
      commitmentLevel: 9,
      healthRisk: 'low',
      nutritionPrefs: { dietary_restrictions: [], meal_frequency: 3 },
      completedAt: new Date()
    });
    console.log('ƒo. Created sample questionnaire');

    // Create sample baseline measurements
    const baseline = await ClientBaselineMeasurements.create({
      userId: testUser.id,
      takenAt: new Date(),
      restingHeartRate: 72,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      benchPressWeight: 135,
      benchPressReps: 10,
      pullUpsReps: 5,
      parqScreening: {
        q1_heart_condition: false,
        q2_chest_pain: false,
        q3_balance_dizziness: false,
        q4_bone_joint_problem: false,
        q5_blood_pressure_meds: false,
        q6_medical_reason: false,
        q7_aware_of_other: false,
        medicalClearanceRequired: false
      },
      overheadSquatAssessment: {
        anteriorView: { feetTurnout: 'minor', feetFlattening: 'none', kneeValgus: 'significant', kneeVarus: 'none' },
        lateralView: { excessiveForwardLean: 'minor', lowBackArch: 'none', armsFallForward: 'minor', forwardHead: 'none' },
        asymmetricWeightShift: 'none',
        notes: 'Knee valgus and forward lean observed',
        videoUrl: null
      },
      nasmAssessmentScore: 73,
      posturalAssessment: { anteriorView: 'Shoulders level', lateralView: 'Slight anterior pelvic tilt', posteriorView: 'Right shoulder elevated' },
      performanceAssessments: { cardio: { test: 'YMCA 3-Minute Step Test', heartRate: 128, rating: 'good' } },
      correctiveExerciseStrategy: null,
      flexibilityNotes: 'Good hamstring flexibility, tight hip flexors',
      injuryNotes: 'No current injuries',
      painLevel: 0
    });
    console.log('ƒo. Created sample baseline measurements');

    // Create sample nutrition plan
    const nutritionPlan = await ClientNutritionPlan.create({
      userId: testUser.id,
      planName: 'Weight Loss Macros - Week 1',
      dailyCalories: 2000,
      proteinGrams: 150,
      carbsGrams: 200,
      fatGrams: 67,
      mealsJson: {
        breakfast: { name: 'Oatmeal + Protein', calories: 400, protein: 30 },
        lunch: { name: 'Chicken Salad', calories: 600, protein: 50 },
        dinner: { name: 'Salmon + Veggies', calories: 700, protein: 50 },
        snacks: { name: 'Protein Shake', calories: 300, protein: 20 }
      },
      groceryListJson: ['oats', 'protein powder', 'chicken breast', 'salmon', 'mixed greens', 'olive oil'],
      dietaryRestrictions: [],
      allergies: [],
      source: 'ai_generated',
      status: 'active'
    });
    console.log('ƒo. Created sample nutrition plan');

    console.log('\ndYZ% Phase 0 seed data created successfully!');
    console.log(`Test User ID: ${testUser.id}`);
    process.exit(0);
  } catch (error) {
    console.error('ƒ?O Seed data creation failed:', error.message);
    process.exit(1);
  }
}

seedData();
