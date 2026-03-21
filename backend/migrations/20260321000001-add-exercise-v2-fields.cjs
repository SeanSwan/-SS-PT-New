'use strict';

/**
 * Migration: Add V2 fields to Exercises table
 *
 * Adds columns required by the V2.0 Master Blueprint:
 * - exercise_key: Immutable unique slug (replaces name-based findOrCreate)
 * - source: Track where the exercise came from (nasm, free-exercise-db, custom, etc.)
 * - force: Push/pull/static classification
 * - mechanic: Compound vs isolation
 * - aliases: JSON array of alternate names for fuzzy search
 * - optPhases: JSON array of which NASM OPT phases this exercise fits
 * - nasmMovementPattern: NASM movement classification
 * - thumbnailUrl: GIF/image thumbnail for rolodex display
 * - defaultTempo: Default tempo notation (e.g., "4/2/1")
 * - defaultRestSeconds: Default rest period in seconds
 * - bodyPartCategory: Mobile-friendly filter chip category
 *
 * CEO Ruling: exercise_key must be VARCHAR(255) UNIQUE NOT NULL
 * Backfill existing records with slugified name as exercise_key
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('Exercises').catch(() => null);
    if (!tableDesc) {
      console.log('Exercises table does not exist — skipping V2 field additions');
      return;
    }

    // Track which columns we actually add (for idempotent reruns)
    const columnsToAdd = {
      exercise_key: {
        type: Sequelize.STRING(255),
        allowNull: true, // Start nullable, backfill, then make NOT NULL
        unique: true,
      },
      source: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'nasm',
        comment: 'Origin: nasm, free-exercise-db, wrkout, p90x, custom',
      },
      force: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'push, pull, static, or null for flexibility/cardio',
      },
      mechanic: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'compound, isolation, or null',
      },
      aliases: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'JSON array of alternate exercise names for search',
      },
      optPhases: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'JSON array of NASM OPT phase numbers (1-5) this exercise fits',
      },
      nasmMovementPattern: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'NASM movement pattern: squat, hinge, push, pull, press, rotation, gait',
      },
      thumbnailUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'URL to exercise GIF or thumbnail image',
      },
      defaultTempo: {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: 'Default tempo notation, e.g. "4/2/1"',
      },
      defaultRestSeconds: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Default rest period in seconds',
      },
      bodyPartCategory: {
        type: Sequelize.STRING(30),
        allowNull: true,
        comment: 'Mobile filter chip: chest, back, shoulders, arms, legs, core, full_body, recovery, cardio',
      },
    };

    // Add each column only if it doesn't already exist
    for (const [colName, colDef] of Object.entries(columnsToAdd)) {
      if (!tableDesc[colName]) {
        console.log(`Adding column: Exercises.${colName}`);
        await queryInterface.addColumn('Exercises', colName, colDef);
      } else {
        console.log(`Column Exercises.${colName} already exists — skipping`);
      }
    }

    // Backfill exercise_key from existing name values
    // Uses LOWER + regex to create a slug: "Barbell Bench Press" → "nasm-barbell-bench-press"
    await queryInterface.sequelize.query(`
      UPDATE "Exercises"
      SET exercise_key = 'nasm-' || LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
      WHERE exercise_key IS NULL;
    `);

    // Now make exercise_key NOT NULL (all rows backfilled)
    if (!tableDesc.exercise_key) {
      await queryInterface.changeColumn('Exercises', 'exercise_key', {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      });
    }

    // Add indexes for performance (CEO ruling: both single and composite)
    // GIN trigram index for fuzzy name search
    await queryInterface.sequelize.query(`
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
    `).catch(() => console.log('pg_trgm extension already exists or cannot be created'));

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_exercises_name_trgm ON "Exercises" USING gin (name gin_trgm_ops);
    `).catch(() => console.log('Trigram index already exists'));

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_exercises_exercise_key ON "Exercises" (exercise_key);
    `).catch(() => console.log('exercise_key index already exists'));

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_exercises_body_part_category ON "Exercises" ("bodyPartCategory");
    `).catch(() => console.log('bodyPartCategory index already exists'));

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_exercises_source ON "Exercises" (source);
    `).catch(() => console.log('source index already exists'));

    console.log('V2 exercise fields migration complete');
  },

  async down(queryInterface) {
    const columnsToRemove = [
      'exercise_key', 'source', 'force', 'mechanic', 'aliases',
      'optPhases', 'nasmMovementPattern', 'thumbnailUrl',
      'defaultTempo', 'defaultRestSeconds', 'bodyPartCategory',
    ];

    for (const colName of columnsToRemove) {
      await queryInterface.removeColumn('Exercises', colName).catch(() => {
        console.log(`Column Exercises.${colName} does not exist — skipping removal`);
      });
    }

    // Remove indexes
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_exercises_name_trgm;').catch(() => {});
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_exercises_exercise_key;').catch(() => {});
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_exercises_body_part_category;').catch(() => {});
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_exercises_source;').catch(() => {});
  },
};
