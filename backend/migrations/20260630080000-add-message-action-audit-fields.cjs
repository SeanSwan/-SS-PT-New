'use strict';

const TABLE_NAME = 'messages';
const INDEX_NAME = 'idx_messages_updated_by';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE ${TABLE_NAME}
        ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES "Users"(id) ON DELETE SET NULL;
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS ${INDEX_NAME}
        ON ${TABLE_NAME}(updated_by)
        WHERE updated_by IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ${INDEX_NAME};`);

    await queryInterface.sequelize.query(`
      ALTER TABLE ${TABLE_NAME}
        DROP COLUMN IF EXISTS updated_by;
    `);
  },
};