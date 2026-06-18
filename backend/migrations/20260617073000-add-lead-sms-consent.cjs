'use strict';

const TABLE = 'leads';
const ENUM = 'enum_leads_sms_consent_status';

async function describeTable(queryInterface) {
  try {
    return await queryInterface.describeTable(TABLE);
  } catch (_err) {
    return null;
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await describeTable(queryInterface);
    if (!table) return;

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "${ENUM}" AS ENUM ('unknown', 'opted_in', 'opted_out');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    if (!table.sms_consent_status) {
      await queryInterface.addColumn(TABLE, 'sms_consent_status', {
        type: Sequelize.ENUM('unknown', 'opted_in', 'opted_out'),
        allowNull: false,
        defaultValue: 'unknown',
      });
    }
    if (!table.sms_consent_at) {
      await queryInterface.addColumn(TABLE, 'sms_consent_at', { type: Sequelize.DATE, allowNull: true });
    }
    if (!table.sms_consent_source) {
      await queryInterface.addColumn(TABLE, 'sms_consent_source', { type: Sequelize.STRING(255), allowNull: true });
    }
    if (!table.sms_opt_out_at) {
      await queryInterface.addColumn(TABLE, 'sms_opt_out_at', { type: Sequelize.DATE, allowNull: true });
    }

    await queryInterface.addIndex(TABLE, ['sms_consent_status'], {
      name: 'leads_sms_consent_status_idx',
    }).catch((err) => {
      if (!/already exists/i.test(String(err?.message || ''))) throw err;
    });
  },

  async down(queryInterface) {
    const table = await describeTable(queryInterface);
    if (!table) return;

    await queryInterface.removeIndex(TABLE, 'leads_sms_consent_status_idx').catch(() => {});
    if (table.sms_opt_out_at) await queryInterface.removeColumn(TABLE, 'sms_opt_out_at');
    if (table.sms_consent_source) await queryInterface.removeColumn(TABLE, 'sms_consent_source');
    if (table.sms_consent_at) await queryInterface.removeColumn(TABLE, 'sms_consent_at');
    if (table.sms_consent_status) await queryInterface.removeColumn(TABLE, 'sms_consent_status');
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${ENUM}";`);
  },
};
