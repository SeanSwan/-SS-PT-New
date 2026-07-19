'use strict';

/**
 * Persist the exact paid-session credit amount deducted from each session.
 *
 * NULL intentionally means "legacy row without an immutable receipt"; runtime
 * reconciliation then reads the historical session type. New deductions write
 * 0 or a positive integer before the transaction commits.
 *
 * @type {import('sequelize-cli').Migration}
 */
const TABLE = 'sessions';
const COLUMN = 'creditsDeducted';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const table = await queryInterface.describeTable(TABLE);
      if (!table[COLUMN]) {
        await queryInterface.addColumn(TABLE, COLUMN, {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null,
          comment: 'Exact number of package credits deducted for this session',
        }, { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(TABLE, COLUMN).catch(() => {});
  },
};
