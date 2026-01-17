'use strict';

/**
 * Migration: Add NASM Protocol Fields to client_baseline_measurements
 *
 * Purpose: Replace generic ROM scoring with NASM-compliant assessment fields
 * - PAR-Q+ pre-screening (7 questions + medical clearance)
 * - Overhead Squat Assessment (OHSA) with 8 kinetic chain checkpoints
 * - NASM Assessment Score (0-100 composite)
 * - Postural Assessment (anterior/lateral/posterior views)
 * - Performance Assessments (cardio/strength/flexibility)
 * - Corrective Exercise Strategy (4-phase NASM protocol)
 *
 * Reference: docs/ai-workflow/blueprints/NASM-PROTOCOL-REQUIREMENTS.md
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Adding NASM protocol fields to client_baseline_measurements...');

    // 1. Add PAR-Q+ Pre-Screening field (MANDATORY before training)
    await queryInterface.addColumn('client_baseline_measurements', 'parqScreening', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'NASM PAR-Q+ 7-question screening + medical clearance tracking'
      /*
      Schema:
      {
        "q1_heart_condition": false,
        "q2_chest_pain": false,
        "q3_balance_dizziness": false,
        "q4_bone_joint_problem": false,
        "q5_blood_pressure_meds": true,
        "q6_medical_reason": false,
        "q7_aware_of_other": false,
        "medicalClearanceRequired": true
      }
      */
    });

    // 2. Add NASM Overhead Squat Assessment (replace generic rangeOfMotion)
    await queryInterface.addColumn('client_baseline_measurements', 'overheadSquatAssessment', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'NASM OHSA 8 kinetic chain checkpoints (none/minor/significant)'
      /*
      Schema:
      {
        "anteriorView": {
          "feetTurnout": "minor",
          "feetFlattening": "none",
          "kneeValgus": "significant",
          "kneeVarus": "none"
        },
        "lateralView": {
          "excessiveForwardLean": "minor",
          "lowBackArch": "none",
          "armsFallForward": "minor",
          "forwardHead": "none"
        },
        "asymmetricWeightShift": "none",
        "notes": "Client displays knee valgus and forward lean",
        "videoUrl": "s3://movement-screens/user-7-ohsa.mp4"
      }
      */
    });

    // 3. Add NASM Assessment Score (0-100 composite, replaces movementScreenScore)
    await queryInterface.addColumn('client_baseline_measurements', 'nasmAssessmentScore', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: '0-100 composite score calculated from OHSA compensations'
      /*
      Calculation:
      - none = 100
      - minor = 70
      - significant = 40
      - Average all 9 checkpoints

      Example: (5×100 + 3×70 + 1×40) / 9 = 73/100

      OPT Phase Selection:
      - <60: Phase 1 (Stabilization Endurance)
      - 60-79: Phase 2 (Strength Endurance)
      - 80+: Phases 3-5 based on goals
      */
    });

    // 4. Add Postural Assessment
    await queryInterface.addColumn('client_baseline_measurements', 'posturalAssessment', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'Static postural observations from 3 views'
      /*
      Schema:
      {
        "anteriorView": "Shoulders level, knees slight valgus",
        "lateralView": "Slight anterior pelvic tilt",
        "posteriorView": "Level hips, minor shoulder elevation (right)"
      }
      */
    });

    // 5. Add Performance Assessments (optional cardio/strength/flexibility tests)
    await queryInterface.addColumn('client_baseline_measurements', 'performanceAssessments', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'Optional NASM performance tests (cardio, strength, flexibility)'
      /*
      Schema:
      {
        "cardio": {
          "test": "YMCA 3-Minute Step Test",
          "heartRate": 128,
          "rating": "good"
        },
        "strength": {
          "pushUps": 25,
          "rating": "excellent"
        },
        "flexibility": {
          "sitAndReach": 18,
          "rating": "good"
        }
      }
      */
    });

    // 6. Add Corrective Exercise Strategy (auto-generated from compensations)
    await queryInterface.addColumn('client_baseline_measurements', 'correctiveExerciseStrategy', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: '4-phase NASM corrective strategy (Inhibit, Lengthen, Activate, Integrate)'
      /*
      Schema:
      {
        "compensationsIdentified": ["knee valgus", "excessive forward lean"],
        "inhibit": [
          { "muscle": "TFL", "exercise": "Foam roll IT band", "duration": "30s", "sets": 1 }
        ],
        "lengthen": [
          { "muscle": "Hip flexors", "exercise": "Kneeling hip flexor stretch", "duration": "30s", "sets": 1 }
        ],
        "activate": [
          { "muscle": "Glute medius", "exercise": "Side-lying hip abduction", "reps": 15, "sets": 2 }
        ],
        "integrate": [
          { "exercise": "Ball wall squats", "reps": 12, "sets": 2, "cue": "Push knees out" }
        ]
      }
      */
    });

    // 7. Add Medical Clearance Required flag
    await queryInterface.addColumn('client_baseline_measurements', 'medicalClearanceRequired', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'True if PAR-Q+ indicates need for medical clearance before training'
    });

    // 8. Add Medical Clearance Date
    await queryInterface.addColumn('client_baseline_measurements', 'medicalClearanceDate', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      defaultValue: null,
      comment: 'Date client received medical clearance from physician'
    });

    // 9. Add Medical Clearance Provider
    await queryInterface.addColumn('client_baseline_measurements', 'medicalClearanceProvider', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
      comment: 'Name of physician who provided medical clearance'
    });

    console.log('✅ NASM protocol fields added successfully!');
    console.log('');
    console.log('📝 NOTE: Generic rangeOfMotion and movementScreenScore fields are DEPRECATED');
    console.log('   Use overheadSquatAssessment and nasmAssessmentScore instead.');
    console.log('   Legacy fields kept for backward compatibility but should not be used for new assessments.');
    console.log('');
    console.log('🔍 Next Steps:');
    console.log('   1. Update ClientBaselineMeasurements.mjs model with new fields');
    console.log('   2. Update onboardingController.mjs to use NASM fields');
    console.log('   3. Update frontend MovementScreenForm.tsx with NASM OHSA UI');
    console.log('   4. Update AI Workout Controller to use NASM assessment data');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back NASM protocol fields...');

    await queryInterface.removeColumn('client_baseline_measurements', 'medicalClearanceProvider');
    await queryInterface.removeColumn('client_baseline_measurements', 'medicalClearanceDate');
    await queryInterface.removeColumn('client_baseline_measurements', 'medicalClearanceRequired');
    await queryInterface.removeColumn('client_baseline_measurements', 'correctiveExerciseStrategy');
    await queryInterface.removeColumn('client_baseline_measurements', 'performanceAssessments');
    await queryInterface.removeColumn('client_baseline_measurements', 'posturalAssessment');
    await queryInterface.removeColumn('client_baseline_measurements', 'nasmAssessmentScore');
    await queryInterface.removeColumn('client_baseline_measurements', 'overheadSquatAssessment');
    await queryInterface.removeColumn('client_baseline_measurements', 'parqScreening');

    console.log('✅ Rollback complete - generic ROM fields remain intact');
  }
};
