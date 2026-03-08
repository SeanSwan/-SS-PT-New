'use strict';

/**
 * Seed a $1 test package for Stripe payment verification.
 * Admin-only: isActive = false so it doesn't show on the public storefront.
 * Admin can activate it from the Packages tab when ready to test.
 */
module.exports = {
  async up(queryInterface) {
    // Check if test package already exists
    const existing = await queryInterface.sequelize.query(
      `SELECT id FROM storefront_items WHERE name = 'Stripe Test Package ($1)' LIMIT 1`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    ).catch(() => []);

    if (existing.length > 0) {
      console.log('Stripe test package already exists, skipping.');
      return;
    }

    await queryInterface.bulkInsert('storefront_items', [{
      name: 'Stripe Test Package ($1)',
      description: 'Admin-only $1 test package — 1 session. Used to verify Stripe payment flow reaches your bank account. Activate when ready to test, deactivate after.',
      "packageType": 'fixed',
      price: 1.00,
      "pricePerSession": 1.00,
      sessions: 1,
      "totalSessions": 1,
      "totalCost": 1.00,
      "isActive": false,  // Hidden from public storefront by default
      "displayOrder": 999, // Sort to the bottom
      "createdAt": new Date(),
      "updatedAt": new Date(),
    }]);

    console.log('Seeded $1 Stripe test package (inactive by default)');
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('storefront_items', {
      name: 'Stripe Test Package ($1)'
    });
  },
};
