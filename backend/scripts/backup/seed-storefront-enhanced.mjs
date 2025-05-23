// backend/scripts/seed-storefront-enhanced.mjs
import sequelize from '../database.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';

const samplePackages = [
  {
    name: 'Starter Package',
    description: 'Perfect for beginners. Get started with 4 personalized training sessions.',
    packageType: 'fixed',
    sessions: 4,
    pricePerSession: 75.00,
    imageUrl: 'https://via.placeholder.com/400x300?text=Starter+Package',
    theme: 'cosmic',
    isActive: true
  },
  {
    name: 'Monthly Fitness Plan',
    description: 'Consistent progress with 8 sessions per month.',
    packageType: 'monthly',
    months: 1,
    sessionsPerWeek: 2,
    pricePerSession: 65.00,
    imageUrl: 'https://via.placeholder.com/400x300?text=Monthly+Plan',
    theme: 'purple',
    isActive: true
  },
  {
    name: 'Transformation Package',
    description: 'Intensive 12-session program for serious results.',
    packageType: 'fixed',
    sessions: 12,
    pricePerSession: 70.00,
    imageUrl: 'https://via.placeholder.com/400x300?text=Transformation',
    theme: 'ruby',
    isActive: true
  },
  {
    name: 'Elite Monthly',
    description: 'Premium monthly plan with 3 sessions per week.',
    packageType: 'monthly',
    months: 1,
    sessionsPerWeek: 3,
    pricePerSession: 60.00,
    imageUrl: 'https://via.placeholder.com/400x300?text=Elite+Monthly',
    theme: 'emerald',
    isActive: true
  }
];

async function seedStorefrontPackages() {
  try {
    console.log('🌱 Starting storefront package seeding...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Clear existing packages
    await StorefrontItem.destroy({ where: {} });
    console.log('🗑️ Cleared existing packages');
    
    // Create new packages
    console.log('📦 Creating new packages...');
    const createdPackages = await StorefrontItem.bulkCreate(samplePackages);
    
    console.log(`✅ Successfully created ${createdPackages.length} packages`);
    
    // Display created packages
    console.log('\n📋 Created packages:');
    for (const pkg of createdPackages) {
      console.log(`✅ ${pkg.name}: $${pkg.totalCost || pkg.price} (${pkg.sessions || pkg.totalSessions} sessions)`);
    }
    
    return {
      success: true,
      created: createdPackages.length
    };
  } catch (error) {
    console.error('❌ Error seeding packages:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedStorefrontPackages()
    .then(() => console.log('🎉 Seeding completed successfully'))
    .catch(err => {
      console.error('💥 Seeding failed:', err);
      process.exit(1);
    });
}

export default seedStorefrontPackages;