'use strict';

const TABLE_NAME = 'message_saves';
const MESSAGE_INDEX = 'idx_message_saves_message';
const SAVED_BY_INDEX = 'idx_message_saves_saved_by';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS message_saves (
        id SERIAL PRIMARY KEY,
        message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        saved_by INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(message_id, saved_by)
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS ${MESSAGE_INDEX}
        ON ${TABLE_NAME}(message_id, created_at);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS ${SAVED_BY_INDEX}
        ON ${TABLE_NAME}(saved_by, created_at DESC);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ${SAVED_BY_INDEX};`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ${MESSAGE_INDEX};`);
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS ${TABLE_NAME};`);
  },
};