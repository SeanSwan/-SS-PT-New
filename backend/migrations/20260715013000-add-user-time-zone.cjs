/**
 * ============================================================================
 * FILE: 20260715013000-add-user-time-zone.cjs
 * PURPOSE: Persist a validated client time zone and explicit-choice marker.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

'use strict';

const DEFAULT_TIME_ZONE = 'America/Los_Angeles';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const columns = await queryInterface.describeTable('Users');

      if (!columns.timeZone) {
        await queryInterface.addColumn('Users', 'timeZone', {
          type: Sequelize.STRING(64),
          allowNull: true,
        }, { transaction });
      }

      if (!columns.timeZoneConfigured) {
        await queryInterface.addColumn('Users', 'timeZoneConfigured', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        }, { transaction });
      }

      await queryInterface.sequelize.query(
        `UPDATE "Users"
         SET "timeZone" = :defaultTimeZone
         WHERE "timeZone" IS NULL OR BTRIM("timeZone") = ''`,
        { replacements: { defaultTimeZone: DEFAULT_TIME_ZONE }, transaction },
      );

      await queryInterface.changeColumn('Users', 'timeZone', {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: DEFAULT_TIME_ZONE,
      }, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const columns = await queryInterface.describeTable('Users');
      if (columns.timeZoneConfigured) {
        await queryInterface.removeColumn('Users', 'timeZoneConfigured', { transaction });
      }
      if (columns.timeZone) {
        await queryInterface.removeColumn('Users', 'timeZone', { transaction });
      }
    });
  },
};