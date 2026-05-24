'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await addEnumValues(queryInterface, 'enum_SocialEvents_category', [
      'flexibility_session',
      'recovery_session',
    ]);

    await addEnumValues(queryInterface, 'enum_Communities_category', [
      'flexibility',
    ]);

    await addEnumValues(queryInterface, 'enum_LiveStreams_category', [
      'flexibility',
      'recovery',
    ]);
  },

  async down() {
    // PostgreSQL enum values cannot be safely removed without recreating the
    // enum and rewriting dependent columns, so rollback is intentionally no-op.
  },
};

async function addEnumValues(queryInterface, enumName, values) {
  for (const value of values) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS '${value}'`
    ).catch((error) => {
      if (error?.parent?.code === '42704' || error?.original?.code === '42704') {
        return;
      }
      throw error;
    });
  }
}
