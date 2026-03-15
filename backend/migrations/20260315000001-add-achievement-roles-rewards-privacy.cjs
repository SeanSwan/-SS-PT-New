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
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // ── Achievement model additions ──

      // 1. Add targetRoles JSONB
      await queryInterface.addColumn('Achievements', 'targetRoles', {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: ['user'],
        comment: 'Roles eligible for this achievement'
      }, { transaction });

      // 2. Add rewardType (STRING to avoid ENUM migration complexity)
      await queryInterface.addColumn('Achievements', 'rewardType', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'badge'
      }, { transaction });

      // 3. Add issuance
      await queryInterface.addColumn('Achievements', 'issuance', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'auto'
      }, { transaction });

      // 4. Add rewards JSONB array
      await queryInterface.addColumn('Achievements', 'rewards', {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of reward objects: [{type, value, description}]'
      }, { transaction });

      // 5. Expand category ENUM to include 'community'
      // PostgreSQL: add value to existing enum type
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_Achievements_category" ADD VALUE IF NOT EXISTS 'community';`,
        { transaction }
      ).catch(() => {
        // Enum value may already exist or enum type may not exist — safe to skip
      });

      // 6. Add index on targetRoles for GIN queries
      await queryInterface.addIndex('Achievements', {
        fields: ['targetRoles'],
        using: 'GIN',
        name: 'idx_achievements_target_roles',
        transaction
      }).catch(() => {}); // Skip if GIN not supported or index exists

      // ── User model privacy additions ──

      // 7. Add profileVisibility
      await queryInterface.addColumn('Users', 'profileVisibility', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'public',
        comment: 'public | friends_only | private'
      }, { transaction });

      // 8. Add granular privacy toggles
      await queryInterface.addColumn('Users', 'showBadges', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }, { transaction });

      await queryInterface.addColumn('Users', 'showAchievements', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }, { transaction });

      await queryInterface.addColumn('Users', 'showStats', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }, { transaction });

      await queryInterface.addColumn('Users', 'showWorkoutHistory', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }, { transaction });

      await queryInterface.addColumn('Users', 'showLevel', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }, { transaction });

      // 9. Add index on profileVisibility
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
