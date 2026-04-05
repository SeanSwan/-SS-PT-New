'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add trainerType column to Users table
    // Distinguishes affiliated (SS employed) vs independent (own business) trainers
    await queryInterface.addColumn('"Users"', 'trainerType', {
      type: Sequelize.STRING(20),
      allowNull: true,
      defaultValue: null,
      comment: 'Trainer type: affiliated (SS employed) | independent (own business) | null (not a trainer)',
    });

    // Set Sean (admin) and any existing trainers as affiliated by default
    await queryInterface.sequelize.query(`
      UPDATE "Users" SET "trainerType" = 'affiliated'
      WHERE role = 'trainer' AND "trainerType" IS NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('"Users"', 'trainerType');
  },
};
