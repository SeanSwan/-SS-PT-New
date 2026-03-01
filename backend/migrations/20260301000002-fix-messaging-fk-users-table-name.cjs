'use strict';

/**
 * FILE: 20260301000002-fix-messaging-fk-users-table-name.cjs
 *
 * PURPOSE:
 * Fix FK constraints on messaging tables that reference lowercase "users"
 * instead of the actual Sequelize table name "Users" (quoted, capital U).
 * The User model has tableName: '"Users"', so FK constraints must reference
 * "Users"(id) not users(id).
 *
 * Without this fix, INSERT into conversation_participants/messages/message_receipts
 * fails with: violates foreign key constraint "..._user_id_fkey"
 *
 * CREATED: 2026-03-01
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    console.log('Fixing messaging FK constraints to reference "Users" table...');

    // Drop and recreate FK constraints on conversation_participants
    await queryInterface.sequelize.query(`
      ALTER TABLE conversation_participants
        DROP CONSTRAINT IF EXISTS conversation_participants_user_id_fkey;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE conversation_participants
        ADD CONSTRAINT conversation_participants_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES "Users"(id) ON DELETE CASCADE;
    `);
    console.log('Fixed: conversation_participants.user_id FK');

    // Drop and recreate FK constraints on messages
    await queryInterface.sequelize.query(`
      ALTER TABLE messages
        DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE messages
        ADD CONSTRAINT messages_sender_id_fkey
        FOREIGN KEY (sender_id) REFERENCES "Users"(id) ON DELETE CASCADE;
    `);
    console.log('Fixed: messages.sender_id FK');

    // Drop and recreate FK constraints on message_receipts
    await queryInterface.sequelize.query(`
      ALTER TABLE message_receipts
        DROP CONSTRAINT IF EXISTS message_receipts_user_id_fkey;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE message_receipts
        ADD CONSTRAINT message_receipts_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES "Users"(id) ON DELETE CASCADE;
    `);
    console.log('Fixed: message_receipts.user_id FK');

    console.log('All messaging FK constraints fixed successfully');
  },

  async down(queryInterface) {
    // Revert to lowercase "users" references
    await queryInterface.sequelize.query(`
      ALTER TABLE conversation_participants
        DROP CONSTRAINT IF EXISTS conversation_participants_user_id_fkey;
      ALTER TABLE conversation_participants
        ADD CONSTRAINT conversation_participants_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE messages
        DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
      ALTER TABLE messages
        ADD CONSTRAINT messages_sender_id_fkey
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE message_receipts
        DROP CONSTRAINT IF EXISTS message_receipts_user_id_fkey;
      ALTER TABLE message_receipts
        ADD CONSTRAINT message_receipts_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    `);
  }
};
