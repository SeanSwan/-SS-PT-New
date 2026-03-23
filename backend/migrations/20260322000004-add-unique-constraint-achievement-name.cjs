'use strict';

/**
 * ============================================================================
 * MIGRATION: Add UNIQUE constraint on Achievements.name
 * PURPOSE: Prevent duplicate achievement records by enforcing uniqueness on name
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS DOES:
 * 1. Removes duplicate Achievement rows (keeps earliest by createdAt per name)
 * 2. Adds a UNIQUE constraint on the "name" column
 *
 * WHY: The Achievements table can accumulate duplicates from repeated seeder
 * runs or concurrent inserts. A DB-level constraint prevents this permanently.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // ─────────────────────────────────────────────────────────────
      // STEP 1: Remove duplicate achievements, keeping the earliest
      // record (by createdAt) for each unique name.
      // Uses a CTE to identify duplicates via ROW_NUMBER().
      // ─────────────────────────────────────────────────────────────
      const [duplicates] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) AS dup_count FROM (
           SELECT "name", COUNT(*) AS cnt
           FROM "Achievements"
           GROUP BY "name"
           HAVING COUNT(*) > 1
         ) sub;`,
        { transaction }
      );

      const dupCount = parseInt(duplicates[0]?.dup_count || '0', 10);

      if (dupCount > 0) {
        console.log(`Found ${dupCount} achievement name(s) with duplicates — cleaning up...`);

        await queryInterface.sequelize.query(
          `DELETE FROM "Achievements"
           WHERE id IN (
             SELECT id FROM (
               SELECT id,
                      ROW_NUMBER() OVER (PARTITION BY "name" ORDER BY "createdAt" ASC, id ASC) AS rn
               FROM "Achievements"
             ) ranked
             WHERE rn > 1
           );`,
          { transaction }
        );

        console.log('Duplicate achievements removed (kept earliest record per name).');
      } else {
        console.log('No duplicate achievement names found — skipping dedup.');
      }

      // ─────────────────────────────────────────────────────────────
      // STEP 2: Add UNIQUE constraint on the "name" column
      // ─────────────────────────────────────────────────────────────
      await queryInterface.addConstraint('Achievements', {
        fields: ['name'],
        type: 'unique',
        name: 'achievements_name_unique',
        transaction,
      });

      console.log('UNIQUE constraint "achievements_name_unique" added to Achievements.name.');

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('Achievements', 'achievements_name_unique');
    console.log('UNIQUE constraint "achievements_name_unique" removed from Achievements.name.');
  },
};
