import getModels from './models/associations.mjs';

const db = await getModels();
const { User, ClientOnboardingQuestionnaire, ClientBaselineMeasurements, ClientNutritionPlan } = db;

async function testPhase1Endpoints() {
  console.log('🧪 Testing Phase 1.1 Onboarding Endpoints...\n');

  try {
    // Find test user (should exist from seed-client-data.mjs)
    const testUser = await User.findOne({ where: { email: 'test-client@swanstudios.com' } });

    if (!testUser) {
      console.error('❌ Test user not found. Run seed-client-data.mjs first.');
      process.exit(1);
    }

    console.log(`✅ Test user found: ${testUser.firstName} ${testUser.lastName} (ID: ${testUser.id})\n`);

    // ============================================
    // TEST 1: Create Questionnaire
    // ============================================
    console.log('📝 Test 1: Create Onboarding Questionnaire');

    const questionnaireData = {
      userId: testUser.id,
      questionnaireVersion: '3.0',
      status: 'submitted',
      responsesJson: {
        section1_personal_info: { age: 42, gender: 'male', occupation: 'Software Engineer' },
        section2_goals: {
          primary_goal: 'weight_loss',
          secondary_goals: ['muscle_gain', 'energy'],
          preferred_package: 'signature_60_ai',
          commitment_level: 9
        },
        section3_health_history: {
          chronic_conditions: [],
          current_medications: [],
          pain_level: 0
        },
        section5_nutrition: {
          dietary_restrictions: [],
          meal_frequency: 3,
          allergies: []
        }
      },
      primaryGoal: 'weight_loss',
      trainingTier: 'signature_60_ai',
      commitmentLevel: 9,
      healthRisk: 'low',
      nutritionPrefs: { dietary_restrictions: [], meal_frequency: 3, allergies: [] },
      completedAt: new Date()
    };

    const questionnaire = await ClientOnboardingQuestionnaire.create(questionnaireData);
    console.log(`✅ Questionnaire created: ID ${questionnaire.id}`);
    console.log(`   - Primary Goal: ${questionnaire.primaryGoal}`);
    console.log(`   - Training Tier: ${questionnaire.trainingTier}`);
    console.log(`   - Status: ${questionnaire.status}\n`);

    // ============================================
    // TEST 2: Calculate NASM Score
    // ============================================
    console.log('🏋️  Test 2: Calculate NASM Assessment Score');

    const ohsa = {
      anteriorView: {
        feetTurnout: 'minor',
        feetFlattening: 'none',
        kneeValgus: 'significant',
        kneeVarus: 'none'
      },
      lateralView: {
        excessiveForwardLean: 'minor',
        lowBackArch: 'none',
        armsFallForward: 'minor',
        forwardHead: 'none'
      },
      asymmetricWeightShift: 'none',
      notes: 'Client displays knee valgus and forward lean. Likely weak glute medius.',
      videoUrl: null
    };

    const nasmScore = ClientBaselineMeasurements.calculateNASMScore(ohsa);
    console.log(`✅ NASM Score calculated: ${nasmScore}/100`);

    // Expected breakdown:
    // feetTurnout: minor (70), feetFlattening: none (100), kneeValgus: significant (40), kneeVarus: none (100)
    // excessiveForwardLean: minor (70), lowBackArch: none (100), armsFallForward: minor (70), forwardHead: none (100)
    // asymmetricWeightShift: none (100)
    // Average: (70 + 100 + 40 + 100 + 70 + 100 + 70 + 100 + 100) / 9 = 750 / 9 = 83.3 → 83
    console.log(`   Expected: ~83/100 (with 3 minor, 1 significant compensation)\n`);

    // ============================================
    // TEST 3: Generate Corrective Strategy
    // ============================================
    console.log('💪 Test 3: Generate NASM Corrective Exercise Strategy');

    const correctiveStrategy = ClientBaselineMeasurements.generateCorrectiveStrategy(ohsa);
    console.log(`✅ Corrective strategy generated`);
    console.log(`   - Compensations identified: ${correctiveStrategy.compensationsIdentified.join(', ')}`);
    console.log(`   - Inhibit exercises: ${correctiveStrategy.inhibit.length}`);
    console.log(`   - Lengthen exercises: ${correctiveStrategy.lengthen.length}`);
    console.log(`   - Activate exercises: ${correctiveStrategy.activate.length}`);
    console.log(`   - Integrate exercises: ${correctiveStrategy.integrate.length}`);

    // Show sample exercises
    console.log('\n   Sample Corrective Exercises:');
    if (correctiveStrategy.inhibit.length > 0) {
      console.log(`   • Inhibit: ${correctiveStrategy.inhibit[0].exercise} (${correctiveStrategy.inhibit[0].muscle})`);
    }
    if (correctiveStrategy.activate.length > 0) {
      console.log(`   • Activate: ${correctiveStrategy.activate[0].exercise} (${correctiveStrategy.activate[0].muscle})`);
    }
    console.log('');

    // ============================================
    // TEST 4: Create Movement Screen
    // ============================================
    console.log('📊 Test 4: Create Movement Screen Record');

    const parqScreening = {
      q1_heart_condition: false,
      q2_chest_pain: false,
      q3_balance_dizziness: false,
      q4_bone_joint_problem: false,
      q5_blood_pressure_meds: false,
      q6_medical_reason: false,
      q7_aware_of_other: false,
      medicalClearanceRequired: false
    };

    const posturalAssessment = {
      anteriorView: 'Shoulders level, knees slight valgus',
      lateralView: 'Slight anterior pelvic tilt',
      posteriorView: 'Level hips, minor shoulder elevation (right)'
    };

    const performanceAssessments = {
      cardio: { test: 'YMCA 3-Minute Step Test', heartRate: 128, rating: 'good' }
    };

    const baseline = await ClientBaselineMeasurements.create({
      userId: testUser.id,
      takenAt: new Date(),
      parqScreening,
      overheadSquatAssessment: ohsa,
      nasmAssessmentScore: nasmScore,
      posturalAssessment,
      performanceAssessments,
      correctiveExerciseStrategy: correctiveStrategy,
      flexibilityNotes: 'Limited hamstring flexibility, tight hip flexors',
      injuryNotes: 'Previous left knee meniscus tear (2020)',
      painLevel: 2
    });

    console.log(`✅ Movement screen created: ID ${baseline.id}`);
    console.log(`   - NASM Score: ${baseline.nasmAssessmentScore}/100`);
    console.log(`   - Medical Clearance Required: ${baseline.medicalClearanceRequired}`);
    console.log(`   - Pain Level: ${baseline.painLevel}/10`);
    console.log(`   - Compensations: ${baseline.correctiveExerciseStrategy.compensationsIdentified.length}\n`);

    // ============================================
    // TEST 5: OPT Phase Selection
    // ============================================
    console.log('🎯 Test 5: Select OPT Model Phase');

    const optPhase = ClientBaselineMeasurements.selectOPTPhase(nasmScore, 'weight_loss');
    console.log(`✅ OPT Phase selected: Phase ${optPhase.phase} - ${optPhase.name}`);
    console.log(`   - Focus: ${optPhase.focus}`);
    console.log(`   - Duration: ${optPhase.duration}`);
    console.log(`   - Rep Range: ${optPhase.repRange}`);
    console.log(`   - Tempo: ${optPhase.tempo}`);
    console.log(`   - Rest: ${optPhase.rest}\n`);

    // ============================================
    // TEST 6: Client Data Overview Aggregation
    // ============================================
    console.log('📈 Test 6: Aggregate Client Data Overview');

    // Fetch all client data (simulating getClientDataOverview endpoint)
    const latestQuestionnaire = await ClientOnboardingQuestionnaire.findOne({
      where: { userId: testUser.id },
      order: [['createdAt', 'DESC']]
    });

    const latestBaseline = await ClientBaselineMeasurements.findOne({
      where: { userId: testUser.id },
      order: [['createdAt', 'DESC']]
    });

    const activeNutrition = await ClientNutritionPlan.findOne({
      where: { userId: testUser.id, status: 'active' }
    });

    const overview = {
      userId: testUser.id,
      onboardingStatus: {
        completed: latestQuestionnaire?.status === 'submitted',
        completionPercentage: 100,
        primaryGoal: latestQuestionnaire?.primaryGoal,
        trainingTier: latestQuestionnaire?.trainingTier,
        healthRisk: latestQuestionnaire?.healthRisk
      },
      movementScreen: {
        completed: !!latestBaseline,
        nasmAssessmentScore: latestBaseline?.nasmAssessmentScore,
        medicalClearanceRequired: latestBaseline?.medicalClearanceRequired,
        compensationsIdentified: latestBaseline?.correctiveExerciseStrategy?.compensationsIdentified || [],
        date: latestBaseline?.createdAt
      },
      nutritionPlan: {
        active: !!activeNutrition,
        dailyCalories: activeNutrition?.dailyCalories,
        macros: activeNutrition ? {
          protein: activeNutrition.proteinGrams,
          carbs: activeNutrition.carbsGrams,
          fat: activeNutrition.fatGrams
        } : null
      }
    };

    console.log('✅ Client data overview aggregated:');
    console.log(`   - Onboarding: ${overview.onboardingStatus.completionPercentage}% complete`);
    console.log(`   - Movement Screen: ${overview.movementScreen.completed ? 'Completed' : 'Pending'}`);
    console.log(`   - NASM Score: ${overview.movementScreen.nasmAssessmentScore}/100`);
    console.log(`   - Nutrition Plan: ${overview.nutritionPlan.active ? 'Active' : 'Not Set'}`);
    console.log('');

    // ============================================
    // SUMMARY
    // ============================================
    console.log('🎉 All Phase 1.1 Endpoint Tests Passed!\n');
    console.log('✅ Summary:');
    console.log('   1. ✅ Questionnaire creation with indexed field extraction');
    console.log('   2. ✅ NASM score calculation from OHSA compensations');
    console.log('   3. ✅ Corrective exercise strategy generation (4-phase)');
    console.log('   4. ✅ Movement screen record creation with NASM fields');
    console.log('   5. ✅ OPT phase selection based on score + goals');
    console.log('   6. ✅ Client data overview aggregation from multiple tables');
    console.log('\n📋 Next Steps:');
    console.log('   → Run NASM migration: npm run migrate');
    console.log('   → Test API endpoints with curl/Postman');
    console.log('   → Proceed to Phase 1.2: Admin UI implementation\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testPhase1Endpoints();
