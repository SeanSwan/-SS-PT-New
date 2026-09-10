'use strict';
/** Additive v2 lifecycle metadata. Existing camel-case columns and rows survive.
 * Duplicate proposal bindings abort the transaction and require explicit repair.
 * No live migration is implied by this file; rollback retains durable evidence.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const db = queryInterface.sequelize;
    await db.transaction(async transaction => {
      const duplicates = await db.query(
        'SELECT "proposalId" FROM "coach_intents" WHERE "proposalId" IS NOT NULL GROUP BY "proposalId" HAVING COUNT(*) > 1 LIMIT 1',
        { type: Sequelize.QueryTypes.SELECT, transaction },
      );
      if (duplicates.length) throw new Error('CoachIntent duplicate proposal bindings require an audited repair before migration');
      const columns = await queryInterface.describeTable('coach_intents', { transaction });
      const additions = {
        version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        expectedHash: { type: Sequelize.STRING(64), allowNull: true },
        expectedFootprint: { type: Sequelize.JSONB, allowNull: true },
        proofVersion: { type: Sequelize.INTEGER, allowNull: true },
        committedAt: { type: Sequelize.DATE, allowNull: true },
        verifiedAt: { type: Sequelize.DATE, allowNull: true },
      };
      for (const [name, definition] of Object.entries(additions)) {
        if (!columns[name]) await queryInterface.addColumn('coach_intents', name, definition, { transaction });
      }
      const indexes = await queryInterface.showIndex('coach_intents', { transaction });
      if (!indexes.some(index => index.name === 'coach_intents_proposal_unique')) {
        await queryInterface.addIndex('coach_intents', ['proposalId'], {
          name: 'coach_intents_proposal_unique', unique: true,
          where: { proposalId: { [Sequelize.Op.ne]: null } }, transaction,
        });
      }
    });
  },
  async down() {
    // Keep committed receipts, proof metadata and uniqueness during rollback.
  },
};
