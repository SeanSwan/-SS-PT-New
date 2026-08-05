'use strict';

/**
 * Pain-Chart Slice 2 (A4): Users.bodyMapHeadPhoto — optional dedicated head
 * photo for the body-map figure (profile photo may be a logo/pet/brand image).
 * Nullable, no backfill: null falls back to Users.photo at the consumer.
 * Idempotent via describeTable guard.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Users');
    if (!table.bodyMapHeadPhoto) {
      await queryInterface.addColumn('Users', 'bodyMapHeadPhoto', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Dedicated body-map head photo URL (falls back to photo)',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Users');
    if (table.bodyMapHeadPhoto) {
      await queryInterface.removeColumn('Users', 'bodyMapHeadPhoto');
    }
  },
};
