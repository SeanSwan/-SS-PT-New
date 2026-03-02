'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Add deleted_at column for per-user conversation soft delete
    const [cols] = await queryInterface.sequelize.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'conversation_participants' AND column_name = 'deleted_at';`
    );
    if (cols && cols.length > 0) return; // Already exists

    await queryInterface.sequelize.query(
      `ALTER TABLE conversation_participants ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE conversation_participants DROP COLUMN IF EXISTS deleted_at;`
    );
  },
};
