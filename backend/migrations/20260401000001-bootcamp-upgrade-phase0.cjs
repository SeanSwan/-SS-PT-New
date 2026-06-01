'use strict';

/**
 * ============================================================================
 * MIGRATION: Bootcamp Creator Upgrade — Phase 0a
 * PURPOSE: Add fields for board variants, pyramid/superset formats,
 *          stretch module, flow optimization, and Exercise Rolodex link.
 * STRATEGY: Zero-downtime — all new fields are nullable with defaults.
 *           Backfill + constraints added in a later migration.
 * ============================================================================
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. New ENUMs ─────────────────────────────────────────────
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_bootcamp_templates_classStyle" AS ENUM(
        'standard', 'pyramid', 'superset', 'mixed'
      );
    `).catch(() => {});

    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_bootcamp_templates_intensityCategory" AS ENUM(
        'high_impact', 'medium_impact', 'calisthenics',
        'stability', 'flexibility', 'cardio'
      );
    `).catch(() => {});

    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_bootcamp_exercises_board" AS ENUM('main', 'alternative');
    `).catch(() => {});

    // ── 2. Add columns to bootcamp_templates ─────────────────────
    await queryInterface.addColumn('bootcamp_templates', 'classStyle', {
      type: '"enum_bootcamp_templates_classStyle"',
      defaultValue: 'standard',
    });

    await queryInterface.addColumn('bootcamp_templates', 'intensityCategory', {
      type: '"enum_bootcamp_templates_intensityCategory"',
    });

    await queryInterface.addColumn('bootcamp_templates', 'rounds', {
      type: Sequelize.INTEGER,
    });

    await queryInterface.addColumn('bootcamp_templates', 'exerciseDurationSec', {
      type: Sequelize.INTEGER,
    });

    await queryInterface.addColumn('bootcamp_templates', 'includeStretch', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    });

    await queryInterface.addColumn('bootcamp_templates', 'stretchDurationMin', {
      type: Sequelize.INTEGER,
      defaultValue: 3,
    });

    // ── 3. Add columns to bootcamp_exercises ─────────────────────
    await queryInterface.addColumn('bootcamp_exercises', 'board', {
      type: '"enum_bootcamp_exercises_board"',
      defaultValue: 'main',
    });

    await queryInterface.addColumn('bootcamp_exercises', 'setupTimeSec', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    });

    await queryInterface.addColumn('bootcamp_exercises', 'pyramidStartWeight', {
      type: Sequelize.STRING(50),
    });

    await queryInterface.addColumn('bootcamp_exercises', 'pyramidDrops', {
      type: Sequelize.INTEGER,
    });

    await queryInterface.addColumn('bootcamp_exercises', 'supersetOrder', {
      type: Sequelize.INTEGER,
    });

    await queryInterface.addColumn('bootcamp_exercises', 'supersetGroupId', {
      type: Sequelize.INTEGER,
    });

    // Link to the Exercise Rolodex (exercise_library table)
    // Using constraints: false because exercise_library may not exist
    // in all environments at migration time
    await queryInterface.addColumn('bootcamp_exercises', 'exerciseLibraryId', {
      type: Sequelize.INTEGER,
      references: { model: 'exercise_library', key: 'id' },
      onDelete: 'SET NULL',
    }).catch(() => {
      // If exercise_library table doesn't exist, add without FK
      return queryInterface.addColumn('bootcamp_exercises', 'exerciseLibraryId', {
        type: Sequelize.INTEGER,
      });
    });

    // ── 4. Create bootcamp_stretches table ───────────────────────
    await queryInterface.createTable('bootcamp_stretches', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      templateId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bootcamp_templates', key: 'id' },
        onDelete: 'CASCADE',
        field: 'templateId',
      },
      exerciseName: {
        type: Sequelize.STRING(100),
        allowNull: false,
        field: 'exerciseName',
      },
      targetMuscles: {
        type: Sequelize.STRING(200),
        field: 'targetMuscles',
      },
      durationSec: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30,
        field: 'durationSec',
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'sortOrder',
      },
      description: {
        type: Sequelize.TEXT,
      },
      exerciseLibraryId: {
        type: Sequelize.INTEGER,
        field: 'exerciseLibraryId',
      },
    });

    await queryInterface.addIndex('bootcamp_stretches', ['templateId'], {
      name: 'idx_bootcamp_stretches_template',
    });

    // ── 5. Indexes for new exercise columns ──────────────────────
    await queryInterface.addIndex('bootcamp_exercises', ['board'], {
      name: 'idx_bootcamp_exercises_board',
    });

    await queryInterface.addIndex('bootcamp_exercises', ['exerciseLibraryId'], {
      name: 'idx_bootcamp_exercises_library',
    }).catch(() => {}); // Ignore if exerciseLibraryId didn't get created

    await queryInterface.addIndex('bootcamp_exercises', ['supersetGroupId'], {
      name: 'idx_bootcamp_exercises_superset',
    });

    await queryInterface.addIndex('bootcamp_templates', ['classStyle'], {
      name: 'idx_bootcamp_templates_style',
    });

    await queryInterface.addIndex('bootcamp_templates', ['intensityCategory'], {
      name: 'idx_bootcamp_templates_intensity',
    });
  },

  async down(queryInterface) {
    // Drop new table
    await queryInterface.dropTable('bootcamp_stretches').catch(() => {});

    // Drop indexes
    const indexes = [
      'idx_bootcamp_exercises_board',
      'idx_bootcamp_exercises_library',
      'idx_bootcamp_exercises_superset',
      'idx_bootcamp_templates_style',
      'idx_bootcamp_templates_intensity',
    ];
    for (const idx of indexes) {
      await queryInterface.removeIndex('bootcamp_exercises', idx).catch(() => {});
      await queryInterface.removeIndex('bootcamp_templates', idx).catch(() => {});
    }

    // Drop exercise columns
    const exerciseCols = [
      'board', 'setupTimeSec', 'pyramidStartWeight',
      'pyramidDrops', 'supersetOrder', 'supersetGroupId', 'exerciseLibraryId',
    ];
    for (const col of exerciseCols) {
      await queryInterface.removeColumn('bootcamp_exercises', col).catch(() => {});
    }

    // Drop template columns
    const templateCols = [
      'classStyle', 'intensityCategory', 'rounds',
      'exerciseDurationSec', 'includeStretch', 'stretchDurationMin',
    ];
    for (const col of templateCols) {
      await queryInterface.removeColumn('bootcamp_templates', col).catch(() => {});
    }

    // Drop ENUMs
    const types = [
      'enum_bootcamp_templates_classStyle',
      'enum_bootcamp_templates_intensityCategory',
      'enum_bootcamp_exercises_board',
    ];
    for (const t of types) {
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${t}";`).catch(() => {});
    }
  },
};
