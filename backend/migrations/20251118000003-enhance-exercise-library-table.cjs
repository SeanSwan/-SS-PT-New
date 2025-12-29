'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║        ENHANCE EXERCISE LIBRARY TABLE MIGRATION (Sequelize)              ║
 * ║      (Add Video Library Integration Fields to Exercise Library)         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Purpose: Ensure exercise_library table has all required NASM fields for
 *          video library integration and comprehensive exercise management
 *
 * Blueprint Reference: docs/ai-workflow/ADMIN-VIDEO-LIBRARY-BACKEND-IMPLEMENTATION-PLAN.md
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      MIGRATION STRATEGY                                  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * This migration is IDEMPOTENT and handles two scenarios:
 *
 * SCENARIO 1: exercise_library table DOES NOT exist
 *   - Create complete exercise_library table with all fields
 *   - Create all indexes (B-tree + GIN)
 *   - Table ready for immediate use
 *
 * SCENARIO 2: exercise_library table EXISTS (from earlier migration)
 *   - Check for missing columns (nasm_phases, movement_patterns, etc.)
 *   - Add missing columns if not present
 *   - Create missing indexes if not present
 *   - Safe ALTER TABLE operations (non-destructive)
 *
 * This approach ensures migration succeeds whether:
 * - Running on fresh database (creates full table)
 * - Running on existing database (adds missing fields only)
 * - Re-running migration (skips existing fields)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                   FIELDS ADDED/ENSURED BY THIS MIGRATION                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * CORE EXERCISE FIELDS:
 * - id (UUID, PK)
 * - name (VARCHAR(200))
 * - description (TEXT)
 * - primary_muscle (VARCHAR(50))
 * - secondary_muscles (VARCHAR(50)[]) - PostgreSQL ARRAY type
 * - equipment (VARCHAR(50))
 * - difficulty (VARCHAR(20))
 *
 * NASM INTEGRATION FIELDS (Added by this migration):
 * - movement_patterns (VARCHAR(50)[]) - PostgreSQL ARRAY type
 *   Example: ['squatting', 'pushing', 'hinging']
 *
 * - nasm_phases (INTEGER[]) - PostgreSQL ARRAY type
 *   Example: [1, 2, 3, 4, 5] (NASM OPT™ Model phases)
 *
 * - contraindications (JSONB)
 *   Example: {"conditions": ["knee_injury", "pregnancy"], "notes": "Avoid if..."}
 *
 * - acute_variables (JSONB)
 *   Example: {
 *     "phase_1": {"sets": "1-3", "reps": "12-20", "tempo": "4/2/1", "rest": "0-90s"},
 *     "phase_3": {"sets": "3-5", "reps": "6-12", "tempo": "2/0/2", "rest": "0-60s"}
 *   }
 *
 * SOFT DELETE & STATUS FIELDS:
 * - deletedAt (TIMESTAMP) - Soft delete support
 * - is_active (BOOLEAN) - Active/inactive status
 *
 * AUDIT FIELDS:
 * - created_by (UUID FK → Users.id) - Admin/trainer who created exercise
 * - createdAt (TIMESTAMP)
 * - updatedAt (TIMESTAMP)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     BUSINESS LOGIC (WHY SECTIONS)                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY movement_patterns ARRAY (Not JSONB)?
 * - Simple array of strings: ['squatting', 'pushing', 'hinging']
 * - PostgreSQL native array type: Efficient storage and querying
 * - GIN index support: Fast array containment queries
 * - Query: WHERE 'squatting' = ANY(movement_patterns)
 * - Flexible: Can add new movement patterns without schema changes
 * - NASM taxonomy: 8 fundamental movement patterns
 *
 * WHY nasm_phases ARRAY(INTEGER) (Not JSONB)?
 * - Simple array of phase numbers: [1, 2, 3, 4, 5]
 * - PostgreSQL native array type: Efficient storage
 * - GIN index support: Fast phase filtering
 * - Query: WHERE 3 = ANY(nasm_phases) (exercises for Phase 3)
 * - Multi-phase exercises: Push-ups work in ALL phases [1,2,3,4,5]
 * - NASM OPT™ Model: 5 phases of training progression
 *
 * WHY contraindications JSONB (Not ARRAY)?
 * - Flexible schema: Can include conditions, notes, severity levels
 * - Example: {
 *     "conditions": ["knee_injury", "shoulder_impingement"],
 *     "notes": "Avoid if recent ACL surgery",
 *     "severity": "high"
 *   }
 * - Extensible: Can add new fields without migration
 * - Safety: Prevent exercise prescription for injured clients
 * - Legal protection: Documented safety considerations
 *
 * WHY acute_variables JSONB?
 * - Phase-specific programming parameters
 * - Example: Different sets/reps/tempo for each NASM phase
 * - Flexible schema: Can add new parameters (intensity, rest, etc.)
 * - Trainer reference: Display recommended programming during workout creation
 * - No schema bloat: Avoid 20+ columns for phase-specific data
 * - NASM alignment: Maps directly to OPT™ Model acute variable guidelines
 *
 * WHY created_by FK to Users (INTEGER)?
 * - Track who created each exercise (admin/trainer attribution)
 * - SET NULL on delete: Preserve exercise even if creator account deleted
 * - Audit trail: "Exercise created by John Doe on 2024-01-15"
 * - Quality control: Track exercise creation patterns by user
 * - CRITICAL: Users.id is INTEGER, not UUID!
 *
 * WHY is_active BOOLEAN (In addition to deletedAt)?
 * - Dual-layer status: is_active=false (temporarily disabled) vs deletedAt (soft deleted)
 * - Use case: Seasonal exercises (is_active=false in off-season)
 * - Use case: Under review (is_active=false until approved)
 * - Query: WHERE is_active=true AND deletedAt IS NULL (fully active)
 * - Reversible: Can reactivate without un-deleting
 *
 * WHY Check tableExists() First?
 * - Idempotent migration: Safe to run multiple times
 * - Two scenarios: Fresh DB (create table) vs Existing DB (add columns)
 * - Prevents errors: CREATE TABLE IF NOT EXISTS is not supported in Sequelize
 * - Production safety: Won't drop existing data
 *
 * WHY describeTable() for Column Checks?
 * - Safe column addition: Only add if column doesn't exist
 * - Prevents errors: ALTER TABLE ADD COLUMN fails if column exists
 * - Backwards compatible: Works with partial exercise_library tables
 * - Flexible: Can add new fields to existing tables
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        DATA TYPE NOTES                                   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * CRITICAL: Data type consistency for foreign keys:
 * - Users.id is INTEGER (not UUID)
 * - exercise_library.id is UUID
 * - Any FK to users.id MUST be INTEGER
 * - Any FK to exercise_library.id MUST be UUID
 *
 * Array Types:
 * - Sequelize.ARRAY(Sequelize.STRING(50)) → VARCHAR(50)[]
 * - Sequelize.ARRAY(Sequelize.INTEGER) → INTEGER[]
 * - PostgreSQL native array types for efficient storage/querying
 *
 * JSONB vs JSON:
 * - Always use JSONB (Binary JSON) for better performance
 * - Supports indexing (GIN indexes)
 * - Faster queries than TEXT/JSON columns
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      INDEXES CREATED                                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * B-tree Indexes (Standard equality/range queries):
 * - idx_exercise_library_primary_muscle (primary_muscle)
 * - idx_exercise_library_equipment (equipment)
 * - idx_exercise_library_difficulty (difficulty)
 *
 * GIN Indexes (Array containment queries):
 * - idx_exercise_library_nasm_phases (nasm_phases)
 *   Query: WHERE 3 = ANY(nasm_phases)
 * - idx_exercise_library_movement_patterns (movement_patterns)
 *   Query: WHERE 'squatting' = ANY(movement_patterns)
 *
 * Note: GIN indexes use raw SQL because Sequelize doesn't support
 * GIN index syntax directly in addIndex() method.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      MIGRATION SAFETY NOTES                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Idempotent design: Safe to run multiple times
 * - Transaction wrapped: All operations commit/rollback together
 * - Non-destructive: Only ADD columns/indexes, never DROP
 * - Backwards compatible: Works with partial tables
 * - Safe for production: ALTER TABLE is non-blocking for PostgreSQL
 * - No data loss: Existing data preserved
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    RELATED FILES & DEPENDENCIES                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Depends On:
 * - Users table (for created_by FK)
 * - May depend on: 20251113000000-create-exercise-library-table.cjs
 *   (if that migration created initial table)
 *
 * Related Code:
 * - backend/models/ExerciseLibrary.mjs (Sequelize model)
 * - backend/controllers/exerciseLibraryController.mjs (CRUD operations)
 * - backend/services/nasmProgrammingService.mjs (NASM OPT™ logic)
 * - frontend/src/pages/Admin/ExerciseLibrary.tsx (Admin management)
 *
 * Related Migrations:
 * - 20251113000000-create-exercise-library-table.cjs (may create base table)
 * - 20251113000001-create-exercise-videos-table.cjs (child table references exercise_library.id)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Check if table exists
      const tables = await queryInterface.showAllTables();
      const tableExists = tables.includes('exercise_library');

      if (!tableExists) {
        // ═══════════════════════════════════════════════════════════════
        // SCENARIO 1: Table does NOT exist - Create complete table
        // ═══════════════════════════════════════════════════════════════
        console.log('🏗️  Creating complete exercise_library table with all NASM fields...');

        await queryInterface.createTable('exercise_library', {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
            allowNull: false
          },
          name: {
            type: Sequelize.STRING(200),
            allowNull: false,
            comment: 'Exercise name (e.g., "Barbell Back Squat")'
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: false,
            comment: 'Full exercise description with form cues'
          },
          primary_muscle: {
            type: Sequelize.STRING(50),
            allowNull: false,
            comment: 'Primary muscle targeted'
          },
          secondary_muscles: {
            type: Sequelize.ARRAY(Sequelize.STRING(50)),
            allowNull: true,
            defaultValue: [],
            comment: 'Array of secondary muscles: ["triceps", "shoulders"]'
          },
          equipment: {
            type: Sequelize.STRING(50),
            allowNull: false,
            comment: 'Required equipment'
          },
          difficulty: {
            type: Sequelize.STRING(20),
            allowNull: false,
            comment: 'Exercise difficulty: beginner, intermediate, advanced'
          },
          movement_patterns: {
            type: Sequelize.ARRAY(Sequelize.STRING(50)),
            allowNull: true,
            defaultValue: [],
            comment: 'Array of movement patterns: ["squatting", "pushing", "hinging"]'
          },
          nasm_phases: {
            type: Sequelize.ARRAY(Sequelize.INTEGER),
            allowNull: true,
            defaultValue: [],
            comment: 'Array of NASM phases: [1, 2, 3, 4, 5]'
          },
          contraindications: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: {},
            comment: 'Safety restrictions: {conditions: ["knee_injury"], notes: "..."}'
          },
          acute_variables: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: {},
            comment: 'Phase-specific programming: {phase_1: {sets: "1-3", reps: "12-20", ...}}'
          },
          created_by: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'Users',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
            comment: 'FK to Users.id (INTEGER) - admin/trainer who created exercise'
          },
          deletedAt: {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'Soft delete timestamp (NULL = active)'
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: 'Active status (independent of soft delete)'
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          }
        }, { transaction });

        // Create B-tree indexes
        console.log('📇 Creating B-tree indexes...');
        await queryInterface.addIndex('exercise_library', ['primary_muscle'], {
          name: 'idx_exercise_library_primary_muscle',
          transaction
        });
        await queryInterface.addIndex('exercise_library', ['equipment'], {
          name: 'idx_exercise_library_equipment',
          transaction
        });
        await queryInterface.addIndex('exercise_library', ['difficulty'], {
          name: 'idx_exercise_library_difficulty',
          transaction
        });

        // Create GIN indexes (using raw SQL for array types)
        console.log('📇 Creating GIN indexes for array fields...');
        await queryInterface.sequelize.query(
          `CREATE INDEX idx_exercise_library_nasm_phases ON exercise_library USING GIN (nasm_phases);`,
          { transaction }
        );
        await queryInterface.sequelize.query(
          `CREATE INDEX idx_exercise_library_movement_patterns ON exercise_library USING GIN (movement_patterns);`,
          { transaction }
        );

        console.log('✅ exercise_library table created successfully with all NASM fields');
      } else {
        // ═══════════════════════════════════════════════════════════════
        // SCENARIO 2: Table EXISTS - Add missing columns only
        // ═══════════════════════════════════════════════════════════════
        console.log('🔍 Table exercise_library exists, checking for missing columns...');

        const tableInfo = await queryInterface.describeTable('exercise_library');

        // Add nasm_phases column if missing
        if (!tableInfo.nasm_phases) {
          console.log('➕ Adding nasm_phases column...');
          await queryInterface.addColumn('exercise_library', 'nasm_phases', {
            type: Sequelize.ARRAY(Sequelize.INTEGER),
            allowNull: true,
            defaultValue: []
          }, { transaction });

          await queryInterface.sequelize.query(
            `CREATE INDEX idx_exercise_library_nasm_phases ON exercise_library USING GIN (nasm_phases);`,
            { transaction }
          );
        }

        // Add movement_patterns column if missing
        if (!tableInfo.movement_patterns) {
          console.log('➕ Adding movement_patterns column...');
          await queryInterface.addColumn('exercise_library', 'movement_patterns', {
            type: Sequelize.ARRAY(Sequelize.STRING(50)),
            allowNull: true,
            defaultValue: []
          }, { transaction });

          await queryInterface.sequelize.query(
            `CREATE INDEX idx_exercise_library_movement_patterns ON exercise_library USING GIN (movement_patterns);`,
            { transaction }
          );
        }

        // Add contraindications column if missing
        if (!tableInfo.contraindications) {
          console.log('➕ Adding contraindications column...');
          await queryInterface.addColumn('exercise_library', 'contraindications', {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: {}
          }, { transaction });
        }

        // Add acute_variables column if missing
        if (!tableInfo.acute_variables) {
          console.log('➕ Adding acute_variables column...');
          await queryInterface.addColumn('exercise_library', 'acute_variables', {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: {}
          }, { transaction });
        }

        // Add deletedAt column if missing (soft delete support)
        if (!tableInfo.deletedAt) {
          console.log('➕ Adding deletedAt column...');
          await queryInterface.addColumn('exercise_library', 'deletedAt', {
            type: Sequelize.DATE,
            allowNull: true
          }, { transaction });
        }

        // Add is_active column if missing
        if (!tableInfo.is_active) {
          console.log('➕ Adding is_active column...');
          await queryInterface.addColumn('exercise_library', 'is_active', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true
          }, { transaction });
        }

        // Add created_by column if missing
        if (!tableInfo.created_by) {
          console.log('➕ Adding created_by column...');
          await queryInterface.addColumn('exercise_library', 'created_by', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'Users',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          }, { transaction });
        }

        console.log('✅ exercise_library table updated with missing NASM fields');
      }

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
      console.log('⚠️  Rollback: This migration does not drop exercise_library table');
      console.log('   (to prevent accidental data loss)');
      console.log('   If you need to remove added columns, run manual ALTER TABLE commands.');

      // We intentionally do NOT drop the table or columns here
      // to prevent accidental data loss during development cycles.
      //
      // If you need to truly rollback, manually run:
      // ALTER TABLE exercise_library DROP COLUMN nasm_phases;
      // ALTER TABLE exercise_library DROP COLUMN movement_patterns;
      // ALTER TABLE exercise_library DROP COLUMN contraindications;
      // ALTER TABLE exercise_library DROP COLUMN acute_variables;
      // ALTER TABLE exercise_library DROP COLUMN deletedAt;
      // ALTER TABLE exercise_library DROP COLUMN is_active;
      // ALTER TABLE exercise_library DROP COLUMN created_by;

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
