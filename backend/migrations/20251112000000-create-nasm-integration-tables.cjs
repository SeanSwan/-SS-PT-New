/**
 * NASM × 4-Tier Integration - Database Schema Migration
 *
 * This migration creates all tables needed for NASM OPT™ model integration
 * across SwanStudios' 4-tier user hierarchy (User → Client → Trainer → Admin)
 *
 * Tables Created:
 * - client_opt_phases: Track client progression through 5 NASM phases
 * - movement_assessments: Store OHS, single-leg squat, and other assessment data
 * - corrective_protocols: CEx Continuum (Inhibit/Lengthen/Activate/Integrate)
 * - workout_templates: NASM-compliant workout templates (admin-approved)
 * - exercise_library: Exercises tagged by phase, equipment, contraindications
 * - session_logs: Acute variable tracking (reps, sets, tempo, rest, RPE)
 * - trainer_certifications: CPT, CES, PES, FNS certification tracking
 * - corrective_homework_logs: Daily homework completion tracking
 * - phase_progression_history: Audit trail of phase changes
 *
 * NASM Methodology Overview:
 * - Phase 1: Stabilization Endurance (12-20 reps, 4/2/1 tempo, 50-70% 1RM)
 * - Phase 2: Strength Endurance (8-12 reps, supersets, 70-80% 1RM)
 * - Phase 3: Muscular Development (6-12 reps, 3-6 sets, 75-85% 1RM)
 * - Phase 4: Maximal Strength (1-5 reps, 85-100% 1RM)
 * - Phase 5: Power (contrast training, 85-90% + explosive)
 *
 * Postural Distortion Syndromes:
 * - UCS (Upper Crossed): Forward head, rounded shoulders
 * - LCS (Lower Crossed): Anterior pelvic tilt, low back arch
 * - PDS (Pronation Distortion): Knee valgus, flat feet
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // ========================================
      // TABLE 1: client_opt_phases
      // ========================================
      await queryInterface.createTable('client_opt_phases', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        client_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        current_phase: {
          type: Sequelize.ENUM(
            'phase_1_stabilization',
            'phase_2_strength_endurance',
            'phase_3_hypertrophy',
            'phase_4_maximal_strength',
            'phase_5_power'
          ),
          allowNull: false,
          defaultValue: 'phase_1_stabilization',
          comment: 'Current OPT phase - always starts at Phase 1 for safety',
        },
        phase_start_date: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
        phase_target_weeks: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 4,
          comment: 'Target duration for current phase (typically 4 weeks)',
        },
        weeks_completed: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        progression_criteria_met: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Example: {"load_increased_5_percent": true, "form_improved": true, "no_pain": true}',
        },
        ready_for_next_phase: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Trainer marks true when client ready to progress',
        },
        trainer_notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
      }, { transaction });

      await queryInterface.addIndex('client_opt_phases', ['client_id'], {
        name: 'idx_client_opt_phases_client_id',
        transaction,
      });

      await queryInterface.addIndex('client_opt_phases', ['current_phase'], {
        name: 'idx_client_opt_phases_current_phase',
        transaction,
      });

      // ========================================
      // TABLE 2: movement_assessments
      // ========================================
      await queryInterface.createTable('movement_assessments', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        client_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        assessor_trainer_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        assessment_type: {
          type: Sequelize.ENUM(
            'overhead_squat',
            'single_leg_squat_left',
            'single_leg_squat_right',
            'pushing_assessment',
            'pulling_assessment',
            'gait_analysis'
          ),
          allowNull: false,
        },
        assessment_date: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
        compensations_identified: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Example: {"knee_valgus": true, "forward_head": true, "heels_rise": true, "low_back_arches": false}',
        },
        video_url: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'CloudStorage URL to assessment video',
        },
        photo_urls: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Array of photo URLs: ["front_view.jpg", "side_view.jpg", "rear_view.jpg"]',
        },
        suggested_protocol: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'AI-suggested protocol: UCS, LCS, PDS, or combination (e.g., "UCS+PDS")',
        },
        protocol_confidence: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
          comment: 'AI confidence score 0-100%',
        },
        trainer_notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
      }, { transaction });

      await queryInterface.addIndex('movement_assessments', ['client_id'], {
        name: 'idx_movement_assessments_client_id',
        transaction,
      });

      await queryInterface.addIndex('movement_assessments', ['assessment_type'], {
        name: 'idx_movement_assessments_type',
        transaction,
      });

      // ========================================
      // TABLE 3: corrective_protocols
      // ========================================
      await queryInterface.createTable('corrective_protocols', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        client_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        assessment_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'movement_assessments',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        protocol_type: {
          type: Sequelize.STRING(100),
          allowNull: false,
          comment: 'UCS, LCS, PDS, custom, or combinations',
        },
        inhibit_exercises: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'SMR/foam rolling: [{"exercise": "SMR Calves", "duration_sec": 90, "notes": "Focus on tender spots"}]',
        },
        lengthen_exercises: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Static stretching: [{"exercise": "Static Hip Flexor Stretch", "duration_sec": 30, "reps": 2}]',
        },
        activate_exercises: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Isolated strengthening: [{"exercise": "Floor Cobra", "reps": 15, "sets": 2, "tempo": "2/2/2"}]',
        },
        integrate_exercises: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Functional movements: [{"exercise": "Ball Squat", "reps": 15, "sets": 2, "tempo": "4/2/1"}]',
        },
        assigned_by_trainer_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        homework_assigned: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'If true, client must do this daily as homework',
        },
        total_days_assigned: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        days_completed: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        compliance_rate: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
          comment: 'Calculated: (days_completed / total_days_assigned) * 100',
        },
        xp_earned: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Gamification: +10 XP per completed day',
        },
        current_streak: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Consecutive days completed',
        },
        longest_streak: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        status: {
          type: Sequelize.ENUM('active', 'completed', 'archived'),
          allowNull: false,
          defaultValue: 'active',
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
      }, { transaction });

      await queryInterface.addIndex('corrective_protocols', ['client_id'], {
        name: 'idx_corrective_protocols_client_id',
        transaction,
      });

      await queryInterface.addIndex('corrective_protocols', ['status'], {
        name: 'idx_corrective_protocols_status',
        transaction,
      });

      // ========================================
      // TABLE 4: exercise_library
      // ========================================
      await queryInterface.createTable('exercise_library', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        exercise_name: {
          type: Sequelize.STRING(255),
          allowNull: false,
          unique: true,
        },
        opt_phases: {
          type: Sequelize.JSONB,
          allowNull: false,
          comment: 'Array of appropriate phases: [1, 2, 3] means suitable for Phases 1-3',
        },
        exercise_type: {
          type: Sequelize.ENUM(
            'strength',
            'stabilization',
            'power',
            'plyometric',
            'corrective',
            'flexibility',
            'cardio',
            'core',
            'balance',
            'saq'
          ),
          allowNull: false,
        },
        primary_body_part: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'chest, back, legs, shoulders, arms, core, full_body',
        },
        movement_pattern: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'squat, hinge, push, pull, lunge, rotation, anti-rotation, gait',
        },
        primary_equipment: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'dumbbell, barbell, cable, bands, bodyweight, machine, kettlebell, medicine_ball, stability_ball',
        },
        alternative_equipment: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Array of alternative equipment options',
        },
        contraindications: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Injuries/conditions where this exercise is unsafe: ["low_back_pain", "knee_injury", "shoulder_impingement"]',
        },
        acute_variables_defaults: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Example: {"phase_1_stabilization": {"reps": "12-20", "sets": "2-3", "tempo": "4/2/1", "rest_sec": 30, "intensity": "50-70%"}}',
        },
        demo_video_url: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        coaching_cues: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Array of coaching cues: ["Keep chest up", "Drive through heels", "Maintain neutral spine"]',
        },
        approved: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Admin approval required before trainers can use',
        },
        created_by_admin_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
      }, { transaction });

      await queryInterface.addIndex('exercise_library', ['approved'], {
        name: 'idx_exercise_library_approved',
        transaction,
      });

      await queryInterface.addIndex('exercise_library', ['exercise_type'], {
        name: 'idx_exercise_library_type',
        transaction,
      });

      await queryInterface.addIndex('exercise_library', ['primary_body_part'], {
        name: 'idx_exercise_library_body_part',
        transaction,
      });

      // ========================================
      // TABLE 5: workout_templates
      // ========================================
      await queryInterface.createTable('workout_templates', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        template_name: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        opt_phase: {
          type: Sequelize.ENUM(
            'phase_1_stabilization',
            'phase_2_strength_endurance',
            'phase_3_hypertrophy',
            'phase_4_maximal_strength',
            'phase_5_power'
          ),
          allowNull: false,
        },
        workout_structure: {
          type: Sequelize.JSONB,
          allowNull: false,
          comment: 'Complete workout: {"warmup": [], "corrective": [], "activation": [], "main_workout": [], "cooldown": []}',
        },
        target_duration_minutes: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 60,
        },
        difficulty_level: {
          type: Sequelize.ENUM('beginner', 'intermediate', 'advanced'),
          allowNull: false,
          defaultValue: 'beginner',
        },
        equipment_required: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Array of required equipment',
        },
        created_by_admin_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        approved: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        usage_count: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'How many times this template has been used',
        },
        average_rating: {
          type: Sequelize.DECIMAL(3, 2),
          allowNull: true,
          comment: 'Trainer ratings 1-5',
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
      }, { transaction });

      await queryInterface.addIndex('workout_templates', ['opt_phase'], {
        name: 'idx_workout_templates_phase',
        transaction,
      });

      await queryInterface.addIndex('workout_templates', ['approved'], {
        name: 'idx_workout_templates_approved',
        transaction,
      });

      // ========================================
      // TABLE 6: session_logs
      // ========================================
      await queryInterface.createTable('session_logs', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        client_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        trainer_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        session_date: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
        opt_phase_during_session: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        workout_template_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'workout_templates',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        corrective_warmup_completed: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        exercises_performed: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Example: [{"exercise_id": "uuid", "sets_logged": [{"set_num": 1, "reps": 10, "weight_lbs": 25, "tempo": "2/0/2", "rpe": 7, "notes": ""}]}]',
        },
        acute_variables_adherence: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
          comment: 'Percentage adherence to prescribed acute variables',
        },
        pain_flags: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Any pain reported: [{"exercise": "Bench Press", "location": "right_shoulder", "severity": 3, "description": "Sharp pain on descent"}]',
        },
        client_readiness_pre_session: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Client-reported readiness 1-10',
        },
        session_rpe_overall: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Session RPE 1-10',
        },
        trainer_notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
      }, { transaction });

      await queryInterface.addIndex('session_logs', ['client_id'], {
        name: 'idx_session_logs_client_id',
        transaction,
      });

      await queryInterface.addIndex('session_logs', ['trainer_id'], {
        name: 'idx_session_logs_trainer_id',
        transaction,
      });

      await queryInterface.addIndex('session_logs', ['session_date'], {
        name: 'idx_session_logs_date',
        transaction,
      });

      // ========================================
      // TABLE 7: trainer_certifications
      // ========================================
      await queryInterface.createTable('trainer_certifications', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        trainer_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        certification_type: {
          type: Sequelize.ENUM(
            'NASM-CPT',
            'NASM-CES',
            'NASM-PES',
            'NASM-FNS',
            'NASM-WLS',
            'NASM-BCS',
            'OTHER'
          ),
          allowNull: false,
          comment: 'CPT=Personal Trainer, CES=Corrective Exercise, PES=Performance Enhancement, FNS=Fitness Nutrition',
        },
        certification_number: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        issue_date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        expiration_date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        status: {
          type: Sequelize.ENUM('active', 'expired', 'pending_renewal'),
          allowNull: false,
          defaultValue: 'active',
        },
        certificate_url: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'CloudStorage URL to certificate PDF',
        },
        verified_by_admin_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        verified_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
      }, { transaction });

      await queryInterface.addIndex('trainer_certifications', ['trainer_id'], {
        name: 'idx_trainer_certifications_trainer_id',
        transaction,
      });

      await queryInterface.addIndex('trainer_certifications', ['certification_type'], {
        name: 'idx_trainer_certifications_type',
        transaction,
      });

      await queryInterface.addIndex('trainer_certifications', ['status'], {
        name: 'idx_trainer_certifications_status',
        transaction,
      });

      // ========================================
      // TABLE 8: corrective_homework_logs
      // ========================================
      await queryInterface.createTable('corrective_homework_logs', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        protocol_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'corrective_protocols',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        client_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        completion_date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        completed: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        xp_earned: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 10,
          comment: '+10 XP per completion',
        },
        streak_bonus_xp: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: '7-day=+50, 15-day=+100, 30-day=+250',
        },
        client_notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
      }, { transaction });

      await queryInterface.addIndex('corrective_homework_logs', ['protocol_id'], {
        name: 'idx_corrective_homework_logs_protocol_id',
        transaction,
      });

      await queryInterface.addIndex('corrective_homework_logs', ['client_id'], {
        name: 'idx_corrective_homework_logs_client_id',
        transaction,
      });

      await queryInterface.addIndex('corrective_homework_logs', ['completion_date'], {
        name: 'idx_corrective_homework_logs_date',
        transaction,
      });

      // ========================================
      // TABLE 9: phase_progression_history
      // ========================================
      await queryInterface.createTable('phase_progression_history', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        client_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        from_phase: {
          type: Sequelize.STRING(50),
          allowNull: true,
          comment: 'Null if this is initial phase assignment',
        },
        to_phase: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        progression_date: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
        weeks_in_previous_phase: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        progression_criteria_met: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        trainer_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        trainer_rationale: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
      }, { transaction });

      await queryInterface.addIndex('phase_progression_history', ['client_id'], {
        name: 'idx_phase_progression_history_client_id',
        transaction,
      });

      await queryInterface.addIndex('phase_progression_history', ['progression_date'], {
        name: 'idx_phase_progression_history_date',
        transaction,
      });

      // ========================================
      // TRIGGER: Auto-expire certifications
      // ========================================
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION auto_expire_certifications()
        RETURNS TRIGGER AS $$
        BEGIN
          UPDATE trainer_certifications
          SET status = 'expired'
          WHERE expiration_date < CURRENT_DATE
            AND status = 'active';
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE TRIGGER trigger_auto_expire_certifications
        AFTER INSERT OR UPDATE ON trainer_certifications
        FOR EACH STATEMENT
        EXECUTE FUNCTION auto_expire_certifications();
      `, { transaction });

      // ========================================
      // TRIGGER: Update compliance_rate on corrective_protocols
      // ========================================
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION update_corrective_protocol_compliance()
        RETURNS TRIGGER AS $$
        BEGIN
          UPDATE corrective_protocols
          SET
            compliance_rate = CASE
              WHEN total_days_assigned > 0 THEN (days_completed::DECIMAL / total_days_assigned) * 100
              ELSE NULL
            END
          WHERE id = NEW.protocol_id;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE TRIGGER trigger_update_compliance
        AFTER INSERT OR UPDATE ON corrective_homework_logs
        FOR EACH ROW
        EXECUTE FUNCTION update_corrective_protocol_compliance();
      `, { transaction });

      // ========================================
      // MATERIALIZED VIEW: Admin Compliance Dashboard
      // ========================================
      await queryInterface.sequelize.query(`
        CREATE MATERIALIZED VIEW admin_nasm_compliance_metrics AS
        SELECT
          COUNT(DISTINCT u.id) FILTER (WHERE u.user_tier = 'client') AS total_clients,
          COUNT(DISTINCT cop.id) AS total_active_protocols,
          ROUND(AVG(cop.compliance_rate), 2) AS avg_compliance_rate,
          COUNT(DISTINCT tc.trainer_id) FILTER (WHERE tc.certification_type = 'NASM-CPT' AND tc.status = 'active') AS active_cpt_trainers,
          COUNT(DISTINCT tc.trainer_id) FILTER (WHERE tc.certification_type = 'NASM-CES' AND tc.status = 'active') AS active_ces_trainers,
          COUNT(DISTINCT tc.trainer_id) FILTER (WHERE tc.certification_type = 'NASM-PES' AND tc.status = 'active') AS active_pes_trainers,
          COUNT(DISTINCT el.id) FILTER (WHERE el.approved = true) AS approved_exercises,
          COUNT(DISTINCT wt.id) FILTER (WHERE wt.approved = true) AS approved_templates,
          COUNT(DISTINCT ma.id) AS total_assessments_30d,
          COUNT(DISTINCT sl.id) AS total_sessions_30d
        FROM users u
        LEFT JOIN corrective_protocols cop ON u.id = cop.client_id AND cop.status = 'active'
        LEFT JOIN trainer_certifications tc ON u.id = tc.trainer_id
        LEFT JOIN exercise_library el ON true
        LEFT JOIN workout_templates wt ON true
        LEFT JOIN movement_assessments ma ON u.id = ma.client_id AND ma.assessment_date >= NOW() - INTERVAL '30 days'
        LEFT JOIN session_logs sl ON u.id = sl.client_id AND sl.session_date >= NOW() - INTERVAL '30 days';
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX ON admin_nasm_compliance_metrics ((1));
      `, { transaction });

      console.log('✅ NASM × 4-Tier Integration tables created successfully');
      console.log('📊 9 tables, 2 triggers, 1 materialized view');
      console.log('🎯 Ready for Phase 0 implementation');

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Drop materialized view
      await queryInterface.sequelize.query('DROP MATERIALIZED VIEW IF EXISTS admin_nasm_compliance_metrics CASCADE;', { transaction });

      // Drop triggers
      await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trigger_auto_expire_certifications ON trainer_certifications;', { transaction });
      await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trigger_update_compliance ON corrective_homework_logs;', { transaction });
      await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS auto_expire_certifications();', { transaction });
      await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS update_corrective_protocol_compliance();', { transaction });

      // Drop tables in reverse order
      await queryInterface.dropTable('phase_progression_history', { transaction });
      await queryInterface.dropTable('corrective_homework_logs', { transaction });
      await queryInterface.dropTable('trainer_certifications', { transaction });
      await queryInterface.dropTable('session_logs', { transaction });
      await queryInterface.dropTable('workout_templates', { transaction });
      await queryInterface.dropTable('exercise_library', { transaction });
      await queryInterface.dropTable('corrective_protocols', { transaction });
      await queryInterface.dropTable('movement_assessments', { transaction });
      await queryInterface.dropTable('client_opt_phases', { transaction });

      // Drop enums
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_client_opt_phases_current_phase";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_movement_assessments_assessment_type";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_corrective_protocols_status";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_exercise_library_exercise_type";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_workout_templates_opt_phase";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_workout_templates_difficulty_level";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_trainer_certifications_certification_type";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_trainer_certifications_status";', { transaction });

      console.log('✅ NASM × 4-Tier Integration tables dropped successfully');

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  },
};
