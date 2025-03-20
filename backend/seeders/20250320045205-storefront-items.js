'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, check if there are any existing items
    const items = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM storefront_items',
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    if (items[0].count > 0) {
      console.log('Storefront items already exist. Skipping seed.');
      return;
    }

    // Fixed packages
    const fixedPackages = [
      {
        packageType: 'fixed',
        sessions: 8,
        pricePerSession: 175,
        totalCost: 1400,
        name: "Gold Glimmer",
        description: "An introductory 8-session package to ignite your transformation.",
        theme: "cosmic",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        packageType: 'fixed',
        sessions: 20,
        pricePerSession: 165,
        totalCost: 3300,
        name: "Platinum Pulse",
        description: "Elevate your performance with 20 dynamic sessions.",
        theme: "purple",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        packageType: 'fixed',
        sessions: 50,
        pricePerSession: 150,
        totalCost: 7500,
        name: "Rhodium Rise",
        description: "Unleash your inner champion with 50 premium sessions.",
        theme: "emerald",
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ];

    // Monthly packages
    const monthlyPackages = [
      { 
        packageType: 'monthly',
        months: 3, 
        sessionsPerWeek: 4, 
        pricePerSession: 155,
        totalSessions: 48,
        totalCost: 7440,
        name: 'Silver Storm', 
        description: 'High intensity 3-month program at 4 sessions per week.',
        theme: "cosmic",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        packageType: 'monthly',
        months: 6, 
        sessionsPerWeek: 4, 
        pricePerSession: 145,
        totalSessions: 96,
        totalCost: 13920,
        name: 'Gold Grandeur', 
        description: 'Maximize your potential with 6 months at 4 sessions per week.',
        theme: "purple",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        packageType: 'monthly',
        months: 9, 
        sessionsPerWeek: 4, 
        pricePerSession: 140,
        totalSessions: 144,
        totalCost: 20160,
        name: 'Platinum Prestige', 
        description: 'The best value – 9 months at 4 sessions per week.',
        theme: "ruby",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        packageType: 'monthly',
        months: 12, 
        sessionsPerWeek: 4, 
        pricePerSession: 135,
        totalSessions: 192,
        totalCost: 25920,
        name: 'Rhodium Reign', 
        description: 'The ultimate value – 12 months at 4 sessions per week at an unbeatable rate.',
        theme: "emerald",
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ];

    // Combine and create all packages
    const allPackages = [...fixedPackages, ...monthlyPackages];
    await queryInterface.bulkInsert('storefront_items', allPackages);
    
    console.log(`Successfully seeded ${allPackages.length} storefront items.`);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('storefront_items', null, {});
  }
};