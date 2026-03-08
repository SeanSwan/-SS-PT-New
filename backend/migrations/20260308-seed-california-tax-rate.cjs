'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Check if CA tax rate already exists
    const existing = await queryInterface.sequelize.query(
      `SELECT id FROM tax_config WHERE state_code = 'CA' LIMIT 1`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    ).catch(() => []);

    if (existing.length > 0) {
      console.log('California tax rate already exists, skipping seed.');
      return;
    }

    await queryInterface.bulkInsert('tax_config', [{
      state_code: 'CA',
      state_name: 'California',
      tax_rate: 0.0725, // 7.25% CA state sales tax rate
      is_active: true,
      effective_date: new Date('2024-04-01'),
      notes: 'California state sales tax rate (7.25%). Local rates may add 1-3.5% on top. Personal training services may be exempt depending on classification.',
      created_at: new Date(),
      updated_at: new Date(),
    }]);

    console.log('Seeded California tax rate: 7.25%');
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('tax_config', { state_code: 'CA' });
  },
};
