'use strict';

/**
 * Create goals table (idempotent)
 * --------------------------------
 * This migration backfills the missing `goals` table required by:
 * - goal_supporters
 * - goal_comments
 * - goal_likes
 * - goal_milestones
 *
 * The migration is intentionally defensive for production:
 * - skips if `goals` already exists
 * - uses portable column types (STRING/JSONB/DECIMAL/BOOLEAN)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [rows] = await queryInterface.sequelize.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='goals';"
    );

    if (rows && rows.length > 0) {
      console.log('goals table already exists, skipping migration.');
      return;
    }

    await queryInterface.createTable('goals', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      title: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      targetValue: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      currentValue: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      unit: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'fitness',
      },
      subcategory: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      priority: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'medium',
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'active',
      },
      deadline: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      estimatedCompletionDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      progressPercentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      progressHistory: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      milestones: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      xpReward: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      completionBonus: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      badgeReward: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      customRewards: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      allowSupporters: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      requiresVerification: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      autoComplete: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      trackingMethod: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'manual',
      },
      trackingFrequency: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'weekly',
      },
      reminderSettings: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {
          enabled: true,
          frequency: 'weekly',
          time: '09:00',
          days: ['monday', 'wednesday', 'friday'],
        },
      },
      difficulty: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
      confidenceLevel: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5,
      },
      motivationLevel: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 8,
      },
      averageProgressPerWeek: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      bestWeekProgress: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      consistencyScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      supporters: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      supporterCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      shareCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      encouragementCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      reflection: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      obstaclesEncountered: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      lessonsLearned: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      connectedApps: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      externalId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      syncSettings: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      lastProgressUpdate: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('goals', ['userId', 'status'], { name: 'goals_user_status_idx' });
    await queryInterface.addIndex('goals', ['category', 'priority'], { name: 'goals_category_priority_idx' });
    await queryInterface.addIndex('goals', ['deadline', 'status'], { name: 'goals_deadline_status_idx' });
    await queryInterface.addIndex('goals', ['userId', 'category', 'status'], { name: 'goals_user_category_status_idx' });
    await queryInterface.addIndex('goals', ['isPublic', 'status'], { name: 'goals_public_status_idx' });
  },

  async down(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='goals';"
    );
    if (!rows || rows.length === 0) {
      console.log('goals table does not exist, skipping down migration.');
      return;
    }

    await queryInterface.removeIndex('goals', 'goals_user_status_idx');
    await queryInterface.removeIndex('goals', 'goals_category_priority_idx');
    await queryInterface.removeIndex('goals', 'goals_deadline_status_idx');
    await queryInterface.removeIndex('goals', 'goals_user_category_status_idx');
    await queryInterface.removeIndex('goals', 'goals_public_status_idx');
    await queryInterface.dropTable('goals');
  },
};

