'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('client_photos', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
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
      takenAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      uploadedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      storageKey: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      url: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      photoType: {
        type: Sequelize.ENUM('front', 'side', 'back', 'other'),
        allowNull: false,
        defaultValue: 'other',
      },
      tagsJson: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      aiAnalysisJson: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      uploadedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      isDeleted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      visibility: {
        type: Sequelize.ENUM('public', 'private', 'trainer_only'),
        allowNull: false,
        defaultValue: 'private',
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

    await queryInterface.addIndex('client_photos', ['userId']);
    await queryInterface.addIndex('client_photos', ['takenAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('client_photos');
  },
};
