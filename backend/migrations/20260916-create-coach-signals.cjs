'use strict';

/** @type {import('sequelize-cli').Migration} */

// Blueprint: docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/MEGA-BLUEPRINT.md §4.3
// Additive only. FK targets are the PascalCase canonical tables ("Users", "SocialPosts")
// per CLAUDE.md — never the stale lowercase `users` duplicate.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CoachSignals', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      coachId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      memberId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      postId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'SocialPosts', key: 'id' },
        // SET NULL, not CASCADE: a coach's recognition is the member's record and must
        // survive the post being deleted (hostile review F3.4). The column is already
        // nullable, and the model comment anticipates postId-less signals.
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      note: {
        type: Sequelize.STRING(120),
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

    await queryInterface.addIndex('CoachSignals', ['coachId', 'createdAt']);
    await queryInterface.addIndex('CoachSignals', ['postId', 'createdAt']);
    await queryInterface.addIndex('CoachSignals', ['memberId', 'createdAt']);
    await queryInterface.addConstraint('CoachSignals', {
      type: 'unique',
      fields: ['coachId', 'postId'],
      name: 'coach_signals_coach_post_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('CoachSignals');
  },
};
