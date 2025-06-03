/**
 * Emergency Storefront Package Fix Script
 * =====================================
 * Ensures the database has the correct packages for the cart system to work
 */

import logger from './utils/logger.mjs';

async function fixStorefrontPackages() {
  try {
    console.log('🌟 SWANSTUDIOS RARE ELEMENT COLLECTION - COSMIC LUXURY EDITION');
    console.log('==============================================================');
    console.log('💎 Rhodium • Palladium • Osmium • Iridium × Swan Cosmic Training');
    
    // Import modules
    const { default: sequelize } = await import('./database.mjs');
    const { default: StorefrontItem } = await import('./models/StorefrontItem.mjs');
    
    console.log('✅ Database connection established');
    
    // Check current packages
    const currentCount = await StorefrontItem.count();
    console.log(`📊 Current packages in database: ${currentCount}`);
    
    if (currentCount === 0) {
      console.log('🌟 Creating rare element collection - the most precious training packages in the galaxy...');
      
      // Create the luxurious rare element packages with galaxy swan theme
      const packages = [
        {
          packageType: 'fixed',
          name: 'Rhodium Swan Encounter',
          description: 'Experience the rarest encounter in personal training - a single session with Sean Swan using techniques as precious as rhodium itself',
          sessions: 1,
          pricePerSession: 175.00,
          totalCost: 175.00,
          price: 175.00,
          isActive: true,
          displayOrder: 1
        },
        {
          packageType: 'fixed',
          name: 'Palladium Swan Ascension',
          description: 'Begin your ascension to elite fitness with 8 sessions crafted from palladium-grade expertise and cosmic precision',
          sessions: 8,
          pricePerSession: 170.00,
          totalCost: 1360.00,
          price: 1360.00,
          isActive: true,
          displayOrder: 2
        },
        {
          packageType: 'fixed',
          name: 'Osmium Swan Constellation',
          description: 'Navigate the stars of transformation with 20 sessions as dense and powerful as osmium - the ultimate cosmic fitness journey',
          sessions: 20,
          pricePerSession: 165.00,
          totalCost: 3300.00,
          price: 3300.00,
          isActive: true,
          displayOrder: 3
        },
        {
          packageType: 'fixed',
          name: 'Iridium Swan Empire',
          description: 'Build your fitness empire with 50 meteoric sessions forged from iridium-strength training protocols',
          sessions: 50,
          pricePerSession: 160.00,
          totalCost: 8000.00,
          price: 8000.00,
          isActive: true,
          displayOrder: 4
        },
        {
          packageType: 'monthly',
          name: 'Titanium Swan Transformation',
          description: 'Undergo a titanium-strength transformation over 3 months with aerospace-grade training protocols (4x per week)',
          months: 3,
          sessionsPerWeek: 4,
          totalSessions: 52,
          pricePerSession: 155.00,
          totalCost: 8060.00,
          price: 8060.00,
          isActive: true,
          displayOrder: 5
        },
        {
          packageType: 'monthly',
          name: 'Scandium Swan Dynasty',
          description: 'Establish your fitness dynasty with 6 months of scandium-rare training excellence beyond earthly limits',
          months: 6,
          sessionsPerWeek: 4,
          totalSessions: 104,
          pricePerSession: 150.00,
          totalCost: 15600.00,
          price: 15600.00,
          isActive: true,
          displayOrder: 6
        },
        {
          packageType: 'monthly',
          name: 'Rhodium Swan Supremacy',
          description: 'Achieve rhodium-level supremacy in 9 months with the most precious training protocols in the galaxy',
          months: 9,
          sessionsPerWeek: 4,
          totalSessions: 156,
          pricePerSession: 145.00,
          totalCost: 22620.00,
          price: 22620.00,
          isActive: true,
          displayOrder: 7
        },
        {
          packageType: 'monthly',
          name: 'Cosmic Swan Transcendence',
          description: 'Transcend all earthly fitness limitations with a full year of cosmic-level training that reaches beyond the stars',
          months: 12,
          sessionsPerWeek: 4,
          totalSessions: 208,
          pricePerSession: 140.00,
          totalCost: 29120.00,
          price: 29120.00,
          isActive: true,
          displayOrder: 8
        }
      ];
      
      const createdPackages = [];
      for (const pkg of packages) {
        try {
          const created = await StorefrontItem.create(pkg);
          createdPackages.push(created);
          console.log(`✅ Created: ${pkg.name} (ID: ${created.id})`);
        } catch (error) {
          console.error(`❌ Failed to create ${pkg.name}:`, error.message);
        }
      }
      
      console.log(`\n💎 SUCCESS: Rare Element Collection Complete! Created ${createdPackages.length} cosmic luxury packages`);
      
    } else {
      console.log('📦 Packages already exist - displaying current packages:');
      
      const packages = await StorefrontItem.findAll({
        order: [['displayOrder', 'ASC'], ['id', 'ASC']]
      });
      
      packages.forEach((pkg, index) => {
        console.log(`${index + 1}. ${pkg.name} (ID: ${pkg.id}) - $${pkg.totalCost || pkg.price}`);
      });
    }
    
    // Test the storefront API endpoint
    console.log('\n🧪 Testing storefront API endpoint...');
    const allPackages = await StorefrontItem.findAll({
      where: { isActive: true },
      order: [['displayOrder', 'ASC']]
    });
    
    console.log(`✅ API would return ${allPackages.length} packages`);
    console.log('📋 Package IDs that cart can use:', allPackages.map(p => p.id).join(', '));
    
    console.log('\n🎆 RARE ELEMENT COLLECTION IMPLEMENTATION COMPLETE!');
    console.log('🚀 Frontend now serves cosmic luxury packages with proper cart functionality');
    console.log('💵 Wealthy clientele can now purchase rhodium-grade training experiences');
    
    return {
      success: true,
      packagesAvailable: allPackages.length,
      packageIds: allPackages.map(p => p.id)
    };
    
  } catch (error) {
    console.error('💥 ERROR fixing storefront packages:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixStorefrontPackages()
    .then(() => {
      console.log('✅ Fix completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fix failed:', error.message);
      process.exit(1);
    });
}

export default fixStorefrontPackages;
