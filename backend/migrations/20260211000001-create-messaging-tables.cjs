'use strict';

/**
 * FILE: 20260211000001-create-messaging-tables.cjs
 * SYSTEM: Messaging
 *
 * PURPOSE:
 * - Create conversations, conversation_participants, messages, and message_receipts tables
 * - Required by messagingController.mjs which uses raw SQL queries against these tables
 * - Without these tables, GET /api/messaging/conversations returns 500
 *
 * SAFETY:
 * - Creates tables only if they don't already exist (IF NOT EXISTS)
 * - Safe to re-run
 *
 * CREATED: 2026-02-11
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Creating messaging tables...');

    // 1. conversations
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL DEFAULT 'direct',
        name VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Created: conversations');

    // 2. conversation_participants
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS conversation_participants (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL DEFAULT 'member',
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(conversation_id, user_id)
      );
    `);
    console.log('Created: conversation_participants');

    // 3. messages
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Created: messages');

    // 4. message_receipts (read receipts)
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS message_receipts (
        id SERIAL PRIMARY KEY,
        message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(message_id, user_id)
      );
    `);
    console.log('Created: message_receipts');

    // Indexes for performance
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
      CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_message_receipts_msg ON message_receipts(message_id);
      CREATE INDEX IF NOT EXISTS idx_message_receipts_user ON message_receipts(user_id);
    `);
    console.log('Created indexes for messaging tables');
  },

  async down(queryInterface) {
    console.log('Dropping messaging tables...');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS message_receipts CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS messages CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS conversation_participants CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS conversations CASCADE;');
    console.log('Dropped messaging tables');
  }
};
