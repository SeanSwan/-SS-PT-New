'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('progress_reports', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reportPeriod: {
        type: Sequelize.ENUM('monthly', 'quarterly', 'bi_annual', 'annual'),
        allowNull: false,
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      baselineMeasurementId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'body_measurements',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      latestMeasurementId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'body_measurements',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      summaryData: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      chartData: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      generatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      sentToClient: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      sentAt: {
        type: Sequelize.DATE,
      },
      clientViewed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      clientViewedAt: {
        type: Sequelize.DATE,
      },
      reviewedByTrainer: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      trainerNotes: {
        type: Sequelize.TEXT,
      },
      actionItemsForNextPeriod: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      triggeredRenewal: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      clientResigned: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      resignedAt: {
        type: Sequelize.DATE,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add indexes
    await queryInterface.addIndex('progress_reports', ['userId']);
    await queryInterface.addIndex('progress_reports', ['reportPeriod']);
    await queryInterface.addIndex('progress_reports', ['startDate', 'endDate']);
    await queryInterface.addIndex('progress_reports', ['generatedAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('progress_reports');
  },
};
