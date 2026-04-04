'use strict';

/**
 * Migration: Add variation and modification columns to Exercises table.
 * These columns store easier/harder alternatives and joint-specific
 * modifications for Board 2 (Modified) class generation.
 *
 * CRITICAL: These columns existed in the Sequelize model but were never
 * actually created in the production database. This migration fixes that.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('Exercises').catch(() => ({}));

    const addIfMissing = async (col, type) => {
      if (!columns[col]) {
        await queryInterface.addColumn('Exercises', col, {
          type,
          allowNull: true,
        });
        console.log(`  Added column: Exercises.${col}`);
      } else {
        console.log(`  Column exists: Exercises.${col}`);
      }
    };

    await addIfMissing('easyVariation', Sequelize.STRING(255));
    await addIfMissing('mediumVariation', Sequelize.STRING(255));
    await addIfMissing('hardVariation', Sequelize.STRING(255));
    await addIfMissing('kneeMod', Sequelize.STRING(255));
    await addIfMissing('shoulderMod', Sequelize.STRING(255));
    await addIfMissing('ankleMod', Sequelize.STRING(255));
    await addIfMissing('wristMod', Sequelize.STRING(255));
    await addIfMissing('backMod', Sequelize.STRING(255));
    await addIfMissing('equipment', Sequelize.JSONB);
  },

  async down(queryInterface) {
    const removeSafe = async (col) => {
      try {
        await queryInterface.removeColumn('Exercises', col);
      } catch { /* column may not exist */ }
    };

    await removeSafe('easyVariation');
    await removeSafe('mediumVariation');
    await removeSafe('hardVariation');
    await removeSafe('kneeMod');
    await removeSafe('shoulderMod');
    await removeSafe('ankleMod');
    await removeSafe('wristMod');
    await removeSafe('backMod');
    await removeSafe('equipment');
  },
};
