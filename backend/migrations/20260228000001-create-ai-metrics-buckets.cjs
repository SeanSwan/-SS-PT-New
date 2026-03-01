'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Main metrics bucket table
    await queryInterface.createTable('ai_metrics_buckets', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      feature: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      granularity: {
        type: Sequelize.ENUM('hourly', 'daily'),
        allowNull: false,
      },
      bucketStart: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      totalRequests: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      successCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      failCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      totalTokens: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      sumResponseTime: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      minResponseTime: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      maxResponseTime: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Unique constraint for UPSERT
    await queryInterface.addIndex('ai_metrics_buckets', ['feature', 'granularity', 'bucketStart'], {
      unique: true,
      name: 'ai_metrics_buckets_feature_granularity_bucket_start',
    });
    await queryInterface.addIndex('ai_metrics_buckets', ['feature', 'granularity']);
    await queryInterface.addIndex('ai_metrics_buckets', ['bucketStart']);
    await queryInterface.addIndex('ai_metrics_buckets', ['feature', 'bucketStart']);

    // Separate user tracking table (concurrency-safe unique users)
    await queryInterface.createTable('ai_metrics_bucket_users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      bucketId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ai_metrics_buckets',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('ai_metrics_bucket_users', ['bucketId', 'userId'], {
      unique: true,
      name: 'ai_metrics_bucket_users_bucket_user',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ai_metrics_bucket_users');
    await queryInterface.dropTable('ai_metrics_buckets');
  },
};
