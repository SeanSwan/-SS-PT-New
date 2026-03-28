'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if table already exists (safe re-run)
    const [check] = await queryInterface.sequelize.query(
      `SELECT to_regclass('user_feature_flags') AS exists`
    );
    if (check?.[0]?.exists) {
      console.log('[Migration] user_feature_flags table already exists, skipping.');
      return;
    }

    await queryInterface.createTable('user_feature_flags', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'userId',
      },
      featureKey: {
        type: Sequelize.STRING(100),
        allowNull: false,
        field: 'featureKey',
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      grantedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'grantedBy',
      },
      grantedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'grantedAt',
      },
      revokedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'revokedAt',
      },
      notes: {
        type: Sequelize.STRING(500),
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

    // Unique constraint: one flag per user per feature
    await queryInterface.addIndex('user_feature_flags', ['userId', 'featureKey'], {
      unique: true,
      name: 'uq_user_feature_flag',
    });

    // Index for looking up all users with a specific feature
    await queryInterface.addIndex('user_feature_flags', ['featureKey'], {
      name: 'idx_feature_key',
    });

    console.log('[Migration] Created user_feature_flags table with indexes.');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_feature_flags');
  },
};
