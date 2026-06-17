'use strict';

/**
 * Create `sms_suppressions` for phone-keyed STOP/unsubscribe records.
 * Idempotent so partially migrated environments do not crash during deploy.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const names = tables.map((t) => (typeof t === 'string' ? t : t.tableName));
    if (names.includes('sms_suppressions')) return;

    await queryInterface.createTable('sms_suppressions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      phone: { type: Sequelize.STRING(32), allowNull: false },
      source: { type: Sequelize.STRING(80), allowNull: false, defaultValue: 'twilio_inbound' },
      reason: { type: Sequelize.STRING(80), allowNull: false, defaultValue: 'stop_keyword' },
      message_sid: { type: Sequelize.STRING(80), allowNull: true },
      opted_out_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('sms_suppressions', ['phone'], {
      unique: true,
      name: 'sms_suppressions_phone_unique',
    });
    await queryInterface.addIndex('sms_suppressions', ['source'], {
      name: 'sms_suppressions_source_idx',
    });
    await queryInterface.addIndex('sms_suppressions', ['opted_out_at'], {
      name: 'sms_suppressions_opted_out_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sms_suppressions');
  },
};
