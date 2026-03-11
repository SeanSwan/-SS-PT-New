'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = 'gallery_visitors';
    const cols = await queryInterface.describeTable(table).catch(() => null);
    if (!cols) return; // Table doesn't exist yet

    if (!cols.ip_address) {
      await queryInterface.addColumn(table, 'ip_address', {
        type: Sequelize.STRING(45),
        allowNull: true,
      });
    }
    if (!cols.country) {
      await queryInterface.addColumn(table, 'country', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }
    if (!cols.country_code) {
      await queryInterface.addColumn(table, 'country_code', {
        type: Sequelize.STRING(2),
        allowNull: true,
      });
    }
    if (!cols.region) {
      await queryInterface.addColumn(table, 'region', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }
    if (!cols.city) {
      await queryInterface.addColumn(table, 'city', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }
    if (!cols.lat) {
      await queryInterface.addColumn(table, 'lat', {
        type: Sequelize.FLOAT,
        allowNull: true,
      });
    }
    if (!cols.lon) {
      await queryInterface.addColumn(table, 'lon', {
        type: Sequelize.FLOAT,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = 'gallery_visitors';
    await queryInterface.removeColumn(table, 'ip_address').catch(() => {});
    await queryInterface.removeColumn(table, 'country').catch(() => {});
    await queryInterface.removeColumn(table, 'country_code').catch(() => {});
    await queryInterface.removeColumn(table, 'region').catch(() => {});
    await queryInterface.removeColumn(table, 'city').catch(() => {});
    await queryInterface.removeColumn(table, 'lat').catch(() => {});
    await queryInterface.removeColumn(table, 'lon').catch(() => {});
  },
};
