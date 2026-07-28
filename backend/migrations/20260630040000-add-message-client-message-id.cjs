'use strict';

const TABLE_NAME = 'messages';
const INDEX_NAME = 'idx_messages_sender_conversation_client_message';

async function tableExists(queryInterface) {
  try {
    await queryInterface.describeTable(TABLE_NAME);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  async up(queryInterface) {
    if (!(await tableExists(queryInterface))) return;

    await queryInterface.sequelize.query(`
      ALTER TABLE messages
        ADD COLUMN IF NOT EXISTS client_message_id VARCHAR(100);
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ${INDEX_NAME}
        ON messages(conversation_id, sender_id, client_message_id)
        WHERE client_message_id IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    if (!(await tableExists(queryInterface))) return;

    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ${INDEX_NAME};`);
    await queryInterface.sequelize.query(`
      ALTER TABLE messages
        DROP COLUMN IF EXISTS client_message_id;
    `);
  },
};