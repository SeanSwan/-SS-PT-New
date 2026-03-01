'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('"Users"');

    if (!tableInfo.lastFullMeasurementDate) {
      await queryInterface.addColumn('"Users"', 'lastFullMeasurementDate', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date of last full body measurement',
      });
    }

    if (!tableInfo.lastWeighInDate) {
      await queryInterface.addColumn('"Users"', 'lastWeighInDate', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date of last weight-only check',
      });
    }

    if (!tableInfo.measurementIntervalDays) {
      await queryInterface.addColumn('"Users"', 'measurementIntervalDays', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 30,
        comment: 'Monthly cadence for full body measurements',
      });
    }

    if (!tableInfo.weighInIntervalDays) {
      await queryInterface.addColumn('"Users"', 'weighInIntervalDays', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 7,
        comment: 'Weekly cadence for weight-only checks',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('"Users"', 'lastFullMeasurementDate');
    await queryInterface.removeColumn('"Users"', 'lastWeighInDate');
    await queryInterface.removeColumn('"Users"', 'measurementIntervalDays');
    await queryInterface.removeColumn('"Users"', 'weighInIntervalDays');
  },
};
