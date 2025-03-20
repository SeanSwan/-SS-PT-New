'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, check the table structure to see what columns exist
    const tableInfo = await queryInterface.sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'storefront_items'",
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    // Create array of column names for easy checking
    const columnNames = tableInfo.map(col => col.column_name || col.COLUMN_NAME);
    console.log("Available columns:", columnNames);
    
    // Check if 'theme' column exists
    const hasThemeColumn = columnNames.includes('theme');
    
    // First, check if there are any existing items
    const items = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM storefront_items',
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    // Fixed packages with EXPLICIT IDs matching frontend
    const fixedPackages = [
      {
        id: 1, // Explicit ID
        packageType: 'fixed',
        sessions: 8,
        pricePerSession: 175,
        totalCost: 1400,
        price: 1400, // Add price field
        name: "Gold Glimmer",
        description: "An introductory 8-session package to ignite your transformation.",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2, // Explicit ID
        packageType: 'fixed',
        sessions: 20,
        pricePerSession: 165,
        totalCost: 3300,
        price: 3300, // Add price field
        name: "Platinum Pulse",
        description: "Elevate your performance with 20 dynamic sessions.",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 3, // Explicit ID
        packageType: 'fixed',
        sessions: 50,
        pricePerSession: 150,
        totalCost: 7500,
        price: 7500, // Add price field
        name: "Rhodium Rise",
        description: "Unleash your inner champion with 50 premium sessions.",
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ];

    // Monthly packages with EXPLICIT IDs matching frontend
    const monthlyPackages = [
      { 
        id: 4, // Explicit ID
        packageType: 'monthly',
        months: 3, 
        sessionsPerWeek: 4, 
        pricePerSession: 155,
        totalSessions: 48,
        totalCost: 7440,
        price: 7440, // Add price field
        name: 'Silver Storm', 
        description: 'High intensity 3-month program at 4 sessions per week.',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        id: 6, // Explicit ID
        packageType: 'monthly',
        months: 6, 
        sessionsPerWeek: 4, 
        pricePerSession: 145,
        totalSessions: 96,
        totalCost: 13920,
        price: 13920, // Add price field
        name: 'Gold Grandeur', 
        description: 'Maximize your potential with 6 months at 4 sessions per week.',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        id: 9, // Explicit ID
        packageType: 'monthly',
        months: 9, 
        sessionsPerWeek: 4, 
        pricePerSession: 140,
        totalSessions: 144,
        totalCost: 20160,
        price: 20160, // Add price field
        name: 'Platinum Prestige', 
        description: 'The best value – 9 months at 4 sessions per week.',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        id: 12, // Explicit ID
        packageType: 'monthly',
        months: 12, 
        sessionsPerWeek: 4, 
        pricePerSession: 135,
        totalSessions: 192,
        totalCost: 25920,
        price: 25920, // Add price field
        name: 'Rhodium Reign', 
        description: 'The ultimate value – 12 months at 4 sessions per week at an unbeatable rate.',
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ];

    // Add theme field if the column exists
    if (hasThemeColumn) {
      fixedPackages[0].theme = 'cosmic';
      fixedPackages[1].theme = 'purple';
      fixedPackages[2].theme = 'emerald';
      
      monthlyPackages[0].theme = 'cosmic';
      monthlyPackages[1].theme = 'purple';
      monthlyPackages[2].theme = 'ruby';
      monthlyPackages[3].theme = 'emerald';
    }

    // Combine all packages
    const allPackages = [...fixedPackages, ...monthlyPackages];

    // For each package, either insert it if missing or update it if it exists
    for (const pkg of allPackages) {
      try {
        const existingItem = await queryInterface.sequelize.query(
          `SELECT id FROM storefront_items WHERE id = ${pkg.id}`,
          { type: Sequelize.QueryTypes.SELECT }
        );
        
        if (existingItem.length === 0) {
          // Insert new item
          await queryInterface.bulkInsert('storefront_items', [pkg]);
          console.log(`Created storefront item #${pkg.id}: ${pkg.name}`);
        } else {
          // Update existing item - we need to be careful with the columns we update
          const { id, ...updateData } = pkg;
          await queryInterface.bulkUpdate('storefront_items', updateData, { id });
          console.log(`Updated storefront item #${pkg.id}: ${pkg.name}`);
        }
      } catch (error) {
        console.error(`Error processing item #${pkg.id}:`, error.message);
      }
    }
    
    console.log(`Successfully processed storefront items.`);
  },

  down: async (queryInterface, Sequelize) => {
    // Only delete the specific IDs we added
    await queryInterface.bulkDelete('storefront_items', {
      id: [1, 2, 3, 4, 6, 9, 12]
    }, {});
  }
};