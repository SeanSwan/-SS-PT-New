'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, check if packages already exist to avoid duplicates
    const existingPackages = await queryInterface.sequelize.query(
      'SELECT id FROM "storefront_items" LIMIT 1;'
    );
    
    if (existingPackages[0].length > 0) {
      console.log('Packages already exist, skipping seeding...');
      return;
    }

    // Your original packages data
    const fixedPackages = [
      {
        packageType: 'fixed',
        name: 'Gold Glimmer',
        description: 'An introductory 8-session package to ignite your transformation.',
        pricePerSession: 175,
        sessions: 8,
        months: null,
        sessionsPerWeek: null,
        totalSessions: 8,
        totalCost: 1400,
        price: 1400,
        displayPrice: 1400,
        theme: 'cosmic',
        isActive: true,
        stripeProductId: null,
        stripePriceId: null,
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        packageType: 'fixed',
        name: 'Platinum Pulse',
        description: 'Elevate your performance with 20 dynamic sessions.',
        pricePerSession: 165,
        sessions: 20,
        months: null,
        sessionsPerWeek: null,
        totalSessions: 20,
        totalCost: 3300,
        price: 3300,
        displayPrice: 3300,
        theme: 'purple',
        isActive: true,
        stripeProductId: null,
        stripePriceId: null,
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        packageType: 'fixed',
        name: 'Rhodium Rise',
        description: 'Unleash your inner champion with 50 premium sessions.',
        pricePerSession: 150,
        sessions: 50,
        months: null,
        sessionsPerWeek: null,
        totalSessions: 50,
        totalCost: 7500,
        price: 7500,
        displayPrice: 7500,
        theme: 'emerald',
        isActive: true,
        stripeProductId: null,
        stripePriceId: null,
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const monthlyPackages = [
      {
        packageType: 'monthly',
        name: 'Silver Storm',
        description: 'High intensity 3-month program at 4 sessions per week.',
        pricePerSession: 155,
        sessions: null,
        months: 3,
        sessionsPerWeek: 4,
        totalSessions: 48,
        totalCost: 7440,
        price: 7440,
        displayPrice: 7440,
        theme: 'cosmic',
        isActive: true,
        stripeProductId: null,
        stripePriceId: null,
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        packageType: 'monthly',
        name: 'Gold Grandeur',
        description: 'Maximize your potential with 6 months at 4 sessions per week.',
        pricePerSession: 145,
        sessions: null,
        months: 6,
        sessionsPerWeek: 4,
        totalSessions: 96,
        totalCost: 13920,
        price: 13920,
        displayPrice: 13920,
        theme: 'purple',
        isActive: true,
        stripeProductId: null,
        stripePriceId: null,
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        packageType: 'monthly',
        name: 'Platinum Prestige',
        description: 'The best value – 9 months at 4 sessions per week.',
        pricePerSession: 140,
        sessions: null,
        months: 9,
        sessionsPerWeek: 4,
        totalSessions: 144,
        totalCost: 20160,
        price: 20160,
        displayPrice: 20160,
        theme: 'ruby',
        isActive: true,
        stripeProductId: null,
        stripePriceId: null,
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        packageType: 'monthly',
        name: 'Rhodium Reign',
        description: 'The ultimate value – 12 months at 4 sessions per week at an unbeatable rate.',
        pricePerSession: 140,
        sessions: null,
        months: 12,
        sessionsPerWeek: 4,
        totalSessions: 192,
        totalCost: 26880,
        price: 26880,
        displayPrice: 26880,
        theme: 'emerald',
        isActive: true,
        stripeProductId: null,
        stripePriceId: null,
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Insert all packages
    const allPackages = [...fixedPackages, ...monthlyPackages];
    
    await queryInterface.bulkInsert('storefront_items', allPackages);
    
    console.log('✅ Successfully seeded storefront packages!');
    console.log(`   - ${fixedPackages.length} fixed packages`);
    console.log(`   - ${monthlyPackages.length} monthly packages`);
  },

  async down(queryInterface, Sequelize) {
    // Remove seeded packages by name
    const packageNames = [
      'Gold Glimmer', 'Platinum Pulse', 'Rhodium Rise',
      'Silver Storm', 'Gold Grandeur', 'Platinum Prestige', 'Rhodium Reign'
    ];
    
    await queryInterface.bulkDelete('storefront_items', {
      name: packageNames
    });
    
    console.log('✅ Successfully removed seeded packages');
  }
};
