'use strict';

/**
 * Encrypts legacy nutrition descriptions and duplicate meal text in JSONB.
 * This migration fails closed so a deployment cannot silently skip protection.
 */
const TABLE = 'daily_macro_logs';

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!process.env.ENCRYPTION_MASTER_KEY) {
      throw new Error('ENCRYPTION_MASTER_KEY is required for nutrition encryption backfill');
    }

    const { encrypt } = await import('../services/encryption/encryptionService.mjs');
    const { encryptNutritionItems } = await import('../services/encryption/healthDataEncryption.mjs');

    await queryInterface.sequelize.transaction(async (transaction) => {
      const rows = await queryInterface.sequelize.query(
        `SELECT id, description, items FROM ${TABLE} ORDER BY id ASC`,
        { type: Sequelize.QueryTypes.SELECT, transaction },
      );

      for (const row of rows) {
        const description = encrypt(row.description, 'health:nutrition:description');
        const items = encryptNutritionItems(row.items);
        await queryInterface.bulkUpdate(
          TABLE,
          { description, items },
          { id: row.id },
          { transaction },
        );
      }
    });
  },

  async down() {
    // Security backfills are intentionally not reversed into plaintext.
  },
};
