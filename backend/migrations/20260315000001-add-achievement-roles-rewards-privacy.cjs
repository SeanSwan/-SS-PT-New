'use strict';

/**
 * Migration: Add targetRoles, rewards, rewardType, issuance to Achievements
 *            + profileVisibility and privacy toggles to Users
 *
 * AI Village 9-Brain Consensus (2026-03-15):
 * - Dual-axis classification: category (what) + targetRoles (who)
 * - JSONB rewards array for multi-reward support without JOIN overhead
 * - Application-level privacy (not DB RLS) per CTO/CEO debate
 * - Category ENUM expanded with 'community' value
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: ALTER TYPE cannot run inside a transaction in PostgreSQL
    // Do this BEFORE the transaction block
    try {
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_Achievements_category" ADD VALUE IF NOT EXISTS 'community';`
      );
      console.log('Added community to category enum');
    } catch (e) {
      // Enum value may already exist or enum type may not exist — safe to skip
      console.log('Skipping enum alteration:', e.message);
    }

    // Step 2: Add columns in a transaction (idempotent — check before adding)
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Helper: only add column if it doesn't exist yet
      const safeAddColumn = async (table, column, definition) => {
        try {
          const desc = await queryInterface.describeTable(table);
          if (desc[column]) {
            console.log(`⏭️  ${table}.${column} already exists, skipping`);
            return;
          }
        } catch (e) { /* table might not exist yet — let addColumn handle it */ }
        await queryInterface.addColumn(table, column, definition, { transaction });
        console.log(`➕ Added ${table}.${column}`);
      };

      // ── Achievement model additions ──
      await safeAddColumn('Achievements', 'targetRoles', {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: ['user'],
        comment: 'Roles eligible for this achievement'
      });

      await safeAddColumn('Achievements', 'rewardType', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'badge'
      });

      await safeAddColumn('Achievements', 'issuance', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'auto'
      });

      await safeAddColumn('Achievements', 'rewards', {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of reward objects: [{type, value, description}]'
      });

      // Index on targetRoles for GIN queries
      await queryInterface.addIndex('Achievements', {
        fields: ['targetRoles'],
        using: 'GIN',
        name: 'idx_achievements_target_roles',
        transaction
      }).catch(() => {});

      // ── User model privacy additions ──
      await safeAddColumn('Users', 'profileVisibility', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'public',
        comment: 'public | friends_only | private'
      });

      await safeAddColumn('Users', 'showBadges', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });

      await safeAddColumn('Users', 'showAchievements', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });

      await safeAddColumn('Users', 'showStats', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });

      await safeAddColumn('Users', 'showWorkoutHistory', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });

      await safeAddColumn('Users', 'showLevel', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });

      // Index on profileVisibility
      await queryInterface.addIndex('Users', {
        fields: ['profileVisibility'],
        name: 'idx_users_profile_visibility',
        transaction
      }).catch(() => {});

      await transaction.commit();
      console.log('Migration up: achievement roles/rewards + user privacy fields added');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Remove User privacy fields
      await queryInterface.removeColumn('Users', 'showLevel', { transaction });
      await queryInterface.removeColumn('Users', 'showWorkoutHistory', { transaction });
      await queryInterface.removeColumn('Users', 'showStats', { transaction });
      await queryInterface.removeColumn('Users', 'showAchievements', { transaction });
      await queryInterface.removeColumn('Users', 'showBadges', { transaction });
      await queryInterface.removeColumn('Users', 'profileVisibility', { transaction });

      // Remove Achievement fields
      await queryInterface.removeColumn('Achievements', 'rewards', { transaction });
      await queryInterface.removeColumn('Achievements', 'issuance', { transaction });
      await queryInterface.removeColumn('Achievements', 'rewardType', { transaction });
      await queryInterface.removeColumn('Achievements', 'targetRoles', { transaction });

      // Remove indexes (safe to ignore if they don't exist)
      await queryInterface.removeIndex('Users', 'idx_users_profile_visibility', { transaction }).catch(() => {});
      await queryInterface.removeIndex('Achievements', 'idx_achievements_target_roles', { transaction }).catch(() => {});

      await transaction.commit();
      console.log('Migration down: achievement roles/rewards + user privacy fields removed');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
