'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // First, create the ENUM type for session status
    await queryInterface.sequelize.query(
      `CREATE TYPE "enum_sessions_status" AS ENUM ('available', 'requested', 'scheduled', 'completed', 'cancelled');`
    );

    // Create the sessions table
    await queryInterface.createTable('sessions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      sessionDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 60,
      },
      status: {
        type: 'enum_sessions_status',
        allowNull: false,
        defaultValue: 'available',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users', // Name of the user table
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop the sessions table first
    await queryInterface.dropTable('sessions');
    // Then drop the ENUM type
    await queryInterface.sequelize.query(
      'DROP TYPE "enum_sessions_status";'
    );
  },
};
