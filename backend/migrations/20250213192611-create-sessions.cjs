'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create ENUM type for session status
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
      // Date/time when the session is scheduled
      sessionDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      // Duration in minutes (optional, default 60)
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 60,
      },
      // Status of the session: available, requested, scheduled, completed, cancelled
      status: {
        type: 'enum_sessions_status',
        allowNull: false,
        defaultValue: 'available',
      },
      // Additional session notes
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      // New field: whether the session has been confirmed by admin
      confirmed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      // Foreign key reference to the users table
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users', // name of the users table
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      // Timestamps for record creation and updates
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
