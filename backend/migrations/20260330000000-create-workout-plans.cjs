'use strict';

/**
 * ============================================================================
 * FILE: 20260330000000-create-workout-plans.cjs
 * PURPOSE: Create workout_plans table for multi-week planned workout programs
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-29
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Creates the workout_plans table with JSONB planData
 * for storing full week-by-week workout program structures. Idempotent —
 * checks for table existence before creating.
 *
 * KEY DECISIONS:
 *   - INTEGER PK (not UUID) to match Users FK pattern
 *   - constraints: false on FKs to avoid dual Users/users table issues
 *   - snake_case columns (underscored: true in model)
 *   - JSONB for planData and progressNotes for flexible nested structures
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ─────────────────────────────────────────────────────────────
    // SECTION: Idempotency Check
    // PURPOSE: Skip if table already exists (safe re-run)
    // ─────────────────────────────────────────────────────────────
    const tables = await queryInterface.showAllTables();
    if (tables.includes('workout_plans')) {
      console.log('⏭️  Table workout_plans already exists, skipping creation...');

      // Still check for missing columns and add them if needed
      const tableDesc = await queryInterface.describeTable('workout_plans');
      const columnsToAdd = {
        trainer_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'Trainer who created this plan'
        },
        nasm_phase: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'NASM OPT phase (1-5)'
        },
        start_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
          comment: 'Planned start date'
        },
        end_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
          comment: 'Planned end date'
        },
        current_week: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
          comment: 'Current week in the program'
        },
        current_day: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
          comment: 'Current day/session within the week'
        },
        plan_data: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: { weeks: [] },
          comment: 'Full plan structure with weeks/sessions/exercises'
        },
        progress_notes: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
          comment: 'Trainer notes per week'
        },
        created_by: {
          type: Sequelize.STRING(50),
          allowNull: true,
          defaultValue: 'trainer',
          comment: 'Creator: ai, trainer, or admin'
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
          comment: 'Extra data'
        }
      };

      for (const [colName, colDef] of Object.entries(columnsToAdd)) {
        if (!tableDesc[colName]) {
          console.log(`  ➕ Adding missing column: ${colName}`);
          await queryInterface.addColumn('workout_plans', colName, colDef)
            .catch(err => console.log(`  ⚠️  Could not add ${colName}: ${err.message}`));
        }
      }

      // Fix status ENUM if it's missing 'paused' or 'completed'
      try {
        await queryInterface.sequelize.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_enum
              WHERE enumlabel = 'paused'
              AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_workout_plans_status')
            ) THEN
              ALTER TYPE "enum_workout_plans_status" ADD VALUE IF NOT EXISTS 'paused';
            END IF;
            IF NOT EXISTS (
              SELECT 1 FROM pg_enum
              WHERE enumlabel = 'completed'
              AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_workout_plans_status')
            ) THEN
              ALTER TYPE "enum_workout_plans_status" ADD VALUE IF NOT EXISTS 'completed';
            END IF;
          END
          $$;
        `);
      } catch (err) {
        console.log(`  ⚠️  ENUM update note: ${err.message}`);
      }

      return;
    }

    // ─────────────────────────────────────────────────────────────
    // SECTION: Table Creation
    // PURPOSE: Create workout_plans with all columns
    // ─────────────────────────────────────────────────────────────
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('📋 Creating workout_plans table...');

      await queryInterface.createTable('workout_plans', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          comment: 'Auto-incrementing primary key'
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'Client this plan is for'
        },
        trainer_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'Trainer who created this plan'
        },
        title: {
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: 'Plan title'
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Plan overview'
        },
        nasm_phase: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'NASM OPT phase (1-5)'
        },
        start_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
          comment: 'Planned start date'
        },
        end_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
          comment: 'Planned end date'
        },
        duration_weeks: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 4,
          comment: 'Total weeks in program'
        },
        status: {
          type: Sequelize.ENUM('active', 'paused', 'completed', 'draft'),
          defaultValue: 'active',
          allowNull: false,
          comment: 'Plan status'
        },
        current_week: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
          comment: 'Current week cursor'
        },
        current_day: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
          comment: 'Current day cursor within the week'
        },
        plan_data: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: { weeks: [] },
          comment: 'Full plan: weeks → sessions → exercises'
        },
        progress_notes: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
          comment: 'Trainer notes array'
        },
        created_by: {
          type: Sequelize.STRING(50),
          allowNull: true,
          defaultValue: 'trainer',
          comment: 'Creator: ai, trainer, or admin'
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
          comment: 'Extra metadata'
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
          comment: 'Record creation timestamp'
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
          comment: 'Record update timestamp'
        }
      }, { transaction });

      // ─────────────────────────────────────────────────────────────
      // SECTION: Indexes
      // PURPOSE: Fast lookups by userId, trainerId, and status
      // ─────────────────────────────────────────────────────────────
      await queryInterface.addIndex('workout_plans', ['user_id'], {
        name: 'idx_workout_plans_user_id',
        transaction
      });

      await queryInterface.addIndex('workout_plans', ['trainer_id'], {
        name: 'idx_workout_plans_trainer_id',
        transaction
      });

      await queryInterface.addIndex('workout_plans', ['status'], {
        name: 'idx_workout_plans_status',
        transaction
      });

      await queryInterface.addIndex('workout_plans', ['user_id', 'status'], {
        name: 'idx_workout_plans_user_status',
        transaction
      });

      await transaction.commit();
      console.log('✅ workout_plans table created successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Failed to create workout_plans:', error.message);
      throw error;
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('workout_plans');
    // Clean up ENUM type
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_workout_plans_status";'
    ).catch(() => {});
  }
};
