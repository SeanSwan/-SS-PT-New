/**
 * ============================================================================
 * FILE: 20260324-create-hashtag-tables.cjs
 * PURPOSE: Create Hashtags, PostHashtags, and UserHashtagFollows tables
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * ============================================================================
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create Hashtags table
    await queryInterface.createTable('Hashtags', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(30),
        allowNull: false,
        unique: true
      },
      slug: {
        type: Sequelize.STRING(30),
        allowNull: false,
        unique: true
      },
      category: {
        type: Sequelize.ENUM('fitness', 'creative', 'community', 'general'),
        defaultValue: 'general',
        allowNull: false
      },
      usageCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      weeklyCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      isOfficial: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      isBanned: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create PostHashtags join table
    await queryInterface.createTable('PostHashtags', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      postId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'SocialPosts', key: 'id' },
        onDelete: 'CASCADE'
      },
      hashtagId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Hashtags', key: 'id' },
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create UserHashtagFollows table
    await queryInterface.createTable('UserHashtagFollows', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE'
      },
      hashtagId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Hashtags', key: 'id' },
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('Hashtags', ['category']);
    await queryInterface.addIndex('Hashtags', ['weeklyCount']);
    await queryInterface.addIndex('Hashtags', ['usageCount']);
    await queryInterface.addIndex('PostHashtags', ['postId', 'hashtagId'], { unique: true });
    await queryInterface.addIndex('PostHashtags', ['hashtagId']);
    await queryInterface.addIndex('UserHashtagFollows', ['userId', 'hashtagId'], { unique: true });
    await queryInterface.addIndex('UserHashtagFollows', ['hashtagId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('UserHashtagFollows');
    await queryInterface.dropTable('PostHashtags');
    await queryInterface.dropTable('Hashtags');
  }
};
