'use strict';

/**
 * Create `subscribers` — the marketing email list (Tier 1.1).
 * Idempotent (skips if the table exists) + reversible.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const names = tables.map((t) => (typeof t === 'string' ? t : t.tableName));
    if (names.includes('subscribers')) return;

    await queryInterface.createTable('subscribers', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      first_name: { type: Sequelize.STRING(100), allowNull: true },
      last_name: { type: Sequelize.STRING(100), allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'unsubscribed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      source: { type: Sequelize.STRING(100), allowNull: false, defaultValue: 'website' },
      consent_at: { type: Sequelize.DATE, allowNull: true },
      consent_source: { type: Sequelize.STRING(255), allowNull: true },
      consent_ip: { type: Sequelize.STRING(64), allowNull: true },
      confirm_token: { type: Sequelize.STRING(128), allowNull: true },
      unsubscribe_token: { type: Sequelize.STRING(128), allowNull: true },
      confirmed_at: { type: Sequelize.DATE, allowNull: true },
      unsubscribed_at: { type: Sequelize.DATE, allowNull: true },
      tags: { type: Sequelize.JSONB, allowNull: true, defaultValue: [] },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('subscribers', ['status']);
    await queryInterface.addIndex('subscribers', ['confirm_token']);
    await queryInterface.addIndex('subscribers', ['unsubscribe_token']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('subscribers');
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_subscribers_status";');
    }
  },
};
