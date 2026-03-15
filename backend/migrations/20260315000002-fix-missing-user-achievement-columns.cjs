'use strict';

/**
 * HOTFIX Migration: Ensure missing columns exist
 *
 * The previous migration (20260315000001) failed because ALTER TYPE ADD VALUE
 * cannot run inside a PostgreSQL transaction. safe-migrate.mjs marked it as
 * "done" even though it failed, so the columns were never created.
 * This migration adds any missing columns idempotently.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Helper: only add column if it doesn't exist
    const safeAdd = async (table, column, definition) => {
      try {
        const desc = await queryInterface.describeTable(table);
        if (desc[column]) {
          console.log(`  ⏭️  ${table}.${column} already exists`);
          return;
        }
      } catch (e) {
        // Table might not exist — let addColumn handle it
      }
      await queryInterface.addColumn(table, column, definition);
      console.log(`  ➕ Added ${table}.${column}`);
    };

    // ── Achievement columns ──
    await safeAdd('Achievements', 'targetRoles', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: ['user'],
      comment: 'Roles eligible for this achievement'
    });

    await safeAdd('Achievements', 'rewardType', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'badge'
    });

    await safeAdd('Achievements', 'issuance', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'auto'
    });

    await safeAdd('Achievements', 'rewards', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Array of reward objects: [{type, value, description}]'
    });

    // ── User privacy columns ──
    await safeAdd('Users', 'profileVisibility', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'public',
      comment: 'public | friends_only | private'
    });

    await safeAdd('Users', 'showBadges', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await safeAdd('Users', 'showAchievements', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await safeAdd('Users', 'showStats', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await safeAdd('Users', 'showWorkoutHistory', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await safeAdd('Users', 'showLevel', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    // ── User client source ──
    await safeAdd('Users', 'clientSource', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'swanstudios',
      comment: 'Client origin: swanstudios, move_fitness, external'
    });

    // ── Enum expansion (OUTSIDE transaction) ──
    try {
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_Achievements_category" ADD VALUE IF NOT EXISTS 'community';`
      );
    } catch (e) {
      console.log('  Enum alteration skipped:', e.message);
    }

    // ── Indexes (safe to fail) ──
    try {
      await queryInterface.addIndex('Achievements', {
        fields: ['targetRoles'],
        using: 'GIN',
        name: 'idx_achievements_target_roles'
      });
    } catch (e) { /* index may exist */ }

    try {
      await queryInterface.addIndex('Users', {
        fields: ['profileVisibility'],
        name: 'idx_users_profile_visibility'
      });
    } catch (e) { /* index may exist */ }

    try {
      await queryInterface.addIndex('Users', ['clientSource'], {
        name: 'idx_users_client_source'
      });
    } catch (e) { /* index may exist */ }

    console.log('Hotfix migration complete: all missing columns ensured');
  },

  async down(queryInterface) {
    // This is a hotfix — down is a no-op since the original migration's down handles cleanup
    console.log('Hotfix migration down: no-op (original migration handles cleanup)');
  }
};
