'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('daily_hydrations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      glassesFilled: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      dailyGoal: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 8,
      },
      glassOz: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 8,
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

    await queryInterface.addIndex('daily_hydrations', ['userId', 'date'], {
      unique: true,
      name: 'daily_hydrations_user_date_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('daily_hydrations');
  },
};
