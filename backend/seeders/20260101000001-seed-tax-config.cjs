'use strict';

/**
 * Seeder: Populate Tax Configuration with all 50 US States
 * Source: Approximate average state sales tax rates as of 2025
 * Note: These are base rates and may not include local taxes
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const taxRates = [
      { state_code: 'AL', state_name: 'Alabama', tax_rate: 0.0400 },
      { state_code: 'AK', state_name: 'Alaska', tax_rate: 0.0000 }, // No state sales tax
      { state_code: 'AZ', state_name: 'Arizona', tax_rate: 0.0560 },
      { state_code: 'AR', state_name: 'Arkansas', tax_rate: 0.0650 },
      { state_code: 'CA', state_name: 'California', tax_rate: 0.0725 },
      { state_code: 'CO', state_name: 'Colorado', tax_rate: 0.0290 },
      { state_code: 'CT', state_name: 'Connecticut', tax_rate: 0.0635 },
      { state_code: 'DE', state_name: 'Delaware', tax_rate: 0.0000 }, // No state sales tax
      { state_code: 'FL', state_name: 'Florida', tax_rate: 0.0600 },
      { state_code: 'GA', state_name: 'Georgia', tax_rate: 0.0400 },
      { state_code: 'HI', state_name: 'Hawaii', tax_rate: 0.0400 },
      { state_code: 'ID', state_name: 'Idaho', tax_rate: 0.0600 },
      { state_code: 'IL', state_name: 'Illinois', tax_rate: 0.0625 },
      { state_code: 'IN', state_name: 'Indiana', tax_rate: 0.0700 },
      { state_code: 'IA', state_name: 'Iowa', tax_rate: 0.0600 },
      { state_code: 'KS', state_name: 'Kansas', tax_rate: 0.0650 },
      { state_code: 'KY', state_name: 'Kentucky', tax_rate: 0.0600 },
      { state_code: 'LA', state_name: 'Louisiana', tax_rate: 0.0445 },
      { state_code: 'ME', state_name: 'Maine', tax_rate: 0.0550 },
      { state_code: 'MD', state_name: 'Maryland', tax_rate: 0.0600 },
      { state_code: 'MA', state_name: 'Massachusetts', tax_rate: 0.0625 },
      { state_code: 'MI', state_name: 'Michigan', tax_rate: 0.0600 },
      { state_code: 'MN', state_name: 'Minnesota', tax_rate: 0.0688 },
      { state_code: 'MS', state_name: 'Mississippi', tax_rate: 0.0700 },
      { state_code: 'MO', state_name: 'Missouri', tax_rate: 0.0423 },
      { state_code: 'MT', state_name: 'Montana', tax_rate: 0.0000 }, // No state sales tax
      { state_code: 'NE', state_name: 'Nebraska', tax_rate: 0.0550 },
      { state_code: 'NV', state_name: 'Nevada', tax_rate: 0.0685 },
      { state_code: 'NH', state_name: 'New Hampshire', tax_rate: 0.0000 }, // No state sales tax
      { state_code: 'NJ', state_name: 'New Jersey', tax_rate: 0.0663 },
      { state_code: 'NM', state_name: 'New Mexico', tax_rate: 0.0513 },
      { state_code: 'NY', state_name: 'New York', tax_rate: 0.0400 },
      { state_code: 'NC', state_name: 'North Carolina', tax_rate: 0.0475 },
      { state_code: 'ND', state_name: 'North Dakota', tax_rate: 0.0500 },
      { state_code: 'OH', state_name: 'Ohio', tax_rate: 0.0575 },
      { state_code: 'OK', state_name: 'Oklahoma', tax_rate: 0.0450 },
      { state_code: 'OR', state_name: 'Oregon', tax_rate: 0.0000 }, // No state sales tax
      { state_code: 'PA', state_name: 'Pennsylvania', tax_rate: 0.0600 },
      { state_code: 'RI', state_name: 'Rhode Island', tax_rate: 0.0700 },
      { state_code: 'SC', state_name: 'South Carolina', tax_rate: 0.0600 },
      { state_code: 'SD', state_name: 'South Dakota', tax_rate: 0.0450 },
      { state_code: 'TN', state_name: 'Tennessee', tax_rate: 0.0700 },
      { state_code: 'TX', state_name: 'Texas', tax_rate: 0.0625 },
      { state_code: 'UT', state_name: 'Utah', tax_rate: 0.0610 },
      { state_code: 'VT', state_name: 'Vermont', tax_rate: 0.0600 },
      { state_code: 'VA', state_name: 'Virginia', tax_rate: 0.0530 },
      { state_code: 'WA', state_name: 'Washington', tax_rate: 0.0650 },
      { state_code: 'WV', state_name: 'West Virginia', tax_rate: 0.0600 },
      { state_code: 'WI', state_name: 'Wisconsin', tax_rate: 0.0500 },
      { state_code: 'WY', state_name: 'Wyoming', tax_rate: 0.0400 }
    ];

    // Add timestamps and default values
    const now = new Date();
    const taxConfigData = taxRates.map(rate => ({
      ...rate,
      is_active: true,
      effective_date: now,
      notes: 'Base state sales tax rate (2025 estimate)',
      created_at: now,
      updated_at: now
    }));

    await queryInterface.bulkInsert('tax_config', taxConfigData, {});

    console.log(`✅ Seeded tax_config with ${taxRates.length} US state tax rates`);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('tax_config', null, {});
    console.log('✅ Removed all tax config data');
  }
};
