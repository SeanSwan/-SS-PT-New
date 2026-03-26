/**
 * ============================================================================
 * MIGRATION: CreatePainEntryCorrectiveExercises
 * PURPOSE: Junction table linking pain entries to corrective exercises
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 *   Creates the PainEntryCorrectiveExercises junction table that replaces
 *   ARRAY/JSONB columns for storing corrective exercise protocols. This
 *   enables proper referential integrity and query efficiency.
 *
 * HOW IT FITS IN THE APP:
 *   ClientPainEntry → PainEntryCorrectiveExercises → Exercises
 *   AI postural analysis writes corrective protocols to this table.
 *
 * KEY DECISIONS:
 *   Junction table over ARRAY column per AI Village Phase 2 consensus.
 *   Phase column (inhibit/lengthen/activate/integrate) maps to NASM CES protocol.
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Idempotency check
    const tableExists = await queryInterface.describeTable('PainEntryCorrectiveExercises').catch(() => null);
    if (tableExists) {
      console.log('PainEntryCorrectiveExercises table already exists, skipping');
      return;
    }

    await queryInterface.createTable('PainEntryCorrectiveExercises', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      painEntryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ClientPainEntries',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      exerciseId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'exercises',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      // NASM CES corrective protocol phase
      phase: {
        type: Sequelize.STRING(20),
        allowNull: false,
        validate: {
          isIn: [['inhibit', 'lengthen', 'activate', 'integrate']],
        },
        comment: 'NASM CES phase: inhibit (foam roll), lengthen (stretch), activate (strengthen), integrate (compound)',
      },
      // Ordering within same phase
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      // AI-generated guidance for this specific exercise
      aiNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'AI-generated instruction for this corrective exercise',
      },
      // Sets/reps/duration recommendation from AI
      prescription: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
        comment: 'JSON: { sets, reps, holdSeconds, frequency }',
      },
      // Source tracking
      source: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'ai_analysis',
        comment: 'How this was added: ai_analysis, manual, template',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Composite unique constraint: one exercise per phase per pain entry
    await queryInterface.addIndex('PainEntryCorrectiveExercises', ['painEntryId', 'exerciseId', 'phase'], {
      unique: true,
      name: 'idx_unique_pain_exercise_phase',
    });

    // Index for querying all corrective exercises for a pain entry
    await queryInterface.addIndex('PainEntryCorrectiveExercises', ['painEntryId'], {
      name: 'idx_pain_corrective_pain_entry',
    });

    // Index for finding which pain entries reference a specific exercise
    await queryInterface.addIndex('PainEntryCorrectiveExercises', ['exerciseId'], {
      name: 'idx_pain_corrective_exercise',
    });

    console.log('Created PainEntryCorrectiveExercises junction table with indexes');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('PainEntryCorrectiveExercises');
    console.log('Dropped PainEntryCorrectiveExercises table');
  },
};
