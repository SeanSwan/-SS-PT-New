'use strict';

/** @type {import('sequelize-cli').Migration} */

// Blueprint: docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/MEGA-BLUEPRINT.md §6 S4
// Additive only. MUST stay in the top-level migrations directory: backend/scripts/safe-migrate.mjs:146
// reads it with a non-recursive readdirSync, so a subdirectory migration never runs on deploy.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SocialPromptsOfTheDay', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      promptText: {
        type: Sequelize.STRING(140),
        allowNull: false,
      },
      chipLabel: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      activeOn: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('SocialPromptsOfTheDay', ['isActive', 'activeOn'], {
      name: 'social_prompts_active_day_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('SocialPromptsOfTheDay');
  },
};
