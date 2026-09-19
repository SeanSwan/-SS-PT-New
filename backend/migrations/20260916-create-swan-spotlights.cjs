'use strict';

/** @type {import('sequelize-cli').Migration} */

// Blueprint: docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/MEGA-BLUEPRINT.md §4.2
// Additive only. MUST live in this top-level directory: backend/scripts/safe-migrate.mjs:146
// reads migrations with a NON-RECURSIVE readdirSync, so anything under migrations/social/
// never runs on deploy.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SwanSpotlights', {
      itemId: {
        type: Sequelize.STRING(36),
        primaryKey: true,
        allowNull: false,
      },
      revision: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      retracted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      headline: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },
      dek: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      imageUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      sourceName: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },
      sourceUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      curatorNote: {
        type: Sequelize.STRING(140),
        allowNull: true,
      },
      sortWeight: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      publishedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      gateHash: {
        type: Sequelize.STRING(64),
        allowNull: true,
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

    await queryInterface.addIndex('SwanSpotlights', ['retracted', 'expiresAt', 'sortWeight'], {
      name: 'swan_spotlights_live_rail_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('SwanSpotlights');
  },
};
