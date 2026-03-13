'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('page_views', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ip: {
        type: Sequelize.STRING(45),
        allowNull: false,
      },
      page: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      referrer: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      country: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      country_code: {
        type: Sequelize.STRING(2),
        allowNull: true,
      },
      region: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      page_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      pages: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      first_seen: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      last_seen: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('page_views', ['ip']);
    await queryInterface.addIndex('page_views', ['last_seen']);
    await queryInterface.addIndex('page_views', ['country_code']);
    await queryInterface.addIndex('page_views', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('page_views');
  },
};
