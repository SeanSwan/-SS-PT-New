// Emergency Production Pricing Fix
// This will ensure all packages have correct pricing in the database

import dotenv from 'dotenv';
import sequelize from './backend/database.mjs';
import StorefrontItem from './backend/models/StorefrontItem.mjs';
import setupAssociations from './backend/setupAssociations.mjs';

dotenv.config();

const fixProductionPricing = async () => {
  try {
    console.log('🚨 EMERGENCY PRODUCTION PRICING FIX');
    console.log('===================================');
    
    // Setup associations
    await setupAssociations();
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Define luxury packages with correct pricing
    const luxuryPackages = [
      {
        name: 'Silver Swan Wing',
        packageType: 'fixed',
        sessions: 1,
        pricePerSession: 175.00,
        price: 175.00,
        totalCost: 175.00,
        description: 'Single premium personal training session',
        imageUrl: '/images/packages/silver-swan-wing.jpg',
        isActive: true,
        displayOrder: 1
      },
      {
        name: 'Golden Swan Flight',
        packageType: 'fixed',
        sessions: 8,
        pricePerSession: 170.00,
        price: 1360.00,
        totalCost: 1360.00,
        description: '8 sessions of elite personal training',
        imageUrl: '/images/packages/golden-swan-flight.jpg',
        isActive: true,
        displayOrder: 2
      },
      {
        name: 'Sapphire Swan Soar',
        packageType: 'fixed',
        sessions: 20,
        pricePerSession: 165.00,
        price: 3300.00,
        totalCost: 3300.00,
        description: '20 sessions of premium fitness transformation',
        imageUrl: '/images/packages/sapphire-swan-soar.jpg',
        isActive: true,
        displayOrder: 3
      },
      {
        name: 'Platinum Swan Grace',
        packageType: 'fixed',
        sessions: 50,
        pricePerSession: 160.00,
        price: 8000.00,
        totalCost: 8000.00,
        description: '50 sessions of ultimate wellness mastery',
        imageUrl: '/images/packages/platinum-swan-grace.jpg',
        isActive: true,
        displayOrder: 4
      },
      {
        name: 'Emerald Swan Evolution',
        packageType: 'monthly',
        months: 3,
        sessionsPerWeek: 2,
        totalSessions: 24,
        pricePerSession: 155.00,
        price: 3720.00,
        totalCost: 3720.00,
        description: '3-month evolutionary fitness journey',
        imageUrl: '/images/packages/emerald-swan-evolution.jpg',
        isActive: true,
        displayOrder: 5
      },
      {
        name: 'Diamond Swan Dynasty',
        packageType: 'monthly',
        months: 6,
        sessionsPerWeek: 3,
        totalSessions: 72,
        pricePerSession: 150.00,
        price: 10800.00,
        totalCost: 10800.00,
        description: '6-month comprehensive wellness dynasty',
        imageUrl: '/images/packages/diamond-swan-dynasty.jpg',
        isActive: true,
        displayOrder: 6
      },
      {
        name: 'Ruby Swan Reign',
        packageType: 'monthly',
        months: 12,
        sessionsPerWeek: 2,
        totalSessions: 96,
        pricePerSession: 145.00,
        price: 13920.00,
        totalCost: 13920.00,
        description: 'Year-long supreme fitness reign',
        imageUrl: '/images/packages/ruby-swan-reign.jpg',
        isActive: true,
        displayOrder: 7
      },
      {
        name: 'Rhodium Swan Royalty',
        packageType: 'monthly',
        months: 24,
        sessionsPerWeek: 3,
        totalSessions: 288,
        pricePerSession: 140.00,
        price: 40320.00,
        totalCost: 40320.00,
        description: 'Ultimate 2-year wellness royalty transformation',
        imageUrl: '/images/packages/rhodium-swan-royalty.jpg',
        isActive: true,
        displayOrder: 8
      }
    ];
    
    console.log(`\\n🔧 Updating ${luxuryPackages.length} luxury packages...`);
    
    for (const packageData of luxuryPackages) {
      try {
        const [item, created] = await StorefrontItem.findOrCreate({
          where: { name: packageData.name },
          defaults: packageData
        });
        
        if (!created) {
          // Update existing item with correct pricing
          await item.update(packageData);
          console.log(`✅ Updated: ${packageData.name} - $${packageData.price}`);
        } else {
          console.log(`🆕 Created: ${packageData.name} - $${packageData.price}`);
        }
      } catch (error) {
        console.error(`❌ Error with ${packageData.name}:`, error.message);
      }
    }
    
    // Verify the fix
    console.log('\\n🔍 VERIFICATION:');
    console.log('=================');
    
    const allPackages = await StorefrontItem.findAll({
      attributes: ['id', 'name', 'price', 'totalCost'],
      order: [['displayOrder', 'ASC']]
    });
    
    let allGood = true;
    allPackages.forEach(pkg => {
      const price = parseFloat(pkg.price || 0);
      const totalCost = parseFloat(pkg.totalCost || 0);
      
      if (price === 0 && totalCost === 0) {
        console.log(`❌ ${pkg.name}: Still $0`);
        allGood = false;
      } else {
        console.log(`✅ ${pkg.name}: $${price || totalCost}`);
      }
    });
    
    if (allGood) {
      console.log('\\n🎉 SUCCESS: All packages have correct pricing!');
      console.log('\\n🚀 NEXT STEPS:');
      console.log('1. Restart backend: EMERGENCY-RESTART-BACKEND.bat');
      console.log('2. Hard refresh browser (Ctrl+F5)');
      console.log('3. Test cart functionality');
    } else {
      console.log('\\n❌ Some packages still have $0 pricing');
      console.log('   Check database constraints and model validation');
    }
    
  } catch (error) {
    console.error('💥 Error fixing pricing:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
};

fixProductionPricing();
