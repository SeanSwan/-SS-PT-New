'use strict';

/**
 * S3.3 (nutrition blueprint 2026-08-04, Kimi P0-5): multi-instance nudge
 * idempotency ledger. A lookback-query cooldown is a race — two instances
 * ticking together both pass the check and both send. The gate is therefore
 * an atomic INSERT ... ON CONFLICT DO NOTHING against the unique
 * (userId, nudgeType, localDate) triple: exactly one instance wins the row,
 * and only the winner sends. Rows double as per-user dispatch history (copy
 * rotation reads the count). FK targets "Users" (canonical table — rule 58).
 */
const TABLE = 'nudge_dispatches';
const UNIQUE_INDEX = 'nudge_dispatches_user_type_localdate_unique';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes(TABLE)) {
      await queryInterface.createTable(TABLE, {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        nudgeType: { type: Sequelize.STRING(40), allowNull: false },
        localDate: { type: Sequelize.DATEONLY, allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      });
    }
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ${UNIQUE_INDEX}
      ON ${TABLE} ("userId", "nudgeType", "localDate")
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable(TABLE);
  },
};
